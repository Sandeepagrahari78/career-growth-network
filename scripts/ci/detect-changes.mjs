import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const baseSha = process.env.CGN_BASE_SHA;
if (!baseSha) {
  console.error("CGN_BASE_SHA is required.");
  process.exit(1);
}

const changed = execFileSync(
  "git",
  ["diff", "--name-only", `${baseSha}...HEAD`],
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

const flags = {
  web: changed.some((file) => file.startsWith("apps/web/")),
  mobile: changed.some((file) => file.startsWith("apps/mobile/")),
  backend: changed.some(
    (file) => file.startsWith("services/") || file.startsWith("packages/"),
  ),
  contracts: changed.some((file) => file.startsWith("packages/contracts/")),
  infra: changed.some(
    (file) =>
      file.startsWith("infra/") ||
      file.startsWith(".github/") ||
      file.startsWith("config/"),
  ),
  docker: changed.some(
    (file) =>
      file.startsWith("services/") ||
      file.startsWith("infra/docker/") ||
      file.endsWith("Dockerfile"),
  ),
  docsOnly:
    changed.length > 0 &&
    changed.every(
      (file) =>
        file.startsWith("docs/") ||
        file === "README.md" ||
        file.endsWith(".md"),
    ),
};

console.log("Changed files:");
for (const file of changed) {
  console.log(`- ${file}`);
}

for (const [key, value] of Object.entries(flags)) {
  console.log(`${key}=${value}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}
