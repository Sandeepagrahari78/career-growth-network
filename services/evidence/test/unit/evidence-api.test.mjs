import assert from "node:assert/strict";
import test from "node:test";
import {
  EvidenceApiError,
  EvidenceProjectApiV1,
} from "../../dist/evidence-api.js";

const ownerId = "a2046ef2-bc0a-4f93-8ac0-517e3246c13d";
const otherOwnerId = "e9f332df-5725-426e-9b48-8211086c970d";
const evidenceId = "bb127d47-b7b9-430b-85df-60c263f2cb74";
const timestamp = "2026-10-24T12:00:00.000Z";

function context(accountId = ownerId) {
  return {
    contract: "cgn.identity.authorization-context.v1",
    accountId,
    evaluatedAt: timestamp,
    roles: ["student"],
  };
}

function record(overrides = {}) {
  return {
    evidenceId,
    ownerId,
    provenanceKind: "manual_claim",
    claimText: "Built a project",
    sourceReference: null,
    objectKey: null,
    objectRevision: null,
    objectChecksumSha256: null,
    objectContentType: null,
    objectSizeBytes: null,
    objectValidatedAt: null,
    verificationState: "unverified",
    visibility: "private",
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null,
    ...overrides,
  };
}

function fakeRepository(initial = []) {
  const records = new Map(initial.map((item) => [item.evidenceId, item]));
  const idempotency = new Map();
  const calls = { create: [], update: [], archive: [] };
  return {
    calls,
    records,
    async findByIdempotencyKey(owner, key) {
      const item = idempotency.get(owner + ":" + key);
      return item ?? null;
    },
    async create(input) {
      calls.create.push(input);
      const created = record({
        ownerId: input.ownerId,
        provenanceKind: input.provenanceKind,
        claimText: input.claimText,
        objectKey: input.objectKey ?? null,
        objectRevision: input.objectProof?.objectRevision ?? null,
        objectChecksumSha256: input.objectProof?.checksumSha256 ?? null,
        objectContentType: input.objectProof?.contentType ?? null,
        objectSizeBytes: input.objectProof?.sizeBytes ?? null,
        objectValidatedAt: input.objectProof?.validatedAt ?? null,
      });
      records.set(created.evidenceId, created);
      idempotency.set(input.ownerId + ":" + input.idempotencyKey, created);
      return created;
    },
    async findOwnedActive(owner, id) {
      const item = records.get(id);
      return item?.ownerId === owner && item.archivedAt === null ? item : null;
    },
    async updateManualClaimOwnedActive(input) {
      calls.update.push(input);
      const item = records.get(input.evidenceId);
      if (
        !item ||
        item.ownerId !== input.ownerId ||
        item.archivedAt !== null ||
        item.revision !== input.expectedRevision ||
        item.provenanceKind !== "manual_claim"
      ) {
        return null;
      }
      const updated = {
        ...item,
        claimText: input.claimText,
        revision: item.revision + 1,
      };
      records.set(item.evidenceId, updated);
      for (const [key, value] of idempotency) {
        if (value.evidenceId === item.evidenceId) idempotency.set(key, updated);
      }
      return updated;
    },
    async archiveOwnedActive(input) {
      calls.archive.push(input);
      const item = records.get(input.evidenceId);
      if (
        !item ||
        item.ownerId !== input.ownerId ||
        item.archivedAt !== null ||
        item.revision !== input.expectedRevision
      ) {
        return null;
      }
      const archived = {
        ...item,
        archivedAt: "2026-10-24T12:15:00.000Z",
        revision: item.revision + 1,
      };
      records.set(item.evidenceId, archived);
      for (const [key, value] of idempotency) {
        if (value.evidenceId === item.evidenceId)
          idempotency.set(key, archived);
      }
      return archived;
    },
  };
}

function createRequest(overrides = {}) {
  return {
    contract: "cgn.evidence-record-create.v1",
    idempotencyKey: "create-1",
    claimText: "Built a project",
    ...overrides,
  };
}

