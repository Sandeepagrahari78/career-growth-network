import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const script = join(root, "scripts/agent-context.mjs");
const out = ".cgn/context-CGN-285-contract-smoke.md";

test("offline context includes ticket, latest source maps and freshness warning", () => {
  const run = spawnSync(
    process.execPath,
    [script, "--ticket", "CGN-285", "--domain", "cicd", "--out", out],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(run.status, 0, run.stderr);
  const bundle = readFileSync(join(root, out), "utf8");
  assert.match(bundle, /Ticket: CGN-285/);
  assert.match(bundle, /PROJECT_FLOW\.md/);
  assert.match(bundle, /CGN_V2_PRODUCT_VISION\.md/);
  assert.match(bundle, /CGN_V2_FEATURE_GAP_AUDIT\.md/);
  assert.match(bundle, /CGN_V2_DESIGN_HANDOFF\.md/);
  assert.match(bundle, /Jira source freshness/);
  assert.match(bundle, /verify Jira status/i);
  assert.match(bundle, /## Required agent preflight/);
});

test("rejects invalid ticket input and output path traversal", () => {
  for (const args of [
    ["--ticket", "../CGN-220"],
    ["--ticket", "CGN-0", "--domain", "admin"],
    ["--ticket", "CGN-285", "--domain", "../admin"],
    ["--ticket", "CGN-285", "--out", "../outside.md"],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0, args.join(" "));
  }
});

test("git commit available from current repository checkout", () => {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  assert.match(sha, /^[0-9a-f]{40}$/);
});
