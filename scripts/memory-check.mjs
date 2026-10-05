import { execFileSync } from "node:child_process";

const memoryPrefixes = [
  "docs/engineering-memory/",
  "docs/adr/",
  "docs/handoffs/",
  "packages/contracts/",
  ".cgn/",
];

const meaningfulPrefixes = [
  "apps/",
  "services/",
  "packages/",
  "infra/",
  ".github/",
  "config/",
  "scripts/ci/",
];

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
}

let changed = [];

try {
  const baseSha = process.env.CGN_BASE_SHA;
  const beforeSha = process.env.CGN_BEFORE_SHA;

  if (process.env.CI === "true" && baseSha) {
    changed = git(["diff", "--name-only", `${baseSha}...HEAD`]);
  } else if (
    process.env.CI === "true" &&
    beforeSha &&
    !/^0+$/.test(beforeSha)
  ) {
    changed = git(["diff", "--name-only", `${beforeSha}...HEAD`]);
  } else {
    changed = git(["diff", "--cached", "--name-only"]);
  }
} catch (error) {
  console.error("Unable to calculate changed files for Engineering Memory gate.");
  console.error(error.message);
  process.exit(1);
}

if (!changed.length) {
  console.log("No changed files for Engineering Memory gate.");
  process.exit(0);
}

console.log("Changed files:");
for (const file of changed) {
  console.log(`- ${file}`);
}

const meaningful = changed.some((file) =>
  meaningfulPrefixes.some((prefix) => file.startsWith(prefix)),
);

const memoryTouched = changed.some((file) =>
  memoryPrefixes.some((prefix) => file.startsWith(prefix)),
);

if (meaningful && !memoryTouched) {
  console.error("");
  console.error(
    "Memory check failed: implementation/infrastructure changed without an Engineering Memory, ADR, contract, or handoff update.",
  );
  console.error("Add the relevant handoff/state trail before merge.");
  process.exit(1);
}

console.log("");
console.log("Memory check passed.");
