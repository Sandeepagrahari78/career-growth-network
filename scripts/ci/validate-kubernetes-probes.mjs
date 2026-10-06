import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = JSON.parse(
  readFileSync("config/kubernetes/probes.v1.json", "utf8"),
);
const values = readFileSync("infra/helm/cgn-service/values.yaml", "utf8");
const schema = JSON.parse(
  readFileSync("infra/helm/cgn-service/values.schema.json", "utf8"),
);
const deployment = readFileSync(
  "infra/helm/cgn-service/templates/deployment.yaml",
  "utf8",
);
const server = readFileSync("services/health-demo/server.mjs", "utf8");
const environmentValues = [
  readFileSync("infra/helm/values/health-demo-staging.yaml", "utf8"),
  readFileSync("infra/helm/values/health-demo-promotion-staging.yaml", "utf8"),
  readFileSync("infra/helm/values/health-demo-production.yaml", "utf8"),
];

assert.equal(contract.schema, "cgn.kubernetes-probes.v1");
assert.equal(contract.ticket, "CGN-45");
assert.equal(contract.chartPath, "infra/helm/cgn-service");
assert.equal(contract.runnableValidationService, "health-demo");
assert.equal(contract.defaultsEnabled, false);

assert.equal(contract.transport.type, "httpGet");
assert.equal(contract.transport.portName, "http");
assert.equal(contract.transport.startupPath, "/health");
assert.equal(contract.transport.readinessPath, "/ready");
assert.equal(contract.transport.livenessPath, "/health");

assert.ok(schema.required.includes("probes"));
assert.equal(schema.properties.probes.type, "object");
assert.deepEqual(schema.properties.probes.required, [
  "enabled",
  "startup",
  "readiness",
  "liveness",
]);

assert.ok(values.includes("probes:\n  enabled: false"));
assert.ok(values.includes("startup:\n    path: /health"));
assert.ok(values.includes("readiness:\n    path: /ready"));
assert.ok(values.includes("liveness:\n    path: /health"));

assert.match(deployment, /startupProbe:/);
assert.match(deployment, /readinessProbe:/);
assert.match(deployment, /livenessProbe:/);
assert.match(deployment, /httpGet:/);
assert.match(deployment, /port:\s*http/);
assert.doesNotMatch(deployment, /exec:/);
assert.doesNotMatch(deployment, /tcpSocket:/);

for (const environment of environmentValues) {
  assert.ok(
    environment.includes("probes:\n  enabled: true"),
    "Health-demo staging/production values must enable probe standards.",
  );
}

assert.ok(server.includes('request.url === "/health"'));
assert.ok(server.includes('request.url === "/ready"'));

assert.equal(contract.failureBehavior.startupFailure, "container-restart");
assert.equal(
  contract.failureBehavior.readinessFailure,
  "remove-from-service-endpoints",
);
assert.equal(contract.failureBehavior.livenessFailure, "container-restart");
assert.equal(contract.observability.kubernetesPodStatus, true);
assert.equal(contract.observability.kubernetesEvents, true);
assert.equal(contract.safety.httpGetOnly, true);
assert.equal(contract.safety.noExecProbe, true);
assert.equal(contract.safety.noTcpSocketProbe, true);
assert.equal(contract.safety.noCloudProvider, true);
assert.equal(contract.safety.noCommittedSecret, true);

console.log("CGN-45 Kubernetes probe standards contract is valid.");