test("creates a private manual claim from a verified Identity account", async () => {
  const repository = fakeRepository();
  const api = new EvidenceProjectApiV1(repository);
  const result = await api.createManualProjectEvidence(
    context(),
    createRequest(),
  );

  assert.equal(result.contract, "cgn.evidence-record.v1");
  assert.equal(result.ownerId, ownerId);
  assert.equal(result.visibility, "private");
  assert.equal(result.verificationState, "unverified");
  assert.equal(result.hasValidatedPrivateObject, false);
  assert.equal("objectKey" in result, false);
  assert.equal(repository.calls.create[0].ownerId, ownerId);
});

test("repeated create returns the same record and rejects a changed payload", async () => {
  const repository = fakeRepository();
  const api = new EvidenceProjectApiV1(repository);
  const first = await api.createManualProjectEvidence(
    context(),
    createRequest(),
  );
  const second = await api.createManualProjectEvidence(
    context(),
    createRequest(),
  );

  assert.equal(second.evidenceId, first.evidenceId);
  assert.equal(repository.calls.create.length, 1);
  await assert.rejects(
    api.createManualProjectEvidence(
      context(),
      createRequest({ claimText: "Different project" }),
    ),
    (error) => error instanceof EvidenceApiError && error.code === "CONFLICT",
  );
});

test("requires a clean same-owner validation result for an attached object", async () => {
  const repository = fakeRepository();
  const validation = {
    state: "validated",
    ownerId,
    objectKey: "quarantine/file-a",
    objectRevision: "etag:revision-a",
    checksumSha256: "b".repeat(64),
    contentType: "application/pdf",
    sizeBytes: 456,
    malwareScan: "clean",
    validatedAt: timestamp,
  };
  const validator = {
    async validate(input) {
      assert.deepEqual(input, { ownerId, objectKey: "quarantine/file-a" });
      return validation;
    },
  };
  const api = new EvidenceProjectApiV1(repository, validator);
  const result = await api.createManualProjectEvidence(
    context(),
    createRequest({ objectKey: "quarantine/file-a" }),
  );

  assert.equal(result.hasValidatedPrivateObject, true);
  assert.equal(
    repository.calls.create[0].objectProof.objectRevision,
    validation.objectRevision,
  );
  assert.equal("objectKey" in result, false);
});

test("rejects missing, rejected, owner-mismatched and throwing object validators", async () => {
  const request = createRequest({ objectKey: "quarantine/file-a" });
  const noValidator = new EvidenceProjectApiV1(fakeRepository());
  await assert.rejects(
    noValidator.createManualProjectEvidence(context(), request),
    (error) =>
      error instanceof EvidenceApiError &&
      error.code === "OBJECT_NOT_VALIDATED" &&
      error.statusCode === 422,
  );

  for (const validator of [
    {
      async validate() {
        return { state: "rejected", reason: "suspicious_content" };
      },
    },
    {
      async validate() {
        return {
          state: "validated",
          ownerId: otherOwnerId,
          objectKey: "quarantine/file-a",
          objectRevision: "etag:revision-a",
          checksumSha256: "b".repeat(64),
          contentType: "application/pdf",
          sizeBytes: 456,
          malwareScan: "clean",
          validatedAt: timestamp,
        };
      },
    },
    {
      async validate() {
        throw new Error("storage secret and provider detail");
      },
    },
  ]) {
    const repository = fakeRepository();
    const api = new EvidenceProjectApiV1(repository, validator);
    await assert.rejects(
      api.createManualProjectEvidence(context(), request),
      (error) =>
        error instanceof EvidenceApiError &&
        error.code === "OBJECT_NOT_VALIDATED" &&
        !error.message.includes("storage secret"),
    );
    assert.equal(repository.calls.create.length, 0);
  }
});

