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
const hpa = readFileSync("infra/helm/cgn-service/templates/hpa.yaml", "utf8");
const pdb = readFileSync("infra/helm/cgn-service/templates/pdb.yaml", "utf8");
const serviceAccount = readFileSync(
  "infra/helm/cgn-service/templates/serviceaccount.yaml",
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

const chartTemplates = [deployment, service, hpa, pdb, serviceAccount].join(
  "\n---\n",
);
assert.match(chartTemplates, /startupProbe/);
assert.match(chartTemplates, /readinessProbe/);
assert.match(chartTemplates, /livenessProbe/);
assert.ok(schema.required.includes("probes"));
assert.match(chartTemplates, /HorizontalPodAutoscaler/);
assert.match(chartTemplates, /PodDisruptionBudget/);
assert.ok(schema.required.includes("autoscaling"));
assert.ok(schema.required.includes("disruptionBudget"));
assert.match(chartTemplates, /kind:\s*ServiceAccount/);
assert.match(deployment, /serviceAccountName:/);
assert.match(deployment, /automountServiceAccountToken:/);
assert.ok(schema.required.includes("serviceAccount"));
assert.ok(schema.required.includes("workloadIdentity"));
assert.doesNotMatch(chartTemplates, /kind:\s*Secret/i);
assert.doesNotMatch(chartTemplates, /type:\s*LoadBalancer/i);
assert.doesNotMatch(
  chartTemplates,
  /accessKeyId|secretAccessKey|aws_access_key|aws_secret/i,
);

assert.equal(contract.safety.noCloudProvider, true);
assert.equal(contract.safety.noPaidResource, true);
assert.equal(contract.safety.noProductionDeployment, true);
assert.equal(contract.safety.noCommittedSecret, true);

console.log("CGN-44 Helm base chart contract is valid.");
