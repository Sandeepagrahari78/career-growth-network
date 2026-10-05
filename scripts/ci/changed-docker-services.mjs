import { appendFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sharedDockerInputs = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "packages/contracts/",
  "infra/docker/",
  ".github/workflows/docker-images.yml",
  "scripts/ci/changed-docker-services.mjs",
];

export function selectDockerServices({
  changedFiles,
  availableServices,
  forceAll = false,
}) {
  if (forceAll) {
    return [...availableServices].sort();
  }

  const rebuildAll = changedFiles.some((file) =>
    sharedDockerInputs.some((input) =>
      input.endsWith("/") ? file.startsWith(input) : file === input,
    ),
  );

  if (rebuildAll) {
    return [...availableServices].sort();
  }

  const selected = new Set();

  for (const file of changedFiles) {
    const match = file.match(/^services\/([^/]+)\//);
    if (match && availableServices.includes(match[1])) {
      selected.add(match[1]);
    }
  }

  return [...selected].sort();
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
}

function discoverDockerServices() {
  return readdirSync("services", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((service) => {
      try {
        execFileSync(
          process.platform === "win32" ? "cmd" : "test",
          process.platform === "win32"
            ? ["/c", "if", "exist", `services\\${service}\\Dockerfile`, "(exit 0)", "else", "(exit 1)"]
            : ["-f", `services/${service}/Dockerfile`],
          { stdio: "ignore" },
        );
        return true;
      } catch {
        return false;
      }
    });
}

function run() {
  const availableServices = discoverDockerServices();
  const forceAll = process.env.CGN_ALL_DOCKER_SERVICES === "true";
  const baseSha = process.env.CGN_BASE_SHA;

  let changedFiles = [];

  if (!forceAll) {
    if (!baseSha) {
      console.error("CGN_BASE_SHA is required unless CGN_ALL_DOCKER_SERVICES=true.");
      process.exit(1);
    }

    changedFiles = git(["diff", "--name-only", `${baseSha}...HEAD`]);
  }

  const services = selectDockerServices({
    changedFiles,
    availableServices,
    forceAll,
  });

  const matrix = {
    include: services.map((service) => ({
      service,
      dockerfile: `services/${service}/Dockerfile`,
      context: ".",
    })),
  };

  console.log("Available Docker services:", availableServices.join(", ") || "none");
  console.log("Selected Docker services:", services.join(", ") || "none");

  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    appendFileSync(output, `count=${services.length}\n`);
    appendFileSync(output, `matrix=${JSON.stringify(matrix)}\n`);
  } else {
    console.log(JSON.stringify({ count: services.length, matrix }, null, 2));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
