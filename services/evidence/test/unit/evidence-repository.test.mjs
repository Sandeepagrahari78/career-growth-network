import assert from "node:assert/strict";
import test from "node:test";
import { EvidenceRepository } from "../../dist/evidence-repository.js";

const evidenceId = "bb127d47-b7b9-430b-85df-60c263f2cb74";
const createdAt = "2026-10-20T09:00:00.000Z";

function row(overrides = {}) {
  return {
    evidence_id: evidenceId,
    owner_id: "student-a",
    provenance_kind: "manual_claim",
    claim_text: "Built a project",
    source_reference: null,
    object_key: null,
    verification_state: "unverified",
    visibility: "private",
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

test("creates a manual claim as private and unverified", async () => {
  const capture = recordingDatabase([
    [row({ object_key: "objects/opaque-evidence-key" })],
  ]);
  const repository = new EvidenceRepository(capture.database);
  const record = await repository.create({
    ownerId: "student-a",
    provenanceKind: "manual_claim",
    claimText: "Built a project",
    objectKey: "objects/opaque-evidence-key",
  });

  assert.equal(record.visibility, "private");
  assert.equal(record.verificationState, "unverified");
  assert.equal(record.provenanceKind, "manual_claim");
  assert.equal(record.objectKey, "objects/opaque-evidence-key");
  assert.match(capture.statements[0].statement, /INSERT INTO evidence_records/);
  assert.deepEqual(capture.statements[0].values.slice(1), [
    "student-a",
    "manual_claim",
    "Built a project",
    null,
    "objects/opaque-evidence-key",
  ]);
});

test("creates an observed source separately from a manual claim", async () => {
  const capture = recordingDatabase([
    [
      row({
        provenance_kind: "observed_source",
        claim_text: null,
        source_reference: "github:repo/project/commit/abc123",
        object_key: "objects/source-snapshot",
      }),
    ],
  ]);
  const repository = new EvidenceRepository(capture.database);
  const record = await repository.create({
    ownerId: "student-a",
    provenanceKind: "observed_source",
    sourceReference: "github:repo/project/commit/abc123",
    objectKey: "objects/source-snapshot",
  });

  assert.equal(record.provenanceKind, "observed_source");
  assert.equal(record.sourceReference, "github:repo/project/commit/abc123");
  assert.equal(record.visibility, "private");
  assert.equal(capture.statements[0].values[2], "observed_source");
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

test("archive is owner-scoped and reports whether an active row changed", async () => {
  const capture = recordingDatabase([[{ evidence_id: evidenceId }], []]);
  const repository = new EvidenceRepository(capture.database);

  assert.equal(
    await repository.archiveOwnedActive("student-a", evidenceId),
    true,
  );
  assert.equal(
    await repository.archiveOwnedActive("student-b", evidenceId),
    false,
  );
  assert.match(capture.statements[0].statement, /owner_id = \$2/);
  assert.match(capture.statements[0].statement, /archived_at IS NULL/);
  assert.deepEqual(capture.statements[0].values, [evidenceId, "student-a"]);
});

test("rejects malformed evidence IDs before querying PostgreSQL", async () => {
  const capture = recordingDatabase();
  const repository = new EvidenceRepository(capture.database);

  await assert.rejects(
    repository.findOwnedActive("student-a", "not-a-uuid"),
    /evidenceId must be a UUID/,
  );
  await assert.rejects(
    repository.archiveOwnedActive("student-a", "not-a-uuid"),
    /evidenceId must be a UUID/,
  );
  assert.equal(capture.statements.length, 0);
});

test("rejects empty claims, sources, owners and public object URLs", async () => {
  const capture = recordingDatabase();
  const repository = new EvidenceRepository(capture.database);

  await assert.rejects(
    repository.create({
      ownerId: "student-a",
      provenanceKind: "manual_claim",
      claimText: "   ",
    }),
    /claimText/,
  );
  await assert.rejects(
    repository.create({
      ownerId: "student-a",
      provenanceKind: "observed_source",
      sourceReference: "",
    }),
    /sourceReference/,
  );
  await assert.rejects(
    repository.create({
      ownerId: " ",
      provenanceKind: "manual_claim",
      claimText: "A claim",
    }),
    /ownerId/,
  );
  await assert.rejects(
    repository.create({
      ownerId: "student-a",
      provenanceKind: "manual_claim",
      claimText: "A claim",
      objectKey: "https://bucket.example/signed/object?token=secret",
    }),
    /opaque private reference/,
  );
  await assert.rejects(
    repository.create({
      ownerId: "student-a",
      provenanceKind: "manual_claim",
      claimText: "A claim",
      objectKey: "//bucket.example/object",
    }),
    /opaque private reference/,
  );
  await assert.rejects(
    repository.create({
      ownerId: "student-a",
      provenanceKind: "manual_claim",
      claimText: "A claim",
      objectKey: "s3:bucket/object",
    }),
    /opaque private reference/,
  );
  assert.equal(capture.statements.length, 0);
});
