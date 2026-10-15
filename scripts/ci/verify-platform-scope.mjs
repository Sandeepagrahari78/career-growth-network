import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  validatePlatformScope,
  platformsChanged,
} from "./platform-scope-policy.mjs";

function main() {
  const baseSha = process.env.CGN_BASE_SHA;
  const branch = process.env.GITHUB_HEAD_REF;
  if (!baseSha || !/^[a-f0-9]{40}$/.test(baseSha)) {
    throw new Error("CGN_BASE_SHA must be the trusted PR base SHA.");
  }
  const changed = execFileSync(
    "git",
    ["diff", "--name-only", baseSha + "...HEAD"],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  const registry = JSON.parse(
    readFileSync("config/ci/ticket-platform-scopes.v1.json", "utf8"),
  );
  const problems = validatePlatformScope({ files: changed, branch, registry });
  if (problems.length) {
    for (const problem of problems) {
      console.error("PLATFORM SCOPE DENIED: " + problem);
    }
    process.exitCode = 1;
    return;
  }
  const changedPlatforms = platformsChanged(changed).join(", ");
  console.log("Platform OK: " + (changedPlatforms || "no app changes"));
}

try {
  main();
} catch (error) {
  console.error("Platform scope check failed: " + error.message);
  process.exitCode = 1;
}
