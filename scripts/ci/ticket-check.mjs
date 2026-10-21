import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ticketPattern = /^CGN-[1-9][0-9]*$/;
const branchPattern = /^(CGN-[1-9][0-9]*)-[a-z0-9][a-z0-9-]*$/;
const safePathPattern = /^[A-Za-z0-9_./-]+$/;
const formattedExtension = /\.(?:[cm]?js|tsx?|json|md|ya?ml)$/;
const lintExtension = /\.[cm]?js$/;
const criticalPrefixes = [
  "scripts/ci/",
  "config/",
  "infra/",
  ".github/",
  "packages/contracts/",
];
const criticalFiles = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "AGENTS.md",
]);

export function parseArgs(args) {
  let ticket = "";
  let jiraLive = false;
  let docker = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--ticket") {
      ticket = args[++i] ?? "";
    } else if (args[i] === "--jira-live") {
      jiraLive = true;
    } else if (args[i] === "--docker") {
      docker = true;
    } else {
      throw new Error("Unknown argument: " + args[i]);
    }
  }
  if (!ticketPattern.test(ticket)) {
    throw new Error(
      "Usage: pnpm ticket:check --ticket CGN-NNN [--jira-live] [--docker]",
    );
  }
  return { ticket, jiraLive, docker };
}

export function validateBranch(branch, ticket) {
  const match = branchPattern.exec(branch);
  if (!match || match[1] !== ticket) {
    throw new Error(
      "Use the matching isolated " +
        ticket +
        "-description branch, not " +
        branch,
    );
  }
}

