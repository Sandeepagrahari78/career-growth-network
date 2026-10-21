import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlan,
  parseArgs,
  validateBranch,
} from "../../scripts/ci/ticket-check.mjs";

const scripts = {
  "services/gateway": {
    build: "tsc",
    typecheck: "tsc --noEmit",
    "test:unit": "node --test test/unit/*.test.mjs",
    "test:integration": "node --test test/integration/*.test.mjs",
    "test:docker": "node test/docker-smoke.mjs",
  },
  "services/identity": {
    "test:unit": "node --test test/unit/*.test.mjs",
  },
};

test("accepts only exact ticket and supported flags", () => {
  assert.deepEqual(parseArgs(["--ticket", "CGN-301"]), {
    ticket: "CGN-301",
    jiraLive: false,
    docker: false,
  });
  assert.deepEqual(
    parseArgs(["--ticket", "CGN-301", "--jira-live", "--docker"]),
    {
      ticket: "CGN-301",
      jiraLive: true,
      docker: true,
    },
  );
  assert.throws(() => parseArgs(["--ticket", "../secret"]), /Usage:/);
  assert.throws(
    () => parseArgs(["--ticket", "CGN-301", "--no-security"]),
    /Unknown/,
  );
});

test("prevents checking unrelated or main branches", () => {
  validateBranch("CGN-301-fast-delivery-v2", "CGN-301");
  assert.throws(() => validateBranch("main", "CGN-301"), /matching/);
  assert.throws(
    () => validateBranch("CGN-73-api-gateway", "CGN-301"),
    /matching/,
  );
  assert.throws(
    () => validateBranch("CGN-301-feature;rm", "CGN-301"),
    /matching/,
  );
});

test("small service ticket chooses scoped checks without removing security CI", () => {
  const plan = buildPlan(
    [
      "services/gateway/src/main.ts",
      "services/gateway/test/unit/gateway.test.mjs",
      "docs/handoffs/CGN-73.md",
    ],
    scripts,
  );
  assert.equal(plan.mode, "scoped");
  assert.equal(plan.fullCIRemainsRequired, true);
  assert.deepEqual(plan.dockerServices, ["gateway"]);
  assert.ok(
    plan.commands.some((c) => c.label === "services/gateway:test:integration"),
  );
  assert.ok(plan.commands.some((c) => c.label === "memory"));
  assert.ok(plan.commands.some((c) => c.label === "handoff"));
  assert.ok(plan.commands.some((c) => c.label === "platform-scope"));
  assert.ok(!plan.commands.some((c) => c.label.startsWith("full-quality")));
});

test("workspace and CI policy changes require full quality locally", () => {
  for (const changed of [
    "package.json",
    "pnpm-lock.yaml",
    ".github/workflows/pr-ci.yml",
    "scripts/ci/ticket-check.mjs",
    "packages/contracts/src/index.ts",
    "infra/docker/docker-compose.test.yml",
  ]) {
    const plan = buildPlan([changed, "docs/handoffs/CGN-301.md"], scripts);
    assert.equal(plan.mode, "full", changed);
    assert.ok(plan.commands.some((c) => c.label === "full-quality"));
  }
});

test("missing or untested package fails into full-quality fallback", () => {
  assert.equal(buildPlan(["services/new-service/index.ts"], {}).mode, "full");
  assert.equal(
    buildPlan(["services/new-service/index.ts"], {
      "services/new-service": { build: "tsc" },
    }).mode,
    "full",
  );
});

test("unknown changed path with unsafe characters refuses shell execution", () => {
  for (const file of [
    "services/foo/abc;rm.js",
    "../.env",
    "/tmp/test",
    "docs/a b.md",
  ]) {
    assert.throws(() => buildPlan([file], scripts), /Unsafe/);
  }
});

test("empty change set cannot create a false green pre-push result", () => {
  assert.throws(() => buildPlan([], scripts), /No committed changes/);
});

test("plan deduplicates package checks but preserves changed files", () => {
  const plan = buildPlan(
    [
      "services/gateway/src/a.ts",
      "services/gateway/src/b.ts",
      "services/gateway/src/a.ts",
    ],
    scripts,
  );
  assert.equal(plan.files.length, 2);
  assert.equal(
    plan.commands.filter((x) => x.label === "services/gateway:test:unit")
      .length,
    1,
  );
});

test("Jira process and telemetry do not replace tests", () => {
  const plan = buildPlan(["docs/handoffs/CGN-301.md"], scripts);
  assert.equal(plan.mode, "scoped");
  assert.equal(plan.fullCIRemainsRequired, true);
  assert.ok(plan.commands.some((c) => c.label === "boundaries"));
});
