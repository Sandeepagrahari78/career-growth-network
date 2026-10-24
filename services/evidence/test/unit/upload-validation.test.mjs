import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  authorizeEvidenceDownload,
  authorizeEvidenceUpload,
  validateUploadedEvidence,
} from "../../dist/upload-validation.js";

const policy = JSON.parse(
  readFileSync(
    new URL("../../config/evidence-upload-policy.v1.json", import.meta.url),
    "utf8",
  ),
);
const now = new Date("2026-10-24T12:00:00.000Z");
const checksumSha256 = "a".repeat(64);
const pdfSignature = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

function uploadInput(overrides = {}) {
  return {
    principalId: "student-a",
    ownerId: "student-a",
    fileName: "proof.pdf",
    declaredContentType: "application/pdf",
    declaredSizeBytes: 5,
    now,
    ...overrides,
  };
}

function inspection(overrides = {}) {
  return {
    ownerId: "student-a",
    objectRevision: "revision-3",
    checksumSha256,
    contentLengthBytes: 5,
    storedContentType: "application/pdf",
    signaturePrefix: pdfSignature,
    visibility: "private",
    quarantineState: "quarantined",
    ...overrides,
  };
}

function uploadedObject(overrides = {}) {
  return {
    ...uploadInput(),
    objectKey: "objects/opaque-proof-key",
    uploadUrlExpiresAt: "2026-10-24T12:05:00.000Z",
    scanTimeoutMs: 100,
    inspectQuarantinedObject: async () => inspection(),
    scanner: { scan: async () => "clean" },
    ...overrides,
  };
}

test("upload authorization uses configured TTL, checks owner and starts private quarantine", () => {
  const result = authorizeEvidenceUpload(uploadInput(), policy);

  assert.deepEqual(result, {
    allowed: true,
    ownerId: "student-a",
    fileName: "proof.pdf",
    contentType: "application/pdf",
    declaredSizeBytes: 5,
    objectVisibility: "private",
    validationState: "quarantined",
    expiresAt: "2026-10-24T12:05:00.000Z",
  });

  assert.equal(
    authorizeEvidenceUpload(uploadInput({ principalId: "student-b" }), policy)
      .reason,
    "owner_mismatch",
  );
  assert.equal(
    authorizeEvidenceUpload(
      uploadInput({ declaredSizeBytes: policy.maxFileSizeBytes + 1 }),
      policy,
    ).reason,
    "declared_size_exceeded",
  );
  assert.equal(
    authorizeEvidenceUpload(uploadInput({ declaredSizeBytes: 0 }), policy)
      .reason,
    "invalid_declared_size",
  );
});

test("upload authorization allows only matched PDF, JPEG and PNG extensions and MIME types", () => {
  for (const [fileName, declaredContentType] of [
    ["a.pdf", "application/pdf"],
    ["a.jpg", "image/jpeg"],
    ["a.jpeg", "image/jpeg"],
    ["a.png", "image/png"],
  ]) {
    assert.equal(
      authorizeEvidenceUpload(
        uploadInput({ fileName, declaredContentType }),
        policy,
      ).allowed,
      true,
    );
  }

  for (const changes of [
    { fileName: "proof.exe", declaredContentType: "application/pdf" },
    { fileName: "proof.pdf", declaredContentType: "image/png" },
    {
      fileName: "proof.pdf",
      declaredContentType: "application/pdf; spoofed=1",
    },
  ]) {
    assert.equal(
      authorizeEvidenceUpload(uploadInput(changes), policy).reason,
      "unsupported_file_type",
    );
  }
});

test("upload thresholds come from the supplied policy and invalid policy fails closed", () => {
  const reducedPolicy = {
    ...policy,
    maxFileSizeBytes: 4,
    signedUploadUrlTtlSeconds: 120,
  };
  const tooLarge = authorizeEvidenceUpload(uploadInput(), reducedPolicy);
  assert.deepEqual(tooLarge, {
    allowed: false,
    reason: "declared_size_exceeded",
  });

  const shorterTtl = authorizeEvidenceUpload(
    uploadInput({ declaredSizeBytes: 4 }),
    reducedPolicy,
  );
  assert.equal(shorterTtl.expiresAt, "2026-10-24T12:02:00.000Z");

  const unsafePolicy = { ...policy, scannerFailureMode: "fail_open" };
  assert.deepEqual(authorizeEvidenceUpload(uploadInput(), unsafePolicy), {
    allowed: false,
    reason: "invalid_policy",
  });
});

