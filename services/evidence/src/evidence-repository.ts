import { randomUUID } from "node:crypto";

export type EvidenceProvenanceKind = "manual_claim" | "observed_source";
export type EvidenceVerificationState = "unverified" | "verified";

export interface EvidenceSqlExecutor {
  query(statement: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}

export interface CreateManualClaimInput {
  ownerId: string;
  provenanceKind: "manual_claim";
  claimText: string;
  objectKey?: string;
}

export interface CreateObservedSourceInput {
  ownerId: string;
  provenanceKind: "observed_source";
  sourceReference: string;
  claimText?: string;
  objectKey?: string;
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
  verificationState: EvidenceVerificationState;
  visibility: "private";
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
  verification_state: EvidenceVerificationState;
  visibility: "private";
  created_at: Date | string;
  updated_at: Date | string;
  archived_at: Date | string | null;
}

const RETURNING_FIELDS = [
  "evidence_id",
  "owner_id",
  "provenance_kind",
  "claim_text",
  "source_reference",
  "object_key",
  "verification_state",
  "visibility",
  "created_at",
  "updated_at",
  "archived_at",
].join(", ");

const INSERT_EVIDENCE_SQL = [
  "INSERT INTO evidence_records",
  "(evidence_id, owner_id, provenance_kind, claim_text, source_reference, object_key)",
  "VALUES ($1::uuid, $2, $3, $4, $5, $6)",
  "RETURNING " + RETURNING_FIELDS,
].join(" ");

const FIND_OWNED_ACTIVE_SQL = [
  "SELECT " + RETURNING_FIELDS,
  "FROM evidence_records",
  "WHERE owner_id = $1 AND evidence_id = $2::uuid AND archived_at IS NULL",
  "LIMIT 1",
].join(" ");

const ARCHIVE_OWNED_ACTIVE_SQL = [
  "UPDATE evidence_records",
  "SET archived_at = clock_timestamp(), updated_at = clock_timestamp()",
  "WHERE evidence_id = $1::uuid AND owner_id = $2 AND archived_at IS NULL",
  "RETURNING evidence_id",
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

function validateObjectKey(objectKey: string | undefined): void {
  if (objectKey === undefined) return;
  nonEmpty(objectKey, "objectKey");
  if (/^(?:\/\/|[a-z][a-z0-9+.-]*:)/i.test(objectKey)) {
    throw new TypeError(
      "objectKey must be an opaque private reference, not a URL.",
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

function toRecord(row: EvidenceRow): EvidenceRecord {
  return {
    evidenceId: row.evidence_id,
    ownerId: row.owner_id,
    provenanceKind: row.provenance_kind,
    claimText: row.claim_text,
    sourceReference: row.source_reference,
    objectKey: row.object_key,
    verificationState: row.verification_state,
    visibility: row.visibility,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    archivedAt: nullableIso(row.archived_at),
  };
}

export class EvidenceRepository {
  constructor(private readonly database: EvidenceSqlExecutor) {}

  async create(input: CreateEvidenceInput): Promise<EvidenceRecord> {
    nonEmpty(input.ownerId, "ownerId");
    validateObjectKey(input.objectKey);

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

    const result = await this.database.query(INSERT_EVIDENCE_SQL, [
      randomUUID(),
      input.ownerId,
      input.provenanceKind,
      claimText,
      sourceReference,
      input.objectKey ?? null,
    ]);
    const row = result.rows[0];
    if (!row) {
      throw new Error("Evidence insert returned no record.");
    }
    return toRecord(asEvidenceRow(row));
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

  async archiveOwnedActive(
    ownerId: string,
    evidenceId: string,
  ): Promise<boolean> {
    nonEmpty(ownerId, "ownerId");
    validateEvidenceId(evidenceId);
    const result = await this.database.query(ARCHIVE_OWNED_ACTIVE_SQL, [
      evidenceId,
      ownerId,
    ]);
    return result.rows.length > 0;
  }
}
