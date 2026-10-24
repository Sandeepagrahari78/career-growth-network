import { randomUUID } from "node:crypto";
import type { EvidenceContentTypeV1 } from "@cgn/contracts";

export type EvidenceProvenanceKind = "manual_claim" | "observed_source";
export type EvidenceVerificationState = "unverified" | "verified";

export interface EvidenceSqlExecutor {
  query(statement: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}

export interface EvidenceObjectValidationProof {
  objectRevision: string;
  checksumSha256: string;
  contentType: EvidenceContentTypeV1;
  sizeBytes: number;
  validatedAt: string;
}

interface CreateEvidenceBase {
  ownerId: string;
  idempotencyKey: string;
  objectKey?: string;
  objectProof?: EvidenceObjectValidationProof;
}

export interface CreateManualClaimInput extends CreateEvidenceBase {
  provenanceKind: "manual_claim";
  claimText: string;
}

export interface CreateObservedSourceInput extends CreateEvidenceBase {
  provenanceKind: "observed_source";
  sourceReference: string;
  claimText?: string;
}

export type CreateEvidenceInput =
  | CreateManualClaimInput
  | CreateObservedSourceInput;

export interface EvidenceRecord {
  evidenceId: string;
  ownerId: string;
  provenanceKind: EvidenceProvenanceKind;
  claimText: string | null;
  sourceReference: string | null;
  objectKey: string | null;
  objectRevision: string | null;
  objectChecksumSha256: string | null;
  objectContentType: EvidenceContentTypeV1 | null;
  objectSizeBytes: number | null;
  objectValidatedAt: string | null;
  verificationState: EvidenceVerificationState;
  visibility: "private";
  revision: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

interface EvidenceRow extends Record<string, unknown> {
  evidence_id: string;
  owner_id: string;
  provenance_kind: EvidenceProvenanceKind;
  claim_text: string | null;
  source_reference: string | null;
  object_key: string | null;
  object_revision: string | null;
  object_checksum_sha256: string | null;
  object_content_type: EvidenceContentTypeV1 | null;
  object_size_bytes: number | string | null;
  object_validated_at: Date | string | null;
  verification_state: EvidenceVerificationState;
  visibility: "private";
  revision: number | string;
  created_at: Date | string;
  updated_at: Date | string;
  archived_at: Date | string | null;
}

export class EvidenceIdempotencyConflictError extends Error {
  constructor() {
    super("The idempotency key was already used for a different request.");
    this.name = "EvidenceIdempotencyConflictError";
  }
}

const RETURNING_FIELDS = [
  "evidence_id",
  "owner_id",
  "provenance_kind",
  "claim_text",
  "source_reference",
  "object_key",
  "object_revision",
  "object_checksum_sha256",
  "object_content_type",
  "object_size_bytes",
  "object_validated_at",
  "verification_state",
  "visibility",
  "revision",
  "created_at",
  "updated_at",
  "archived_at",
].join(", ");

const CREATE_EVIDENCE_SQL = [
  "INSERT INTO evidence_records",
  "(evidence_id, owner_id, provenance_kind, claim_text, source_reference, object_key,",
  "object_revision, object_checksum_sha256, object_content_type, object_size_bytes,",
  "object_validated_at, create_idempotency_key)",
  "VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
  "ON CONFLICT (owner_id, create_idempotency_key)",
  "WHERE create_idempotency_key IS NOT NULL DO NOTHING",
  "RETURNING " + RETURNING_FIELDS,
].join(" ");

const FIND_OWNED_ACTIVE_SQL = [
  "SELECT " + RETURNING_FIELDS,
  "FROM evidence_records",
  "WHERE owner_id = $1 AND evidence_id = $2::uuid AND archived_at IS NULL",
  "LIMIT 1",
].join(" ");

const FIND_IDEMPOTENCY_SQL = [
  "SELECT " + RETURNING_FIELDS,
  "FROM evidence_records",
  "WHERE owner_id = $1 AND create_idempotency_key = $2",
  "LIMIT 1",
].join(" ");

const UPDATE_OWNED_ACTIVE_SQL = [
  "UPDATE evidence_records",
  "SET claim_text = $4, revision = revision + 1, updated_at = clock_timestamp()",
  "WHERE evidence_id = $1::uuid AND owner_id = $2 AND revision = $3",
  "AND provenance_kind = 'manual_claim' AND archived_at IS NULL",
  "RETURNING " + RETURNING_FIELDS,
].join(" ");

const ARCHIVE_OWNED_ACTIVE_SQL = [
  "UPDATE evidence_records",
  "SET archived_at = clock_timestamp(), updated_at = clock_timestamp(),",
  "revision = revision + 1",
  "WHERE evidence_id = $1::uuid AND owner_id = $2 AND revision = $3",
  "AND archived_at IS NULL",
  "RETURNING " + RETURNING_FIELDS,
].join(" ");

function nonEmpty(value: string, field: string): void {
  if (value.trim().length === 0 || value !== value.trim()) {
    throw new TypeError(field + " must be a non-empty trimmed string.");
  }
}

function validateEvidenceId(evidenceId: string): void {
  nonEmpty(evidenceId, "evidenceId");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      evidenceId,
    )
  ) {
    throw new TypeError("evidenceId must be a UUID.");
  }
}

