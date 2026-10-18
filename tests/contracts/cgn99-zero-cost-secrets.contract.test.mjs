import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("zero-cost secrets policy keeps credentials outside source control", () => {
  const policy = JSON.parse(
    readFileSync("config/security/zero-cost-secrets.v1.json", "utf8"),
  );
  const example = readFileSync("infra/postgres/.env.example", "utf8");
  const gitignore = readFileSync(".gitignore", "utf8");
  const securityGates = JSON.parse(
    readFileSync("config/security/security-policy.v1.json", "utf8"),
  );

  assert.equal(policy.schema, "cgn.zero-cost-secrets.v1");
  assert.equal(policy.ticket, "CGN-99");
  assert.equal(policy.cost.paidSecretProviderRequired, false);
  assert.deepEqual(policy.cost.approvedSources, [
    "local-environment",
    "github-actions-encrypted-secrets",
    "kubernetes-secret",
  ]);
  assert.equal(policy.local.realValuesInGit, false);
  assert.equal(
    policy.local.requiredConfiguration,
    "config/infra/postgres-databases.v1.json",
  );
  assert.equal(policy.kubernetes.commitRenderedSecretManifests, false);
  assert.equal(policy.rotation.procedureDocumented, true);
  assert.equal(policy.rotation.rotateImmediatelyAfterExposure, true);
  assert.equal(policy.scanning.scanner, "Gitleaks");
  assert.equal(policy.scanning.failOnDetection, true);
  assert.equal(securityGates.secretScan.scanner, "Gitleaks");
  assert.equal(securityGates.secretScan.failOnDetection, true);

  assert.match(
    example,
    /^CGN_POSTGRES_PASSWORD=replace-with-a-local-only-password$/m,
  );
  assert.doesNotMatch(example, /AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}/);
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^!\*\*\/\.env\.example$/m);
});

test("operator guide documents injection, rotation and response without paid services", () => {
  const guide = readFileSync("docs/security/CGN-99-zero-cost-secrets.md", "utf8");

  assert.match(guide, /GitHub Actions[\s\S]*encrypted/i);
  assert.match(guide, /Kubernetes `Secret`/);
  assert.match(guide, /Rotation/);
  assert.match(guide, /rotate it immediately/i);
  assert.match(guide, /Gitleaks/);
  assert.match(guide, /managed provider migration/i);
});