test("post-upload validation requires actual private quarantined bytes and a clean scan", async () => {
  let scanRequest;
  const result = await validateUploadedEvidence(
    uploadedObject({
      scanner: {
        async scan(request) {
          scanRequest = request;
          return "clean";
        },
      },
    }),
    policy,
  );

  assert.equal(result.state, "validated");
  assert.equal(result.ownerId, "student-a");
  assert.equal(result.objectRevision, "revision-3");
  assert.equal(result.checksumSha256, checksumSha256);
  assert.equal(result.contentType, "application/pdf");
  assert.equal(result.sizeBytes, 5);
  assert.equal(result.malwareScan, "clean");
  assert.equal(scanRequest.objectRevision, "revision-3");
  assert.equal(scanRequest.checksumSha256, checksumSha256);
});

test("post-upload signature inspection recognizes JPEG and PNG only by their file signatures", async () => {
  for (const [fileName, declaredContentType, signaturePrefix, sizeBytes] of [
    ["proof.jpg", "image/jpeg", new Uint8Array([0xff, 0xd8, 0xff]), 3],
    [
      "proof.png",
      "image/png",
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      8,
    ],
  ]) {
    const result = await validateUploadedEvidence(
      uploadedObject({
        fileName,
        declaredContentType,
        declaredSizeBytes: sizeBytes,
        inspectQuarantinedObject: async () =>
          inspection({
            signaturePrefix,
            storedContentType: declaredContentType,
            contentLengthBytes: sizeBytes,
          }),
      }),
      policy,
    );
    assert.equal(result.state, "validated");
    assert.equal(result.contentType, declaredContentType);
  }
});

test("post-upload validation rejects spoofed signatures before invoking the scanner", async () => {
  let scannerCalled = false;
  const result = await validateUploadedEvidence(
    uploadedObject({
      fileName: "proof.pdf",
      declaredContentType: "application/pdf",
      inspectQuarantinedObject: async () =>
        inspection({
          signaturePrefix: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        }),
      scanner: {
        async scan() {
          scannerCalled = true;
          return "clean";
        },
      },
    }),
    policy,
  );

  assert.deepEqual(result, {
    state: "rejected",
    reason: "unsupported_file_type",
  });
  assert.equal(scannerCalled, false);
});

test("post-upload validation rejects mismatched stored MIME and object owner metadata", async () => {
  const storedMimeMismatch = await validateUploadedEvidence(
    uploadedObject({
      inspectQuarantinedObject: async () =>
        inspection({ storedContentType: "image/png" }),
    }),
    policy,
  );
  assert.deepEqual(storedMimeMismatch, {
    state: "rejected",
    reason: "unsupported_file_type",
  });

  const objectOwnerMismatch = await validateUploadedEvidence(
    uploadedObject({
      inspectQuarantinedObject: async () =>
        inspection({ ownerId: "student-b" }),
    }),
    policy,
  );
  assert.deepEqual(objectOwnerMismatch, {
    state: "rejected",
    reason: "owner_mismatch",
  });
});

test("post-upload validation rechecks measured size and rejects mismatches", async () => {
  const tooLarge = await validateUploadedEvidence(
    uploadedObject({
      inspectQuarantinedObject: async () =>
        inspection({ contentLengthBytes: policy.maxFileSizeBytes + 1 }),
    }),
    policy,
  );
  assert.deepEqual(tooLarge, {
    state: "rejected",
    reason: "actual_size_exceeded",
  });

  const mismatched = await validateUploadedEvidence(
    uploadedObject({
      declaredSizeBytes: 4,
      inspectQuarantinedObject: async () =>
        inspection({ contentLengthBytes: 5 }),
    }),
    policy,
  );
  assert.deepEqual(mismatched, {
    state: "rejected",
    reason: "actual_size_mismatch",
  });
});

