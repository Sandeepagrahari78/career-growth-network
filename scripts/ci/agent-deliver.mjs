import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve, win32 } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = "Sandeepagrahari78/career-growth-network";
const JIRA_MCP = "https://mcp.atlassian.com/v2/mcp";

export function parseArgs(args) {
  if (args.length === 1 && args[0] === "--check") {
    return { check: true };
  }
  if (
    args.length < 1 ||
    args.length > 2 ||
    (args[1] && args[1] !== "--resume")
  ) {
    throw new Error(
      "Usage: node scripts/ci/agent-deliver.mjs --check | CGN-NNN [--resume]",
    );
  }
  if (!/^CGN-[1-9][0-9]*$/.test(args[0])) {
    throw new Error("Provide one exact Jira task key, for example CGN-35");
  }
  return { ticket: args[0], resume: args[1] === "--resume" };
}

export function validRemote(remote) {
  return [
    `https://github.com/${REPO}`,
    `https://github.com/${REPO}.git`,
    `git@github.com:${REPO}.git`,
    `ssh://git@github.com/${REPO}.git`,
  ].includes(remote.trim());
}

export function hasJiraMcp(entries) {
  return (
    Array.isArray(entries) &&
    entries.some(
      (entry) =>
        entry.enabled !== false &&
        (entry.transport?.url ?? entry.url)?.replace(/\/$/, "") === JIRA_MCP,
    )
  );
}

export function promptFor(ticket, resume) {
  if (!/^CGN-[1-9][0-9]*$/.test(ticket)) {
    throw new Error("Invalid ticket");
  }
  return `Deliver ${ticket} in this isolated worktree. ${resume ? "Resume existing work; inspect git and live PR first. Do not restart completed stages." : "Start from this fresh origin/main worktree."}
Read AGENTS.md, live Jira scope/owner/blocked-by links, current contracts, relevant handoffs and docs/engineering-memory before edits. Use the authenticated Atlassian MCP and GitHub CLI. Confirm Jira access with a read, not merely a configured server.
If this is an Epic, list its eligible child tasks and stop with a concrete scope blocker; never implement the entire Epic by guessing. If Jira is Done, verify evidence and stop without duplicate implementation.
For UI work inspect docs/design/CGN_V2_FINAL_SIX_APPROVED_UI.md, packages/contracts/ui/cgn-v2-six-screen.v1.json, the actual approved PNGs, reviewed Figma refs and platform scope registry. Five primary tabs are Home, Explore, Journey, Chats, Profile. Images do not authorize invented APIs. Report any conflicting old Jira navigation or missing approved contract before coding.
Write an exact-file plan and measurable acceptance tests. Missing task scope, dependency or approval is a BLOCKED result, not a request for routine permission. Update Jira In Progress only once readiness is established. Record the actual blocker in Jira when blocked.
Implement authorized scope; run relevant tests and ticket acceptance. Preserve unrelated work and never stage .local/, .cgn/ caches or credentials. Update docs/handoffs/${ticket}.md. Review your diff, commit ticket files, push the feature branch and create/update one PR against main with ${ticket} in its title. Do not stop after local tests. Use structured tools or --body-file for multiline text.
Inspect Linux PR CI and fix failures caused by this change, up to three repair attempts. Avoid repeating successful expensive checks without a concrete reason. Report unrelated failures distinctly. Request Jira In Review when a ready PR exists.
Inspect actual code changes for bugs and acceptance gaps; record concrete review findings. Do not treat green CI as a human review. Follow the ticket's and repository's required review/merge policy. Do not invent human acceptance or post CGN-ACCEPTED. If human review is still required, return REVIEW_REQUIRED with the ready PR and exact remaining decision; do not ask the user to perform routine commit/push/status steps.
If merge has already been explicitly authorized and required review is recorded, verify exact head SHA and current CI before merging through PR; never bypass rules, force-push main or deploy production. After merge verify Main CI and all ticket-required staging acceptance for the merged candidate before changing Jira to Done. Update merged-state memory through a PR as required. On failure leave Jira unfinished with evidence.
Return one clear status: BLOCKED, REVIEW_REQUIRED, CI_FAILED or DONE, plus ticket, branch, PR link, tested SHA/run links, staging evidence and remaining action. CLI success alone is not DONE. Respect quota, credential and automatic-approval rejections; report them without bypassing controls. No paid services or API billing setup. No changes to other tickets' implementation scope.`;
}

export function codexInvocation(
  platform = process.platform,
  searchPath = process.env.PATH ?? "",
  exists = existsSync,
) {
  if (platform !== "win32") {
    return { executable: "codex", prefix: [] };
  }
  for (const entry of searchPath.split(";").filter(Boolean)) {
    const directory = entry.replace(/^"|"$/g, "");
    if (!win32.isAbsolute(directory)) {
      continue;
    }
    const native = win32.join(directory, "codex.exe");
    if (exists(native)) {
      return { executable: native, prefix: [] };
    }
    // npm's global JS entry can be invoked with Node directly, avoiding cmd.exe.
    const script = win32.join(
      directory,
      "node_modules",
      "@openai",
      "codex",
      "bin",
      "codex.js",
    );
    if (exists(script)) {
      return { executable: process.execPath, prefix: [script] };
    }
  }
  throw new Error(
    "No shell-free Codex executable found on PATH. Install official @openai/codex or codex.exe and reopen the terminal.",
  );
}

