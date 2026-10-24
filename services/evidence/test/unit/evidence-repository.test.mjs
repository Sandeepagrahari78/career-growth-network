import assert from "node:assert/strict";
import test from "node:test";
import {
  EvidenceIdempotencyConflictError,
  EvidenceRepository,
} from "../../dist/evidence-repository.js";

const evidenceId = "bb127d47-b7b9-430b-85df-60c263f2cb74";
const createdAt = "2026-10-20T09:00:00.000Z";
const proof = {
  objectRevision: "etag:opaque-revision",
  checksumSha256: "a".repeat(64),
  contentType: "application/pdf",
  sizeBytes: 128,
  validatedAt: createdAt,
};

function row(overrides = {}) {
  return {
    evidence_id: evidenceId,
    owner_id: "student-a",
    provenance_kind: "manual_claim",
    claim_text: "Built a project",
    source_reference: null,
    object_key: null,
    object_revision: null,
    object_checksum_sha256: null,
    object_content_type: null,
    object_size_bytes: null,
    object_validated_at: null,
    verification_state: "unverified",
    visibility: "private",
    revision: 1,
    created_at: createdAt,
    updated_at: createdAt,
    archived_at: null,
    ...overrides,
  };
}

function recordingDatabase(responses = []) {
  const statements = [];
  return {
    statements,
    database: {
      async query(statement, values = []) {
        statements.push({ statement, values });
        return { rows: responses.shift() ?? [] };
      },
    },
  };
}

test("creates a private unverified manual claim with idempotency", async () => {
  const capture = recordingDatabase([[row()]]);
  const repository = new EvidenceRepository(capture.database);
  const record = await repository.create({
    ownerId: "student-a",
    idempotencyKey: "request-1",
    provenanceKind: "manual_claim",
    claimText: "Built a project",
  });

  assert.equal(record.visibility, "private");
  assert.equal(record.verificationState, "unverified");
  assert.equal(record.provenanceKind, "manual_claim");
  assert.equal(record.revision, 1);
  assert.match(capture.statements[0].statement, /INSERT INTO evidence_records/);
  assert.match(capture.statements[0].statement, /ON CONFLICT/);
  assert.equal(capture.statements[0].values[1], "student-a");
  assert.equal(capture.statements[0].values[2], "manual_claim");
  assert.equal(capture.statements[0].values[11], "request-1");
});

test("persists the validated object revision and checksum without exposing a URL", async () => {
  const capture = recordingDatabase([
    [
      row({
        object_key: "quarantine/opaque-key",
        object_revision: proof.objectRevision,
        object_checksum_sha256: proof.checksumSha256,
        object_content_type: proof.contentType,
        object_size_bytes: proof.sizeBytes,
        object_validated_at: proof.validatedAt,
      }),
    ],
  ]);
  const repository = new EvidenceRepository(capture.database);
  const record = await repository.create({
    ownerId: "student-a",
    idempotencyKey: "request-object-1",
    provenanceKind: "manual_claim",
    claimText: "Built a project",
    objectKey: "quarantine/opaque-key",
    objectProof: proof,
  });

  assert.equal(record.objectRevision, proof.objectRevision);
  assert.equal(record.objectChecksumSha256, proof.checksumSha256);
  assert.equal(record.objectValidatedAt, proof.validatedAt);
  assert.equal(capture.statements[0].values[6], proof.objectRevision);
  assert.equal(capture.statements[0].values[7], proof.checksumSha256);
  assert.equal(capture.statements[0].values[10], proof.validatedAt);
});

test("creates an observed source separately from a manual claim", async () => {
  const capture = recordingDatabase([
    [
      row({
        provenance_kind: "observed_source",
        claim_text: null,
        source_reference: "github:repo/project/commit/abc123",
      }),
    ],
  ]);
  const repository = new EvidenceRepository(capture.database);
  const record = await repository.create({
    ownerId: "student-a",
    idempotencyKey: "request-2",
    provenanceKind: "observed_source",
    sourceReference: "github:repo/project/commit/abc123",
  });

  assert.equal(record.provenanceKind, "observed_source");
  assert.equal(record.sourceReference, "github:repo/project/commit/abc123");
  assert.equal(record.visibility, "private");
});

test("same idempotency key and payload returns the existing record", async () => {
  const existing = row({ create_idempotency_key: "request-3" });
  const capture = recordingDatabase([[], [existing]]);
  const repository = new EvidenceRepository(capture.database);
  const record = await repository.create({
    ownerId: "student-a",
    idempotencyKey: "request-3",
    provenanceKind: "manual_claim",
    claimText: "Built a project",
  });

  assert.equal(record.evidenceId, evidenceId);
  assert.equal(capture.statements.length, 2);
  assert.deepEqual(capture.statements[1].values, ["student-a", "request-3"]);
});

test("observed-source idempotency compares its source reference", async () => {
  const sourceReference = "github:repo/project/commit/abc123";
  const existing = row({
    provenance_kind: "observed_source",
    claim_text: null,
    source_reference: sourceReference,
  });
  const capture = recordingDatabase([[], [existing]]);
  const repository = new EvidenceRepository(capture.database);
  const record = await repository.create({
    ownerId: "student-a",
    idempotencyKey: "observed-replay",
    provenanceKind: "observed_source",
    sourceReference,
  });

  assert.equal(record.evidenceId, evidenceId);
  assert.equal(record.sourceReference, sourceReference);
  assert.equal(capture.statements.length, 2);
});