test("post-upload validation rejects wrong owners, expired uploads and inspection failures", async () => {
  const wrongOwner = await validateUploadedEvidence(
    uploadedObject({ principalId: "student-b" }),
    policy,
  );
  assert.deepEqual(wrongOwner, {
    state: "rejected",
    reason: "owner_mismatch",
  });

  const expired = await validateUploadedEvidence(
    uploadedObject({ uploadUrlExpiresAt: "2026-10-24T11:59:59.999Z" }),
    policy,
  );
  assert.deepEqual(expired, { state: "rejected", reason: "upload_expired" });

  const inspectionFailed = await validateUploadedEvidence(
    uploadedObject({
      inspectQuarantinedObject: async () => {
        throw new Error("storage unavailable");
      },
    }),
    policy,
  );
  assert.deepEqual(inspectionFailed, {
    state: "rejected",
    reason: "object_inspection_failed",
  });
});

test("post-upload validation rejects public or already released objects", async () => {
  for (const [actual, expectedReason] of [
    [inspection({ visibility: "public" }), "object_not_private"],
    [inspection({ quarantineState: "released" }), "object_not_quarantined"],
  ]) {
    const result = await validateUploadedEvidence(
      uploadedObject({ inspectQuarantinedObject: async () => actual }),
      policy,
    );
    assert.deepEqual(result, { state: "rejected", reason: expectedReason });
  }
});

test("scanner suspicious, unavailable and error outcomes all fail closed", async () => {
  for (const [scanner, expectedReason] of [
    [{ scan: async () => "suspicious" }, "suspicious_content"],
    [{ scan: async () => "unavailable" }, "scanner_unavailable"],
    [
      {
        scan: async () => {
          throw new Error("scanner error");
        },
      },
      "scanner_error",
    ],
  ]) {
    const result = await validateUploadedEvidence(
      uploadedObject({ scanner }),
      policy,
    );
    assert.deepEqual(result, { state: "rejected", reason: expectedReason });
  }

  const unavailable = await validateUploadedEvidence(
    uploadedObject({ scanner: undefined }),
    policy,
  );
  assert.deepEqual(unavailable, {
    state: "rejected",
    reason: "scanner_unavailable",
  });
});

test("scanner timeout aborts the scan and cannot validate the object", async () => {
  let aborted = false;
  const result = await validateUploadedEvidence(
    uploadedObject({
      scanTimeoutMs: 5,
      scanner: {
        scan({ signal }) {
          signal.addEventListener("abort", () => {
            aborted = true;
          });
          return new Promise(() => {});
        },
      },
    }),
    policy,
  );

  assert.deepEqual(result, { state: "rejected", reason: "scanner_timeout" });
  assert.equal(aborted, true);
});

test("download authorization is owner-scoped, private, scan-gated and short-lived", () => {
  const input = {
    principalId: "student-a",
    ownerId: "student-a",
    objectVisibility: "private",
    validation: {
      state: "validated",
      malwareScan: "clean",
      objectRevision: "revision-3",
      checksumSha256,
    },
    now,
  };
  const allowed = authorizeEvidenceDownload(input, policy);
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.expiresAt, "2026-10-24T12:01:00.000Z");
  assert.equal(allowed.objectRevision, "revision-3");

  assert.equal(
    authorizeEvidenceDownload({ ...input, principalId: "student-b" }, policy)
      .reason,
    "owner_mismatch",
  );
  assert.equal(
    authorizeEvidenceDownload({ ...input, objectVisibility: "public" }, policy)
      .reason,
    "object_not_private",
  );
  assert.equal(
    authorizeEvidenceDownload(
      {
        ...input,
        validation: { state: "quarantined" },
      },
      policy,
    ).reason,
    "content_not_validated",
  );
  assert.equal(
    authorizeEvidenceDownload(
      {
        ...input,
        validation: {
          ...input.validation,
          malwareScan: "suspicious",
        },
      },
      policy,
    ).reason,
    "content_not_validated",
  );
});