function command(program, args, cwd, timeout = 30000) {
  const invocation =
    program === "codex"
      ? codexInvocation()
      : { executable: program, prefix: [] };
  try {
    return execFileSync(
      invocation.executable,
      [...invocation.prefix, ...args],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout,
        shell: false,
        maxBuffer: 4 * 1024 * 1024,
      },
    ).trim();
  } catch {
    throw new Error(
      `${program} ${args.slice(0, 2).join(" ")} failed. Check installation/login/connectivity; credentials and raw output were not logged.`,
    );
  }
}

export function doctor(cwd, runCommand = command) {
  const root = runCommand("git", ["rev-parse", "--show-toplevel"], cwd);
  if (!validRemote(runCommand("git", ["remote", "get-url", "origin"], root))) {
    throw new Error(`origin must identify ${REPO}; no repository changes made`);
  }
  runCommand("gh", ["auth", "status", "--hostname", "github.com"], root);
  runCommand("gh", ["repo", "view", REPO, "--json", "nameWithOwner"], root);
  runCommand("codex", ["login", "status"], root);
  const help = runCommand("codex", ["exec", "--help"], root);
  if (
    !help.includes("--approve-for-me") ||
    !help.includes("--output-last-message")
  ) {
    throw new Error(
      "Installed Codex CLI lacks required flags. Update it; sandbox bypass is not a fallback.",
    );
  }
  let servers;
  try {
    servers = JSON.parse(runCommand("codex", ["mcp", "list", "--json"], root));
  } catch {
    throw new Error(
      "Could not inspect Codex MCP configuration; run codex mcp list locally",
    );
  }
  if (!hasJiraMcp(servers)) {
    throw new Error(
      "Atlassian MCP is not configured/enabled. Follow single-ticket-agent-setup.md; ChatGPT's connector is separate.",
    );
  }
  return root;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = doctor(process.cwd());
  console.log(
    "PASS: repository identity, GitHub access, Codex login and required CLI flags. Jira MCP configured; its live OAuth access is checked by the agent.",
  );
  if (options.check) {
    return;
  }
  const ticket = options.ticket;
  const directory = join(root, ".local", "agent-delivery", ticket);
  const branch = `${ticket}-agent-delivery`;
  if (options.resume) {
    if (!existsSync(directory)) {
      throw new Error("No worktree to resume; run without --resume");
    }
    const actual = realpathSync(
      command("git", ["rev-parse", "--show-toplevel"], directory),
    );
    if (
      actual !== realpathSync(directory) ||
      command("git", ["branch", "--show-current"], directory) !== branch ||
      !validRemote(command("git", ["remote", "get-url", "origin"], directory))
    ) {
      throw new Error(
        "Worktree identity mismatch; inspect manually, no reset performed",
      );
    }
  } else {
    if (existsSync(directory)) {
      throw new Error(
        "Existing ticket worktree preserved. Use --resume; no reset performed.",
      );
    }
    command("git", ["fetch", "origin", "main"], root, 60000);
    mkdirSync(join(root, ".local", "agent-delivery"), { recursive: true });
    command(
      "git",
      ["worktree", "add", "-b", branch, directory, "origin/main"],
      root,
    );
  }
  const outputDir = join(directory, ".local");
  mkdirSync(outputDir, { recursive: true });
  const lock = join(outputDir, "agent-delivery.lock");
  // Exclusive creation prevents concurrent agents writing the same worktree.
  writeFileSync(lock, JSON.stringify({ pid: process.pid, ticket }), {
    flag: "wx",
  });
  const { unlinkSync } = await import("node:fs");
  try {
    console.log(
      `Starting ${ticket} in ${directory}. Final report: .local/agent-result.md. Laptop must stay awake.`,
    );
    const invocation = codexInvocation();
    const exitCode = await new Promise((resolveExit, reject) => {
      const child = spawn(
        invocation.executable,
        [
          ...invocation.prefix,
          "exec",
          "--approve-for-me",
          "--output-last-message",
          ".local/agent-result.md",
          "-",
        ],
        {
          cwd: directory,
          shell: false,
          stdio: ["pipe", "inherit", "inherit"],
        },
      );
      child.once("error", reject);
      child.stdin.on("error", () => {});
      child.once("exit", (code) => resolveExit(code ?? 1));
      child.stdin.end(promptFor(ticket, options.resume));
    });
    console.log(
      "Agent run ended. Read its final report; exit code is not proof of Jira Done.",
    );
    process.exitCode = exitCode;
  } finally {
    unlinkSync(lock);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