test("same idempotency key with a different payload conflicts", async () => {
  const capture = recordingDatabase([
    [],
    [row({ claim_text: "Different project" })],
  ]);
  const repository = new EvidenceRepository(capture.database);

  await assert.rejects(
    repository.create({
      ownerId: "student-a",
      idempotencyKey: "request-4",
      provenanceKind: "manual_claim",
      claimText: "Built a project",
    }),
    EvidenceIdempotencyConflictError,
  );
});

test("owner-scoped reads exclude archived records", async () => {
  const capture = recordingDatabase([[]]);
  const repository = new EvidenceRepository(capture.database);
  const record = await repository.findOwnedActive("student-b", evidenceId);

  assert.equal(record, null);
  assert.match(capture.statements[0].statement, /owner_id = \$1/);
  assert.match(capture.statements[0].statement, /evidence_id = \$2::uuid/);
  assert.match(capture.statements[0].statement, /archived_at IS NULL/);
  assert.deepEqual(capture.statements[0].values, ["student-b", evidenceId]);
});

test("updates only manual claim text and uses an expected revision", async () => {
  const capture = recordingDatabase([
    [row({ claim_text: "Updated claim", revision: 2 })],
  ]);
  const repository = new EvidenceRepository(capture.database);
  const record = await repository.updateManualClaimOwnedActive({
    ownerId: "student-a",
    evidenceId,
    expectedRevision: 1,
    claimText: "Updated claim",
  });

  assert.equal(record?.revision, 2);
  assert.equal(record?.provenanceKind, "manual_claim");
  assert.equal(record?.sourceReference, null);
  assert.match(capture.statements[0].statement, /owner_id = \$2/);
  assert.match(capture.statements[0].statement, /revision = \$3/);
  assert.match(
    capture.statements[0].statement,
    /provenance_kind = 'manual_claim'/,
  );
  assert.deepEqual(capture.statements[0].values, [
    evidenceId,
    "student-a",
    1,
    "Updated claim",
  ]);
});

test("a stale revision cannot update an active record", async () => {
  const capture = recordingDatabase([[]]);
  const repository = new EvidenceRepository(capture.database);
  const record = await repository.updateManualClaimOwnedActive({
    ownerId: "student-a",
    evidenceId,
    expectedRevision: 1,
    claimText: "Stale edit",
  });

  assert.equal(record, null);
});

test("archive is owner-scoped, revision-checked and increments the revision", async () => {
  const capture = recordingDatabase([
    [row({ revision: 2, archived_at: "2026-10-20T10:00:00.000Z" })],
    [],
  ]);
  const repository = new EvidenceRepository(capture.database);
  const archived = await repository.archiveOwnedActive({
    ownerId: "student-a",
    evidenceId,
    expectedRevision: 1,
  });
  const otherOwner = await repository.archiveOwnedActive({
    ownerId: "student-b",
    evidenceId,
    expectedRevision: 1,
  });

  assert.equal(archived?.revision, 2);
  assert.notEqual(archived?.archivedAt, null);
  assert.equal(otherOwner, null);
  assert.match(capture.statements[0].statement, /owner_id = \$2/);
  assert.match(capture.statements[0].statement, /revision = \$3/);
  assert.match(capture.statements[0].statement, /archived_at IS NULL/);
});

test("object references require complete clean-scan validation metadata", async () => {
  const capture = recordingDatabase();
  const repository = new EvidenceRepository(capture.database);

  await assert.rejects(
    repository.create({
      ownerId: "student-a",
      idempotencyKey: "request-invalid-object",
      provenanceKind: "manual_claim",
      claimText: "A claim",
      objectKey: "quarantine/opaque-key",
    }),
    /server-side validation proof/,
  );
  await assert.rejects(
    repository.create({
      ownerId: "student-a",
      idempotencyKey: "request-invalid-proof",
      provenanceKind: "manual_claim",
      claimText: "A claim",
      objectKey: "quarantine/opaque-key",
      objectProof: { ...proof, sizeBytes: 0 },
    }),
    /server-side validation proof/,
  );
  assert.equal(capture.statements.length, 0);
});

test("rejects malformed IDs, revisions, keys and unsafe object URLs before SQL", async () => {
  const capture = recordingDatabase();
  const repository = new EvidenceRepository(capture.database);

  await assert.rejects(
    repository.findOwnedActive("student-a", "not-a-uuid"),
    /evidenceId must be a UUID/,
  );
  await assert.rejects(
    repository.archiveOwnedActive({
      ownerId: "student-a",
      evidenceId,
      expectedRevision: 0,
    }),
    /expectedRevision/,
  );
  await assert.rejects(
    repository.create({
      ownerId: "student-a",
      idempotencyKey: "bad key",
      provenanceKind: "manual_claim",
      claimText: "A claim",
    }),
    /idempotencyKey/,
  );
  await assert.rejects(
    repository.create({
      ownerId: "student-a",
      idempotencyKey: "request-url",
      provenanceKind: "manual_claim",
      claimText: "A claim",
      objectKey: "https://bucket.example/signed/object?token=secret",
      objectProof: proof,
    }),
    /opaque private reference/,
  );
  assert.equal(capture.statements.length, 0);
});
