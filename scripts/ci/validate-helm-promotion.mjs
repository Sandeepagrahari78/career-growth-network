import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const contract = JSON.parse(
  readFileSync("config/gitops/helm-promotion.v1.json", "utf8"),
);
const staging = readFileSync(contract.stagingValues, "utf8");
const production = readFileSync(contract.productionValues, "utf8");

function topLevelValue(text, key) {
  const prefix = `${key}:`;
  const line = text.split(/\r?\n/).find((entry) => entry.startsWith(prefix));
  assert.ok(line, `Missing top-level value: ${key}`);
  return line.slice(prefix.length).trim().replace(/^["']|["']$/g, "");
}

function nestedValue(text, key) {
  const prefix = `  ${key}:`;
  const line = text.split(/\r?\n/).find((entry) => entry.startsWith(prefix));
  assert.ok(line, `Missing nested value: ${key}`);
  return line.slice(prefix.length).trim().replace(/^["']|["']$/g, "");
}

assert.equal(contract.schema, "cgn.helm-promotion.v1");
assert.equal(contract.ticket, "CGN-93");
assert.equal(contract.chartPath, "infra/helm/cgn-service");
assert.equal(existsSync(contract.chartPath), true);
assert.equal(existsSync(contract.stagingValues), true);
assert.equal(existsSync(contract.productionValues), true);

const stagingTag = nestedValue(staging, "tag");
const productionTag = nestedValue(production, "tag");
const stagingRepository = nestedValue(staging, "repository");
const productionRepository = nestedValue(production, "repository");

assert.equal(stagingTag, contract.artifact.tagTemplate);
assert.equal(productionTag, contract.artifact.tagTemplate);
assert.equal(stagingRepository, contract.artifact.repository);
assert.equal(productionRepository, contract.artifact.repository);
assert.equal(stagingRepository, productionRepository);

for (const forbiddenTag of contract.artifact.forbiddenTags) {
  assert.notEqual(stagingTag, forbiddenTag);
  assert.notEqual(productionTag, forbiddenTag);
}

assert.equal(topLevelValue(staging, "nameOverride"), "cgn-health-demo");
assert.equal(topLevelValue(production, "nameOverride"), "cgn-health-demo");
assert.equal(Number(topLevelValue(staging, "replicaCount")), 1);
assert.equal(Number(topLevelValue(production, "replicaCount")), 2);

assert.match(staging, /cgn\.io\/environment:\s*staging/);
assert.match(production, /cgn\.io\/environment:\s*production/);
assert.match(staging, /type:\s*ClusterIP/);
assert.match(production, /type:\s*ClusterIP/);

const combined = [staging, production].join("\n---\n");
assert.doesNotMatch(combined, /kind:\s*Secret/i);
assert.doesNotMatch(combined, /password|clientSecret|privateKey/i);
assert.doesNotMatch(combined, /LoadBalancer|NodePort/);

assert.equal(contract.promotion.sameArtifactAcrossEnvironments, true);
assert.equal(contract.promotion.exactMainShaRequired, true);
assert.equal(contract.promotion.ownerApprovalRequired, true);
assert.equal(contract.safety.noCloudProvider, true);
assert.equal(contract.safety.noPaidResource, true);
assert.equal(contract.safety.noCommittedSecret, true);
assert.equal(contract.safety.noAutomaticProductionDeployment, true);
assert.equal(contract.safety.renderOnlyUntilProductionTargetApproved, true);

console.log("CGN-93 Helm promotion contract is valid.");
