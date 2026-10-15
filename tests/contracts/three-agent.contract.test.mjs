import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

test("three-role handoff scenario preserves decisions", () => {
  const args = ["scripts/run-three-agent-demo.mjs"];
  const output = execFileSync(process.execPath, args, { encoding: "utf8" });
  assert.match(output, /SUCCESS: Sandeep/);
  const file = ".cgn/demo/three-agent/final-result.json";
  const report = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(report.pass, true);
  assert.equal(report.roles.length, 3);
  assert.equal(report.productFeatureImplemented, false);
  assert.match(report.outcome, /verify live Jira/);
});