function validateRevision(revision: number): void {
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new TypeError("expectedRevision must be a positive safe integer.");
  }
}

function validateIdempotencyKey(key: string): void {
  if (!/^[A-Za-z0-9._~:-]{1,128}$/.test(key)) {
    throw new TypeError("idempotencyKey is invalid.");
  }
}

function validateObjectKey(objectKey: string | undefined): void {
  if (objectKey === undefined) return;
  nonEmpty(objectKey, "objectKey");
  if (/^(?:\/\/|[a-z][a-z0-9+.-]*:)/i.test(objectKey)) {
    throw new TypeError(
      "objectKey must be an opaque private reference, not a URL.",
    );
  }
}

function validateObjectProof(
  objectKey: string | undefined,
  proof: EvidenceObjectValidationProof | undefined,
): void {
  if (objectKey === undefined) {
    if (proof !== undefined) {
      throw new TypeError("objectProof requires an objectKey.");
    }
    return;
  }
  if (
    !proof ||
    typeof proof.objectRevision !== "string" ||
    proof.objectRevision.trim().length === 0 ||
    !/^[0-9a-f]{64}$/.test(proof.checksumSha256) ||
    !["application/pdf", "image/jpeg", "image/png"].includes(
      proof.contentType,
    ) ||
    !Number.isSafeInteger(proof.sizeBytes) ||
    proof.sizeBytes < 1 ||
    proof.sizeBytes > 10 * 1024 * 1024 ||
    typeof proof.validatedAt !== "string" ||
    !Number.isFinite(Date.parse(proof.validatedAt))
  ) {
    throw new TypeError(
      "objectKey requires a valid server-side validation proof.",
    );
  }
}

function asEvidenceRow(value: unknown): EvidenceRow {
  return value as EvidenceRow;
}

function iso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function nullableIso(value: Date | string | null): string | null {
  return value === null ? null : iso(value);
}

function safeInteger(value: number | string, field: string): number {
  const result = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(result) || result < 1) {
    throw new TypeError(field + " returned an invalid database value.");
  }
  return result;
}

function toRecord(row: EvidenceRow): EvidenceRecord {
  return {
    evidenceId: row.evidence_id,
    ownerId: row.owner_id,
    provenanceKind: row.provenance_kind,
    claimText: row.claim_text,
    sourceReference: row.source_reference,
    objectKey: row.object_key,
    objectRevision: row.object_revision,
    objectChecksumSha256: row.object_checksum_sha256,
    objectContentType: row.object_content_type,
    objectSizeBytes:
      row.object_size_bytes === null
        ? null
        : safeInteger(row.object_size_bytes, "objectSizeBytes"),
    objectValidatedAt: nullableIso(row.object_validated_at),
    verificationState: row.verification_state,
    visibility: row.visibility,
    revision: safeInteger(row.revision, "revision"),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    archivedAt: nullableIso(row.archived_at),
  };
}

