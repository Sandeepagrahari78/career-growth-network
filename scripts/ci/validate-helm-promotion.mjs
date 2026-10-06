import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = JSON.parse(
  readFileSync("config/gitops/helm-promotion.v1.json", "utf8"),
);
const chart = readFileSync("infra/helm/health-demo/Chart.yaml", "utf8");
const staging = readFileSync(
  "infra/helm/health-demo/values-staging.yaml",
  "utf8",
);
const production = readFileSync(
  "infra/helm/health-demo/values-production.yaml",
  "utf8",
);

function scalar(text, key) {
  const match = text.match(
    new RegExp(`^${key}:\\s*["\']?([^"\'\\s]+)["\']?\\s*$`, "m"),
  );
  assert.ok(match, `Missing scalar ${key}`);
  return match[1];
}

function nestedScalar(text, key) {
  const match = text.match(
    new RegExp(`^\\s{2}${key}:\\s*["']?([^"'\\s]+)["']?\\s*$`, "m"),
  );
  assert.ok(match, `Missing nested scalar ${key}`);
  return match[1];
}

assert.equal(contract.schema, "cgn.helm-promotion.v1");
assert.equal(contract.ticket, "CGN-93");
assert.equal(contract.mode, "zero-budget-release-promotion-dry-run");
assert.equal(contract.chart.path, "infra/helm/health-demo");
assert.equal(contract.artifact.imageTagTemplate, "sha-__RELEASE_SHA__");
assert.equal(contract.artifact.requireImmutableShaTag, true);
assert.equal(contract.promotion.requireExactMainSha, true);
assert.equal(contract.promotion.sameArtifactAcrossEnvironments, true);
assert.equal(contract.promotion.manualProductionApprovalRequired, true);
assert.equal(contract.safety.noAutomaticProductionDeployment, true);
assert.equal(contract.safety.renderOnlyUntilProductionTargetApproved, true);

assert.match(chart, /^apiVersion:\s*v2$/m);
assert.match(chart, /^name:\s*cgn-health-demo$/m);

const stagingTag = nestedScalar(staging, "tag");
const productionTag = nestedScalar(production, "tag");
const stagingRepository = nestedScalar(staging, "repository");
const productionRepository = nestedScalar(production, "repository");
const stagingReplicas = Number(scalar(staging, "replicaCount"));
const productionReplicas = Number(scalar(production, "replicaCount"));

assert.equal(stagingTag, contract.artifact.imageTagTemplate);
assert.equal(productionTag, contract.artifact.imageTagTemplate);
assert.equal(stagingRepository, productionRepository);
assert.ok(Number.isInteger(stagingReplicas) && stagingReplicas > 0);
assert.ok(Number.isInteger(productionReplicas) && productionReplicas > 0);
assert.ok(productionReplicas >= stagingReplicas);

for (const mutableTag of contract.artifact.forbidMutableTags) {
  const pattern = new RegExp(`tag:\\s*["']?${mutableTag}["']?\\s*$`, "im");
  assert.doesNotMatch(staging, pattern);
  assert.doesNotMatch(production, pattern);
}

const combined = [chart, staging, production].join("\n");
assert.doesNotMatch(combined, /kind:\s*Secret/i);
assert.doesNotMatch(combined, /password|token|clientSecret|privateKey/i);
assert.doesNotMatch(combined, /aws|eks|gke|aks|azure|loadBalancer/i);

console.log("CGN-93 Helm staging-to-production promotion contract is valid.");
