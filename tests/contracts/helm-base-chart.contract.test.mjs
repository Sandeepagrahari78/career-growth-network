import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = JSON.parse(
  readFileSync("config/kubernetes/helm-base.v1.json", "utf8"),
);
const deployment = readFileSync(
  "infra/helm/cgn-service/templates/deployment.yaml",
  "utf8",
);
const service = readFileSync(
  "infra/helm/cgn-service/templates/service.yaml",
  "utf8",
);

test("Helm base chart covers the established service workspaces", () => {
  assert.deepEqual(contract.servicePackages, [
    "career",
    "community",
    "evidence",
    "feed",
    "gateway",
    "growth",
    "health-demo",
    "identity",
    "messaging",
    "network",
    "roadmap",
  ]);
});

test("base chart includes CGN-45 probes but keeps later concerns out", () => {
  const templates = [deployment, service].join("\n");
  assert.match(deployment, /kind:\s*Deployment/);
  assert.match(service, /kind:\s*Service/);
  assert.match(deployment, /startupProbe/);
  assert.match(deployment, /readinessProbe/);
  assert.match(deployment, /livenessProbe/);
  assert.doesNotMatch(templates, /HorizontalPodAutoscaler|PodDisruptionBudget/);
  assert.doesNotMatch(templates, /kind:\s*ServiceAccount|kind:\s*Secret/i);
});

test("static Helm validator passes", () => {
  const output = execFileSync("node", ["scripts/ci/validate-helm-base.mjs"], {
    encoding: "utf8",
  });
  assert.match(output, /CGN-44 Helm base chart contract is valid/);
});