test("updates claim text with optimistic concurrency and preserves provenance", async () => {
  const initial = record({
    provenanceKind: "manual_claim",
    claimText: "Original claim",
    objectKey: "quarantine/file-a",
    objectRevision: "etag:revision-a",
  });
  const repository = fakeRepository([initial]);
  const api = new EvidenceProjectApiV1(repository);
  const updated = await api.updateManualProjectEvidence(context(), evidenceId, {
    contract: "cgn.evidence-record-update.v1",
    expectedRevision: 1,
    claimText: "Updated claim",
  });

  assert.equal(updated.revision, 2);
  assert.equal(updated.claimText, "Updated claim");
  assert.equal(updated.provenanceKind, "manual_claim");
  assert.equal(
    repository.records.get(evidenceId).objectKey,
    "quarantine/file-a",
  );
  await assert.rejects(
    api.updateManualProjectEvidence(context(), evidenceId, {
      contract: "cgn.evidence-record-update.v1",
      expectedRevision: 2,
      claimText: "Try to change provenance",
      provenanceKind: "observed_source",
    }),
    (error) =>
      error instanceof EvidenceApiError &&
      error.code === "VALIDATION_ERROR" &&
      error.statusCode === 400,
  );
});

test("cross-owner edits are indistinguishable from missing records", async () => {
  const repository = fakeRepository([record()]);
  const api = new EvidenceProjectApiV1(repository);

  await assert.rejects(
    api.updateManualProjectEvidence(context(otherOwnerId), evidenceId, {
      contract: "cgn.evidence-record-update.v1",
      expectedRevision: 1,
      claimText: "Unauthorized edit",
    }),
    (error) => error instanceof EvidenceApiError && error.code === "NOT_FOUND",
  );
});

test("stale updates conflict and archive removes the record from active reads", async () => {
  const repository = fakeRepository([record({ revision: 2 })]);
  const api = new EvidenceProjectApiV1(repository);
  await assert.rejects(
    api.updateManualProjectEvidence(context(), evidenceId, {
      contract: "cgn.evidence-record-update.v1",
      expectedRevision: 1,
      claimText: "Stale edit",
    }),
    (error) => error instanceof EvidenceApiError && error.code === "CONFLICT",
  );

  const archived = await api.archiveProjectEvidence(context(), evidenceId, {
    contract: "cgn.evidence-record-archive.v1",
    expectedRevision: 2,
  });
  assert.notEqual(archived.archivedAt, null);
  assert.equal(archived.revision, 3);
  assert.equal("claimText" in archived, false);
  assert.equal(await repository.findOwnedActive(ownerId, evidenceId), null);
});

test("archived retries do not return the private record again", async () => {
  const repository = fakeRepository();
  const api = new EvidenceProjectApiV1(repository);
  await api.createManualProjectEvidence(context(), createRequest());
  await api.archiveProjectEvidence(context(), evidenceId, {
    contract: "cgn.evidence-record-archive.v1",
    expectedRevision: 1,
  });

  await assert.rejects(
    api.createManualProjectEvidence(context(), createRequest()),
    (error) => error instanceof EvidenceApiError && error.code === "NOT_FOUND",
  );
});

test("rejects missing or malformed Identity authorization context", async () => {
  const api = new EvidenceProjectApiV1(fakeRepository());
  await assert.rejects(
    api.createManualProjectEvidence(
      { ...context(), contract: "untrusted" },
      createRequest(),
    ),
    (error) =>
      error instanceof EvidenceApiError &&
      error.code === "UNAUTHENTICATED" &&
      error.statusCode === 401,
  );
});

test("repository failures use a generic error without exposing database details", async () => {
  const repository = fakeRepository();
  repository.findByIdempotencyKey = async () => {
    throw new Error("postgres password and connection string");
  };
  const api = new EvidenceProjectApiV1(repository);

  await assert.rejects(
    api.createManualProjectEvidence(context(), createRequest()),
    (error) =>
      error instanceof EvidenceApiError &&
      error.code === "INTERNAL_ERROR" &&
      error.statusCode === 500 &&
      !error.message.includes("password"),
  );
});
