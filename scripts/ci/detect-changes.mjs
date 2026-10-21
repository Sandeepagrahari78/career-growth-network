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
  k8s: changed.some(
    (file) =>
      file.startsWith("infra/k8s/") ||
      file.startsWith("scripts/infra/k3d-") ||
      file === "config/infra/local-network.v1.json" ||
      file === ".github/workflows/local-k8s.yml",
  ),
  postgres: changed.some(
    (file) =>
      file === "infra/docker/docker-compose.postgres.yml" ||
      file.startsWith("infra/postgres/") ||
      (file.startsWith("services/") && file.includes("/migrations/")) ||
      file.startsWith("scripts/infra/postgres-") ||
      file === "config/infra/postgres-databases.v1.json" ||
      file === ".github/workflows/local-postgres.yml" ||
      file.startsWith("services/identity/migrations/") ||
      file === "services/identity/test/postgres-acceptance.mjs",
  ),
  docker: changed.some(
    (file) =>
      file.startsWith("services/") ||
      file.startsWith("infra/docker/") ||
      file.endsWith("Dockerfile"),
  ),
  integration: changed.some(
    (file) =>
      file.startsWith("services/") ||
      file.startsWith("packages/") ||
      file.startsWith("tests/integration/") ||
      file === "infra/docker/docker-compose.test.yml" ||
      file === "infra/docker/docker-compose.redpanda.yml" ||
      file === "infra/docker/docker-compose.valkey.yml" ||
      file === "infra/docker/docker-compose.seaweedfs.yml" ||
      file.startsWith("scripts/infra/redpanda-") ||
      file.startsWith("scripts/infra/valkey-") ||
      file.startsWith("scripts/infra/seaweedfs-") ||
      file === "scripts/ci/integration-stack-smoke.mjs" ||
      file === ".github/workflows/pr-ci.yml",
  ),
  platformTemplate: changed.some((file) =>
    file.startsWith("services/platform-template/"),
  ),
  e2e: changed.some(
    (file) =>
      file.startsWith("apps/web/") ||
      file.startsWith("services/health-demo/") ||
      file.startsWith("services/platform-template/") ||
      file.startsWith("tests/e2e/") ||
      file === ".github/workflows/pr-ci.yml",
  ),
  performance: changed.some(
    (file) =>
      file.startsWith("services/health-demo/") ||
      file.startsWith("tests/performance/") ||
      file.startsWith("config/performance/") ||
      file === ".github/workflows/pr-ci.yml",
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
