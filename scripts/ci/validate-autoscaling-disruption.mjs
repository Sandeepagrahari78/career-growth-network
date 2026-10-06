import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = JSON.parse(
  readFileSync("config/kubernetes/autoscaling-disruption.v1.json", "utf8"),
);
const capacity = JSON.parse(
  readFileSync("config/performance/capacity.v1.json", "utf8"),
);
const values = readFileSync("infra/helm/cgn-service/values.yaml", "utf8");
const schema = JSON.parse(
  readFileSync("infra/helm/cgn-service/values.schema.json", "utf8"),
);
const deployment = readFileSync(
  "infra/helm/cgn-service/templates/deployment.yaml",
  "utf8",
);
const hpa = readFileSync("infra/helm/cgn-service/templates/hpa.yaml", "utf8");
const pdb = readFileSync("infra/helm/cgn-service/templates/pdb.yaml", "utf8");
const smoke = readFileSync("tests/fixtures/helm/hpa-pdb-smoke.yaml", "utf8");

assert.equal(contract.schema, "cgn.autoscaling-disruption.v1");
assert.equal(contract.ticket, "CGN-60");
assert.equal(contract.chartPath, "infra/helm/cgn-service");
assert.equal(contract.capacityContract, "config/performance/capacity.v1.json");

assert.equal(
  contract.defaults.targetCPUUtilizationPercentage,
  capacity.resourceBudgets.cpuSustainedPercentScaleTrigger,
);
assert.equal(
  contract.defaults.targetMemoryUtilizationPercentage,
  capacity.resourceBudgets.memorySustainedPercentScaleTrigger,
);
assert.equal(contract.defaults.enabled, false);
assert.equal(contract.defaults.replicaBoundsRequireServiceEvidence, true);
assert.equal(contract.defaults.pdbMinAvailable, 1);

assert.ok(schema.required.includes("autoscaling"));
assert.ok(schema.required.includes("disruptionBudget"));
assert.equal(
  schema.properties.autoscaling.properties.targetCPUUtilizationPercentage.maximum,
  100,
);
assert.equal(
  schema.properties.autoscaling.properties.targetMemoryUtilizationPercentage
    .maximum,
  100,
);

assert.ok(values.includes("autoscaling:\n  enabled: false"));
assert.ok(values.includes("minReplicas: null"));
assert.ok(values.includes("maxReplicas: null"));
assert.ok(values.includes("targetCPUUtilizationPercentage: 70"));
assert.ok(values.includes("targetMemoryUtilizationPercentage: 75"));
assert.ok(values.includes("disruptionBudget:\n  enabled: false"));

assert.match(deployment, /if not \.Values\.autoscaling\.enabled/);
assert.match(hpa, /apiVersion:\s*autoscaling\/v2/);
assert.match(hpa, /kind:\s*HorizontalPodAutoscaler/);
assert.match(hpa, /autoscaling\.minReplicas is required/);
assert.match(hpa, /autoscaling\.maxReplicas is required/);
assert.match(hpa, /name:\s*cpu/);
assert.match(hpa, /name:\s*memory/);
assert.match(pdb, /apiVersion:\s*policy\/v1/);
assert.match(pdb, /kind:\s*PodDisruptionBudget/);
assert.match(pdb, /minAvailable:/);

assert.ok(smoke.includes("minReplicas: 2"));
assert.ok(smoke.includes("maxReplicas: 4"));
assert.ok(smoke.includes("targetCPUUtilizationPercentage: 70"));
assert.ok(smoke.includes("targetMemoryUtilizationPercentage: 75"));
assert.ok(smoke.includes("minAvailable: 1"));

assert.equal(contract.failureBehavior.missingReplicaBounds, "fail-helm-render");
assert.equal(contract.failureBehavior.invalidPercentage, "fail-values-schema");
assert.equal(contract.observability.hpaConditions, true);
assert.equal(contract.observability.kubernetesEvents, true);
assert.equal(contract.observability.pdbDisruptionsAllowed, true);
assert.equal(contract.safety.noCloudProvider, true);
assert.equal(contract.safety.noPaidResource, true);
assert.equal(contract.safety.noCommittedSecret, true);
assert.equal(contract.safety.noProductionCapacityClaim, true);
assert.equal(contract.safety.noAutomaticProductionDeployment, true);

console.log("CGN-60 HPA and PodDisruptionBudget contract is valid.");
