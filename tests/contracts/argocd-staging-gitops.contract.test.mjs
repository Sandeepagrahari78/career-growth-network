import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = JSON.parse(
  readFileSync("config/gitops/staging-gitops.v1.json", "utf8"),
);
const applicationSet = readFileSync(
  "infra/gitops/argocd/applicationset-cgn-staging.yaml",
  "utf8",
);
const project = readFileSync(
  "infra/gitops/argocd/project-cgn-staging.yaml",
  "utf8",
);

test("staging GitOps contract preserves zero-budget safety gates", () => {
  assert.equal(contract.schema, "cgn.staging-gitops.v1");
  assert.equal(contract.safety.noCloudProvider, true);
  assert.equal(contract.safety.noPaidResource, true);
  assert.equal(contract.safety.noCommittedRepositoryCredential, true);
  assert.equal(contract.safety.noProductionAutoDeploy, true);
  assert.equal(contract.safety.manualProductionReleaseRemainsRequired, true);
});

test("ApplicationSet is locked to the approved staging source boundary", () => {
  assert.match(applicationSet, /kind:\s*ApplicationSet/);
  assert.match(applicationSet, /name:\s*cgn-staging-applications/);
  assert.match(applicationSet, /targetRevision:\s*main/);
  assert.match(applicationSet, /path:\s*'\{\{path\}\}'/);
  assert.match(applicationSet, /- name:\s*cgn-platform-baseline/);
  assert.match(applicationSet, /path:\s*infra\/k8s\/base/);
  assert.doesNotMatch(applicationSet, /apps\//);
  assert.doesNotMatch(applicationSet, /services\//);
  assert.doesNotMatch(applicationSet, /\.github\//);
});

test("Argo CD project does not grant broad production or cloud access", () => {
  assert.match(project, /kind:\s*AppProject/);
  assert.match(project, /server:\s*https:\/\/kubernetes\.default\.svc/);
  assert.doesNotMatch(project, /production/i);
  assert.doesNotMatch(project, /aws|eks|gke|aks|azure|loadBalancer/i);
});

test("static GitOps validator passes", () => {
  const output = execFileSync("node", [
    "scripts/ci/validate-argocd-staging.mjs",
  ], { encoding: "utf8" });
  assert.match(output, /CGN-92 Argo CD staging GitOps contract is valid/);
});
