import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const policy = JSON.parse(
  readFileSync("services/evidence/config/evidence-upload-policy.v1.json", "utf8"),
);
const schema = JSON.parse(
  readFileSync(
    "packages/contracts/schemas/evidence-upload-policy.v1.schema.json",
    "utf8",
  ),
);

test("CGN-134 policy contract publishes the approved file, size and URL limits", () => {
  assert.equal(policy.contract, "cgn.evidence-upload-policy.v1");
  assert.equal(policy.maxFileSizeBytes, 10 * 1024 * 1024);
  assert.equal(policy.signedUploadUrlTtlSeconds, 300);
  assert.equal(policy.signedDownloadUrlTtlSeconds, 60);
  assert.deepEqual(
    policy.allowedFiles.map((file) => [file.contentType, file.extensions]),
    [
      ["application/pdf", [".pdf"]],
      ["image/jpeg", [".jpg", ".jpeg"]],
      ["image/png", [".png"]],
    ],
  );
});

test("CGN-134 policy requires private ownership, quarantine, post-upload checks and fail-closed scanning", () => {
  assert.equal(policy.privateObjectsOnly, true);
  assert.equal(policy.ownerAuthorizationRequired, true);
  assert.equal(policy.quarantineUntilClean, true);
  assert.equal(policy.postUploadValidationRequired, true);
  assert.equal(policy.scannerFailureMode, "fail_closed");

  assert.equal(schema.properties.privateObjectsOnly.const, true);
  assert.equal(schema.properties.quarantineUntilClean.const, true);
  assert.equal(schema.properties.ownerAuthorizationRequired.const, true);
  assert.equal(schema.properties.postUploadValidationRequired.const, true);
  assert.equal(schema.properties.scannerFailureMode.const, "fail_closed");
  assert.deepEqual(schema.additionalProperties, false);
});
