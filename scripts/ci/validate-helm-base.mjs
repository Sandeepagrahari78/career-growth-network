import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const contract = JSON.parse(
  readFileSync("config/kubernetes/helm-base.v1.json", "utf8"),
);
const chart = readFileSync("infra/helm/cgn-service/Chart.yaml", "utf8");
const values = readFileSync("infra/helm/cgn-service/values.yaml", "utf8");
const schema = JSON.parse(
  readFileSync("infra/helm/cgn-service/values.schema.json", "utf8"),
);
const deployment = readFileSync(
  "infra/helm/cgn-service/templates/deployment.yaml",
  "utf8",
);
const service = readFileSync(
  "infra/helm/cgn-service/templates/service.yaml",
  "utf8",
);
const stagingValues = readFileSync(
  "infra/helm/values/health-demo-staging.yaml",
  "utf8",
);

assert.equal(contract.schema, "cgn.helm-base.v1");
assert.equal(contract.ticket, "CGN-44");
assert.equal(contract.chartPath, "infra/helm/cgn-service");
assert.equal(contract.runnableValidationService, "health-demo");

for (const serviceName of contract.servicePackages) {
  assert.equal(
    existsSync(`services/${serviceName}/package.json`),
    true,
    `Unknown service package in Helm contract: ${serviceName}`,
  );
}

assert.equal(contract.deferredStandards.probes, "CGN-45");
assert.equal(contract.deferredStandards.autoscalingAndDisruption, "CGN-60");
assert.equal(contract.deferredStandards.serviceAccounts, "CGN-61");

assert.match(chart, /apiVersion:\s*v2/);
assert.match(chart, /name:\s*cgn-service/);
assert.match(chart, /type:\s*application/);
assert.equal(schema.type, "object");
assert.ok(schema.required.includes("image"));
assert.ok(schema.required.includes("container"));
assert.ok(schema.required.includes("service"));

assert.match(values, /replicaCount:\s*1/);
assert.match(values, /type:\s*ClusterIP/);
assert.match(deployment, /kind:\s*Deployment/);
assert.match(deployment, /\.Values\.image\.repository/);
assert.match(deployment, /\.Values\.image\.tag/);
assert.match(service, /kind:\s*Service/);
assert.match(stagingValues, /nameOverride:\s*cgn-health-demo/);
assert.match(stagingValues, /tag:\s*helm-smoke/);

const chartTemplates = [deployment, service].join("\n---\n");
assert.doesNotMatch(
  chartTemplates,
  /livenessProbe|readinessProbe|startupProbe/,
  "Probe standards belong to CGN-45.",
);
assert.doesNotMatch(
  chartTemplates,
  /HorizontalPodAutoscaler|PodDisruptionBudget/,
  "Autoscaling and disruption defaults belong to CGN-60.",
);
assert.doesNotMatch(
  chartTemplates,
  /kind:\s*ServiceAccount|iam\.amazonaws\.com/,
  "Service-account/cloud-IAM standards belong to CGN-61.",
);
assert.doesNotMatch(chartTemplates, /kind:\s*Secret/i);
assert.doesNotMatch(chartTemplates, /aws|eks|gke|aks|azure|loadBalancer/i);

assert.equal(contract.safety.noCloudProvider, true);
assert.equal(contract.safety.noPaidResource, true);
assert.equal(contract.safety.noProductionDeployment, true);
assert.equal(contract.safety.noCommittedSecret, true);

console.log("CGN-44 Helm base chart contract is valid.");
