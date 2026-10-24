import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { EvidenceS3Storage } from "../../dist/s3-storage.js";

const policy = JSON.parse(
  readFileSync(
    new URL("../../config/evidence-upload-policy.v1.json", import.meta.url),
    "utf8",
  ),
);
const now = new Date("2026-10-24T12:00:00.000Z");
const config = {
  endpoint: "http://127.0.0.1:18333",
  region: "us-east-1",
  bucket: "cgn-evidence",
  credentials: {
    accessKey: "access-key-example-0001",
    secretKey: "secret-key-must-not-leak",
  },
};

function input(overrides = {}) {
  return {
    principalId: "student-a",
    ownerId: "student-a",
    fileName: "proof.pdf",
    declaredContentType: "application/pdf",
    declaredSizeBytes: 64,
    now,
    ...overrides,
  };
}

test("upload grants stay private and use opaque, expiring keys", () => {
  const result = new EvidenceS3Storage(config).createUploadGrant(
    input(),
    policy,
  );

  assert.equal(result.allowed, true);
  assert.match(result.objectKey, /^quarantine\/[0-9a-f-]{36}$/);
  assert.equal(result.headers["content-type"], "application/pdf");
  assert.equal(result.headers["if-none-match"], "*");
  assert.equal(result.headers["x-amz-meta-owner-id"], "student-a");
  assert.equal(result.headers["x-amz-meta-quarantine-state"], "quarantined");
  assert.equal(result.headers["x-amz-meta-declared-size-bytes"], "64");

  const url = new URL(result.uploadUrl);
  assert.equal(url.origin, config.endpoint);
  assert.match(url.pathname, /^\/cgn-evidence\/quarantine\/[0-9a-f-]{36}$/);
  assert.equal(url.searchParams.get("X-Amz-Expires"), "300");
  assert.equal(
    url.searchParams.get("X-Amz-SignedHeaders"),
    [
      "content-type",
      "host",
      "if-none-match",
      "x-amz-meta-declared-size-bytes",
      "x-amz-meta-owner-id",
      "x-amz-meta-quarantine-state",
    ].join(";"),
  );
  assert.equal(url.searchParams.get("X-Amz-Date"), "20261024T120000Z");
  assert.equal(url.searchParams.has("X-Amz-Signature"), true);
  assert.doesNotMatch(result.uploadUrl, /student-a|secret-key-must-not-leak/);
});

test("upload grants reject cross-user, unsupported, and oversized requests", () => {
  const storage = new EvidenceS3Storage(config);
  assert.deepEqual(
    storage.createUploadGrant(input({ principalId: "student-b" }), policy),
    { allowed: false, reason: "owner_mismatch" },
  );
  assert.deepEqual(
    storage.createUploadGrant(
      input({
        fileName: "proof.exe",
        declaredContentType: "application/pdf",
      }),
      policy,
    ),
    { allowed: false, reason: "unsupported_file_type" },
  );
  assert.deepEqual(
    storage.createUploadGrant(
      input({ declaredSizeBytes: policy.maxFileSizeBytes + 1 }),
      policy,
    ),
    { allowed: false, reason: "declared_size_exceeded" },
  );
  assert.deepEqual(
    storage.createUploadGrant(input(), {
      ...policy,
      signedUploadUrlTtlSeconds: 301,
    }),
    { allowed: false, reason: "invalid_policy" },
  );
});

test("downloads require owner authorization and a clean pinned revision", async () => {
  const storage = new EvidenceS3Storage(config);
  const base = {
    principalId: "student-a",
    ownerId: "student-a",
    objectKey: "quarantine/8c0ba67a-8de0-4d99-8cd8-a23bde17dc46",
    objectVisibility: "private",
    validation: {
      state: "validated",
      malwareScan: "clean",
      objectRevision: 'etag:"revision-3"',
      checksumSha256: "a".repeat(64),
    },
    now,
  };

  assert.deepEqual(
    await storage.createDownloadGrant(
      { ...base, principalId: "student-b" },
      policy,
    ),
    { allowed: false, reason: "owner_mismatch" },
  );
  assert.deepEqual(
    await storage.createDownloadGrant(
      {
        ...base,
        validation: { ...base.validation, malwareScan: "suspicious" },
      },
      policy,
    ),
    { allowed: false, reason: "content_not_validated" },
  );
  assert.deepEqual(
    await storage.createDownloadGrant(
      {
        ...base,
        validation: { ...base.validation, objectRevision: "revision-3" },
      },
      policy,
    ),
    { allowed: false, reason: "content_not_validated" },
  );
});

test("configuration rejects unsafe S3 endpoints", () => {
  assert.throws(
    () =>
      new EvidenceS3Storage({
        ...config,
        endpoint: "http://example.com",
      }),
    /HTTPS or a loopback HTTP origin/,
  );
  assert.throws(
    () =>
      new EvidenceS3Storage({
        ...config,
        endpoint: "https://access:secret@example.com",
      }),
    /HTTPS or a loopback HTTP origin/,
  );
});
