export const EVIDENCE_RECORD_CONTRACT_V1 = "cgn.evidence-record.v1" as const;
export const EVIDENCE_RECORD_CREATE_CONTRACT_V1 =
  "cgn.evidence-record-create.v1" as const;
export const EVIDENCE_RECORD_UPDATE_CONTRACT_V1 =
  "cgn.evidence-record-update.v1" as const;
export const EVIDENCE_RECORD_ARCHIVE_CONTRACT_V1 =
  "cgn.evidence-record-archive.v1" as const;
export const EVIDENCE_RECORD_ARCHIVED_CONTRACT_V1 =
  "cgn.evidence-record-archived.v1" as const;

export type EvidenceRecordProvenanceV1 = "manual_claim" | "observed_source";
export type EvidenceRecordVerificationStateV1 = "unverified" | "verified";

/** Private Evidence-owned record projection. Object keys and file URLs are never returned. */
export interface EvidenceRecordV1 {
  readonly contract: typeof EVIDENCE_RECORD_CONTRACT_V1;
  readonly evidenceId: string;
  readonly ownerId: string;
  readonly revision: number;
  readonly provenanceKind: EvidenceRecordProvenanceV1;
  readonly claimText: string | null;
  readonly sourceReference: string | null;
  readonly hasValidatedPrivateObject: boolean;
  readonly verificationState: EvidenceRecordVerificationStateV1;
  readonly visibility: "private";
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

export interface CreateManualEvidenceRequestV1 {
  readonly contract: typeof EVIDENCE_RECORD_CREATE_CONTRACT_V1;
  /** Required for safe retry after an uncertain network response. */
  readonly idempotencyKey: string;
  readonly claimText: string;
  /** Opaque Evidence-owned key; the service validates it and never returns it. */
  readonly objectKey?: string;
}

export interface UpdateManualEvidenceRequestV1 {
  readonly contract: typeof EVIDENCE_RECORD_UPDATE_CONTRACT_V1;
  /** Optimistic concurrency guard from the most recently read record. */
  readonly expectedRevision: number;
  readonly claimText: string;
}

export interface ArchiveEvidenceRequestV1 {
  readonly contract: typeof EVIDENCE_RECORD_ARCHIVE_CONTRACT_V1;
  /** Optimistic concurrency guard from the most recently read record. */
  readonly expectedRevision: number;
}

/** Archive returns only a tombstone; private claim text is no longer returned. */
export interface EvidenceRecordArchivedV1 {
  readonly contract: typeof EVIDENCE_RECORD_ARCHIVED_CONTRACT_V1;
  readonly evidenceId: string;
  readonly revision: number;
  readonly archivedAt: string;
}

export type EvidenceRecordApiErrorCodeV1 =
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "OBJECT_NOT_VALIDATED"
  | "INTERNAL_ERROR";