function createRequestMatches(
  record: EvidenceRecord,
  input: CreateEvidenceInput,
): boolean {
  return (
    record.provenanceKind === input.provenanceKind &&
    record.claimText === (input.claimText ?? null) &&
    record.sourceReference === (input.sourceReference ?? null) &&
    record.objectKey === (input.objectKey ?? null)
  );
}

export class EvidenceRepository {
  constructor(private readonly database: EvidenceSqlExecutor) {}

  async create(input: CreateEvidenceInput): Promise<EvidenceRecord> {
    nonEmpty(input.ownerId, "ownerId");
    validateIdempotencyKey(input.idempotencyKey);
    validateObjectKey(input.objectKey);
    validateObjectProof(input.objectKey, input.objectProof);

    let claimText: string | null = null;
    let sourceReference: string | null = null;

    if (input.provenanceKind === "manual_claim") {
      nonEmpty(input.claimText, "claimText");
      claimText = input.claimText;
    } else {
      nonEmpty(input.sourceReference, "sourceReference");
      sourceReference = input.sourceReference;
      if (input.claimText !== undefined) {
        nonEmpty(input.claimText, "claimText");
        claimText = input.claimText;
      }
    }

    const proof = input.objectProof;
    const result = await this.database.query(CREATE_EVIDENCE_SQL, [
      randomUUID(),
      input.ownerId,
      input.provenanceKind,
      claimText,
      sourceReference,
      input.objectKey ?? null,
      proof?.objectRevision ?? null,
      proof?.checksumSha256 ?? null,
      proof?.contentType ?? null,
      proof?.sizeBytes ?? null,
      proof?.validatedAt ?? null,
      input.idempotencyKey,
    ]);
    const row = result.rows[0];
    if (row) return toRecord(asEvidenceRow(row));

    const existing = await this.findByIdempotencyKey(
      input.ownerId,
      input.idempotencyKey,
    );
    if (existing && createRequestMatches(existing, input)) return existing;
    if (existing) throw new EvidenceIdempotencyConflictError();
    throw new Error("Evidence insert returned no record.");
  }

  async findByIdempotencyKey(
    ownerId: string,
    idempotencyKey: string,
  ): Promise<EvidenceRecord | null> {
    nonEmpty(ownerId, "ownerId");
    validateIdempotencyKey(idempotencyKey);
    const result = await this.database.query(FIND_IDEMPOTENCY_SQL, [
      ownerId,
      idempotencyKey,
    ]);
    const row = result.rows[0];
    return row ? toRecord(asEvidenceRow(row)) : null;
  }

  async findOwnedActive(
    ownerId: string,
    evidenceId: string,
  ): Promise<EvidenceRecord | null> {
    nonEmpty(ownerId, "ownerId");
    validateEvidenceId(evidenceId);
    const result = await this.database.query(FIND_OWNED_ACTIVE_SQL, [
      ownerId,
      evidenceId,
    ]);
    const row = result.rows[0];
    return row ? toRecord(asEvidenceRow(row)) : null;
  }

  async updateManualClaimOwnedActive(input: {
    ownerId: string;
    evidenceId: string;
    expectedRevision: number;
    claimText: string;
  }): Promise<EvidenceRecord | null> {
    nonEmpty(input.ownerId, "ownerId");
    validateEvidenceId(input.evidenceId);
    validateRevision(input.expectedRevision);
    nonEmpty(input.claimText, "claimText");
    const result = await this.database.query(UPDATE_OWNED_ACTIVE_SQL, [
      input.evidenceId,
      input.ownerId,
      input.expectedRevision,
      input.claimText,
    ]);
    const row = result.rows[0];
    return row ? toRecord(asEvidenceRow(row)) : null;
  }

  async archiveOwnedActive(input: {
    ownerId: string;
    evidenceId: string;
    expectedRevision: number;
  }): Promise<EvidenceRecord | null> {
    nonEmpty(input.ownerId, "ownerId");
    validateEvidenceId(input.evidenceId);
    validateRevision(input.expectedRevision);
    const result = await this.database.query(ARCHIVE_OWNED_ACTIVE_SQL, [
      input.evidenceId,
      input.ownerId,
      input.expectedRevision,
    ]);
    const row = result.rows[0];
    return row ? toRecord(asEvidenceRow(row)) : null;
  }
}
