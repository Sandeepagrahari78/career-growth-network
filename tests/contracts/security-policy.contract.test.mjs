import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("security gate policy remains fail-closed", () => {
  const raw = readFileSync(
    "config/security/security-policy.v1.json",
    "utf8",
  );
  const policy = JSON.parse(raw);

  assert.equal(policy.contract, "cgn.security-gates.v1");
  assert.equal(policy.dependencyScan.failOnKnownVulnerability, true);
  assert.equal(policy.secretScan.failOnDetection, true);
  assert.equal(policy.sast.failOnError, true);
  assert.equal(policy.filesystemScan.failOnMatch, true);
  assert.equal(policy.containerScan.failOnMatch, true);

  assert.deepEqual(policy.containerScan.severities, [
    "HIGH",
    "CRITICAL",
  ]);
  assert.equal(policy.sbom.format, "cyclonedx-json");
  assert.ok(policy.sbom.artifactRetentionDays >= 7);

  assert.equal(policy.exceptions.allowlistByDefault, false);
  assert.equal(policy.exceptions.requiresJiraTicket, true);
  assert.equal(policy.exceptions.requiresSandeepReview, true);
  assert.equal(policy.exceptions.requiresExpiryDate, true);
});
