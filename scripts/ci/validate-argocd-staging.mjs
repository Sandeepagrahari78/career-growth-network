import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const contract = JSON.parse(
  readFileSync("config/gitops/staging-gitops.v1.json", "utf8"),
);

const project = readFileSync(
  "infra/gitops/argocd/project-cgn-staging.yaml",
  "utf8",
);
const applicationSet = readFileSync(
  "infra/gitops/argocd/applicationset-cgn-staging.yaml",
  "utf8",
);
const namespace = readFileSync("infra/gitops/argocd/namespace.yaml", "utf8");
const kustomization = readFileSync(
  "infra/gitops/argocd/kustomization.yaml",
  "utf8",
);

const allYaml = [project, applicationSet, namespace, kustomization].join(
  "\n---\n",
);

assert.equal(contract.schema, "cgn.staging-gitops.v1");
assert.equal(contract.ticket, "CGN-92");
assert.equal(contract.mode, "zero-budget-local-first");
assert.equal(contract.repository.revision, "main");
assert.equal(contract.argoCd.namespace, "argocd");
assert.equal(contract.argoCd.project, "cgn-staging");
assert.equal(contract.argoCd.applicationSet, "cgn-staging-applications");
assert.equal(
  contract.argoCd.allowedDestinationServer,
  "https://kubernetes.default.svc",
);
assert.deepEqual(contract.argoCd.approvedSourcePaths, ["infra/k8s/base"]);

assert.match(namespace, /kind:\s*Namespace/);
assert.match(namespace, /name:\s*argocd/);
assert.match(project, /kind:\s*AppProject/);
assert.match(project, /name:\s*cgn-staging/);
assert.match(project, /namespace:\s*argocd/);
assert.match(applicationSet, /kind:\s*ApplicationSet/);
assert.match(applicationSet, /name:\s*cgn-staging-applications/);
assert.match(applicationSet, /project:\s*cgn-staging/);
assert.match(
  applicationSet,
  /repoURL:\s*https:\/\/github\.com\/Sandeepagrahari78\/career-growth-network/,
);
assert.match(applicationSet, /targetRevision:\s*main/);
assert.match(applicationSet, /path:\s*["']\{\{path\}\}["']/);
assert.match(applicationSet, /server:\s*https:\/\/kubernetes\.default\.svc/);
assert.match(applicationSet, /CreateNamespace=false/);
assert.match(applicationSet, /ServerSideApply=true/);

for (const sourcePath of contract.argoCd.approvedSourcePaths) {
  assert.equal(
    existsSync(sourcePath),
    true,
    `Approved GitOps source path is missing: ${sourcePath}`,
  );
}

assert.equal(contract.safety.noCloudProvider, true);
assert.equal(contract.safety.noPaidResource, true);
assert.equal(contract.safety.noCommittedRepositoryCredential, true);
assert.equal(contract.safety.noProductionAutoDeploy, true);
assert.equal(contract.safety.manualProductionReleaseRemainsRequired, true);

assert.doesNotMatch(allYaml, /kind:\s*Secret/i);
assert.doesNotMatch(allYaml, /password|token|clientSecret|privateKey/i);
assert.doesNotMatch(allYaml, /aws|eks|gke|aks|azure|loadBalancer/i);
assert.doesNotMatch(allYaml, /production/i);
assert.doesNotMatch(allYaml, /0\.0\.0\.0/);

console.log("CGN-92 Argo CD staging GitOps contract is valid.");
