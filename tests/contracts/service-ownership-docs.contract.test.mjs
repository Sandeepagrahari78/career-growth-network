import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (path) => readFileSync(resolve(repoRoot, path), "utf8");

const ownershipTemplate = read("docs/modules/SERVICE_OWNERSHIP_TEMPLATE.md");
const runbookTemplate = read("docs/runbooks/SERVICE_RUNBOOK_TEMPLATE.md");
const examplePath = "docs/modules/platform-template-ownership.md";
const example = read(examplePath);

test(
  "ownership and runbook templates cover the required operating details",
  () => {
    for (const section of [
      "Service identity and owners",
      "Responsibility and data boundary",
      "Dependencies and contracts",
      "Health and operations",
      "Telemetry and audit",
      "Database, migrations, backup and rollback",
      "Local development and verification",
    ]) {
      assert.ok(
        ownershipTemplate.includes(section),
        `ownership template: ${section}`,
      );
    }

    for (const section of [
      "Service and escalation",
      "Health checks and first response",
      "Dependencies and recovery",
      "Data and migrations",
      "Local verification commands",
      "Incident closure",
    ]) {
      assert.ok(
        runbookTemplate.includes(section),
        `runbook template: ${section}`,
      );
    }
  },
);

test(
  "platform-template example distinguishes verified behavior from future scope",
  () => {
    for (const marker of [
      "**Implemented**",
      "**Planned",
      "**Not validated**",
    ]) {
      assert.ok(example.includes(marker), `missing evidence marker ${marker}`);
    }
    assert.match(example, /`GET \/health`/);
    assert.match(example, /`GET \/ready`/);
    assert.match(example, /Database \/ schema \/ migrations: \*\*None\*\*/);
    assert.match(example, /no user authorization surface exists/i);
  },
);

test("all repository-relative markdown links in the example resolve", () => {
  const markdownLinks = [...example.matchAll(/\]\(([^)]+)\)/g)].map(
    ([, target]) => target,
  );
  assert.ok(markdownLinks.length > 0);

  for (const target of markdownLinks) {
    if (/^[a-z]+:\/\//i.test(target) || target.startsWith("#")) continue;
    const path = target.split("#")[0];
    assert.ok(
      existsSync(resolve(dirname(resolve(repoRoot, examplePath)), path)),
      `broken local link: ${target}`,
    );
  }
});

test(
  "documented platform-template commands exist in its package scripts",
  () => {
    const packageJson = JSON.parse(
      read("services/platform-template/package.json"),
    );
    const readme = read("services/platform-template/README.md");
    for (const [command, script] of [
      ["build", "build"],
      ["test", "test"],
      ["test:docker", "test:docker"],
    ]) {
      assert.ok(
        packageJson.scripts[script],
        `missing package script ${script}`,
      );
      assert.ok(
        readme.includes(`pnpm --filter @cgn/platform-template ${command}`),
        `README does not document ${command}`,
      );
    }
  },
);