export function buildPlan(files, packageScripts = {}) {
  if (files.length === 0) {
    throw new Error(
      "No committed changes versus merge-base. Commit ticket files before pre-push check.",
    );
  }
  const sorted = [...new Set(files)].sort();
  for (const file of sorted) {
    if (
      !safePathPattern.test(file) ||
      file.includes("..") ||
      file.startsWith("/")
    ) {
      throw new Error(
        "Unsafe or unsupported changed path; use full CI and inspect manually: " +
          file,
      );
    }
  }

  const full = sorted.some(
    (file) =>
      criticalFiles.has(file) ||
      criticalPrefixes.some((prefix) => file.startsWith(prefix)),
  );
  const packages = [
    ...new Set(
      sorted
        .filter((file) => /^(?:apps|services|packages)\/[^/]+\//.test(file))
        .map((file) => file.split("/").slice(0, 2).join("/")),
    ),
  ].sort();
  const commands = [
    {
      label: "branch",
      command: "node",
      args: ["scripts/ci/verify-branch.mjs"],
    },
    { label: "memory", command: "pnpm", args: ["memory:check"] },
    {
      label: "handoff",
      command: "node",
      args: ["scripts/ci/verify-agent-handoff.mjs"],
    },
    {
      label: "platform-scope",
      command: "node",
      args: ["scripts/ci/verify-platform-scope.mjs"],
    },
    { label: "boundaries", command: "pnpm", args: ["ci:boundaries"] },
  ];

  if (full || packages.some((p) => !packageScripts[p])) {
    commands.push({
      label: "full-quality",
      command: "pnpm",
      args: ["ci:quick"],
    });
  } else {
    const formattable = sorted.filter((p) => formattedExtension.test(p));
    if (formattable.length) {
      commands.push({
        label: "format",
        command: "pnpm",
        args: ["dlx", "prettier@3.6.2", "--check", ...formattable],
      });
    }
    const lintable = sorted.filter(
      (p) => lintExtension.test(p) && !p.startsWith("docs/"),
    );
    if (lintable.length) {
      commands.push({
        label: "lint",
        command: "pnpm",
        args: ["dlx", "eslint@9.39.1", ...lintable],
      });
    }
    for (const path of packages) {
      const scripts = packageScripts[path];
      // Missing scripts are not silently interpreted as a passing test suite.
      for (const task of [
        "build",
        "typecheck",
        "test:unit",
        "test:integration",
        "test:contracts",
      ]) {
        if (Object.hasOwn(scripts, task)) {
          commands.push({
            label: path + ":" + task,
            command: "pnpm",
            args: ["--filter", "./" + path, "run", task],
          });
        }
      }
      if (!Object.keys(scripts).some((task) => /^test:/.test(task))) {
        commands.push({
          label: "full-quality-" + path,
          command: "pnpm",
          args: ["ci:quick"],
        });
        break;
      }
    }
  }

  const dockerServices = [
    ...new Set(
      sorted
        .filter((p) => p.startsWith("services/"))
        .map((p) => p.split("/")[1]),
    ),
  ].filter((name) => packageScripts["services/" + name]?.["test:docker"]);
  return {
    files: sorted,
    mode: commands.some((c) => c.label.startsWith("full-quality"))
      ? "full"
      : "scoped",
    commands,
    dockerServices,
    fullCIRemainsRequired: true,
  };
}

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function pnpmExecutable() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function execute(command, args, cwd, env) {
  const executable = command === "pnpm" ? pnpmExecutable() : command;
  const result = spawnSync(executable, args, {
    cwd,
    env,
    stdio: "inherit",
    shell: process.platform === "win32" && command === "pnpm",
    timeout: 10 * 60 * 1000,
  });
  if (result.error) {
    throw new Error(command + " could not execute: " + result.error.message);
  }
  if (result.status !== 0) {
    throw new Error(command + " check exited with status " + result.status);
  }
}

function record(root, ticket, branch, baseline, stages, status, mode) {
  const directory = join(root, ".cgn", "ticket-metrics");
  mkdirSync(directory, { recursive: true });
  const filename = join(
    directory,
    ticket + "-" + Date.now() + "-" + process.pid + ".json",
  );
  writeFileSync(
    filename,
    JSON.stringify(
      {
        schemaVersion: 1,
        ticket,
        branch,
        baseline,
        status,
        localCheckMode: mode,
        measuredAt: new Date().toISOString(),
        stages,
        note: "Only local pre-push execution times. Does not measure Codex coding, CI, review or Jira completion.",
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log("Local timing report: " + filename);
}

export async function main(args = process.argv.slice(2), cwd = process.cwd()) {
  const options = parseArgs(args);
  const root = git(["rev-parse", "--show-toplevel"], cwd);
  const branch = git(["branch", "--show-current"], root);
  validateBranch(branch, options.ticket);
  if (git(["status", "--porcelain"], root)) {
    throw new Error(
      "Working tree is not clean. Commit only scoped ticket files before pre-push validation.",
    );
  }
  const remote = git(["remote", "get-url", "origin"], root);
  if (
    !/^(https:\/\/github\.com\/Sandeepagrahari78\/career-growth-network(?:\.git)?|git@github\.com:Sandeepagrahari78\/career-growth-network\.git|ssh:\/\/git@github\.com\/Sandeepagrahari78\/career-growth-network\.git)$/.test(
      remote,
    )
  ) {
    throw new Error(
      "Unexpected origin repository. Refusing to validate unrelated code.",
    );
  }
  const mainRef = git(
    ["rev-parse", "--verify", "refs/remotes/origin/main"],
    root,
  );
  const base = git(["merge-base", "HEAD", "origin/main"], root);
  if (!/^[a-f0-9]{40}$/.test(base) || !/^[a-f0-9]{40}$/.test(mainRef)) {
    throw new Error(
      "Missing valid origin/main baseline; git fetch origin main.",
    );
  }
  const changed = git(["diff", "--name-only", base + "...HEAD"], root)
    .split(/\r?\n/)
    .filter(Boolean);
  const packages = {};
  for (const file of changed) {
    const match = /^(apps|services|packages)\/([^/]+)\//.exec(file);
    if (!match) continue;
    const folder = match[1] + "/" + match[2];
    const manifest = join(root, folder, "package.json");
    if (!existsSync(manifest)) continue;
    packages[folder] = JSON.parse(readFileSync(manifest, "utf8")).scripts ?? {};
  }
  const plan = buildPlan(changed, packages);
  const env = {
    ...process.env,
    CGN_BASE_SHA: base,
    GITHUB_HEAD_REF: branch,
    CI: "true",
  };
  const stages = [];
  let result = "failed";
  console.log("Ticket: " + options.ticket + " | base: " + base.slice(0, 12));
  console.log("Mode: " + plan.mode + " | changed files: " + plan.files.length);
  console.log("Full PR CI, security, Main CI and staging remain mandatory.");
  try {
    if (options.jiraLive) {
      const begin = Date.now();
      execute(
        "node",
        [
          "scripts/agent-context.mjs",
          "--ticket",
          options.ticket,
          "--domain",
          "cicd",
          "--jira-live",
        ],
        root,
        env,
      );
      stages.push({
        name: "live-jira-context",
        milliseconds: Date.now() - begin,
        outcome: "passed",
      });
    } else {
      console.log(
        "Live Jira not verified by this command. Agent must check status, owner and blockers with Jira MCP before coding.",
      );
    }
    for (const step of plan.commands) {
      const begin = Date.now();
      console.log("Checking " + step.label + "...");
      try {
        execute(step.command, step.args, root, env);
        stages.push({
          name: step.label,
          milliseconds: Date.now() - begin,
          outcome: "passed",
        });
      } catch (error) {
        stages.push({
          name: step.label,
          milliseconds: Date.now() - begin,
          outcome: "failed",
        });
        throw error;
      }
    }
    if (options.docker && plan.dockerServices.length) {
      const available = spawnSync("docker", ["info"], {
        cwd: root,
        stdio: "ignore",
        timeout: 10000,
      });
      if (available.status !== 0) {
        throw new Error(
          "Docker requested but daemon is unavailable. Start Docker Desktop or use required GitHub Docker CI.",
        );
      }
      for (const name of plan.dockerServices) {
        const begin = Date.now();
        try {
          execute(
            "pnpm",
            ["--filter", "./services/" + name, "run", "test:docker"],
            root,
            env,
          );
          stages.push({
            name: "docker:" + name,
            milliseconds: Date.now() - begin,
            outcome: "passed",
          });
        } catch (error) {
          stages.push({
            name: "docker:" + name,
            milliseconds: Date.now() - begin,
            outcome: "failed",
          });
          console.error(
            "Docker smoke failed for " +
              name +
              ". Inspect container logs, port mapping, readiness and exit code; do not skip its PR CI gate.",
          );
          throw error;
        }
      }
    } else if (plan.dockerServices.length) {
      console.log(
        "Optional changed-service Docker preflight: --docker (required GitHub Docker CI still enforced).",
      );
    }
    result = "passed-local-only";
    console.log(
      "Ticket local checks passed. This is NOT merge or Jira Done approval.",
    );
  } finally {
    record(root, options.ticket, branch, base, stages, result, plan.mode);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error("CGN ticket check failed: " + error.message);
    process.exitCode = 1;
  });
}
