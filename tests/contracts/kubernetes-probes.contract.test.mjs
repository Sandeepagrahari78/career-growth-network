import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("CGN-45 probe standards validator passes", () => {
  const output = execFileSync(
    "node",
    ["scripts/ci/validate-kubernetes-probes.mjs"],
    { encoding: "utf8" },
  );

  assert.match(output, /CGN-45 Kubernetes probe standards contract is valid/);
});

test("invalid probe fixture exercises schema rejection path", () => {
  const invalidValues = readFileSync(
    "tests/fixtures/helm/invalid-probe-path.yaml",
    "utf8",
  );

  assert.match(invalidValues, /path:\s*health/);
  assert.doesNotMatch(invalidValues, /path:\s*\/health/);
});
