import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("CGN-60 autoscaling and disruption validator passes", () => {
  const output = execFileSync(
    "node",
    ["scripts/ci/validate-autoscaling-disruption.mjs"],
    { encoding: "utf8" },
  );

  assert.match(output, /CGN-60 HPA and PodDisruptionBudget contract is valid/);
});

test("invalid utilization target is outside the approved schema bound", () => {
  const invalid = readFileSync(
    "tests/fixtures/helm/invalid-autoscaling-target.yaml",
    "utf8",
  );
  const schema = JSON.parse(
    readFileSync("infra/helm/cgn-service/values.schema.json", "utf8"),
  );

  assert.match(invalid, /targetCPUUtilizationPercentage:\s*101/);
  assert.equal(
    schema.properties.autoscaling.properties.targetCPUUtilizationPercentage
      .maximum,
    100,
  );
});

test("capacity contract remains the source of scale-trigger percentages", () => {
  const capacity = JSON.parse(
    readFileSync("config/performance/capacity.v1.json", "utf8"),
  );
  const contract = JSON.parse(
    readFileSync("config/kubernetes/autoscaling-disruption.v1.json", "utf8"),
  );

  assert.equal(
    contract.defaults.targetCPUUtilizationPercentage,
    capacity.resourceBudgets.cpuSustainedPercentScaleTrigger,
  );
  assert.equal(
    contract.defaults.targetMemoryUtilizationPercentage,
    capacity.resourceBudgets.memorySustainedPercentScaleTrigger,
  );
});
