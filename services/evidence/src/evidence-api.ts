import type {
  ArchiveEvidenceRequestV1,
  CreateManualEvidenceRequestV1,
  EvidenceRecordApiErrorCodeV1,
  EvidenceRecordArchivedV1,
  EvidenceRecordV1,
  IdentityAuthorizationContextV1,
  UpdateManualEvidenceRequestV1,
  EvidenceUploadValidationV1,
} from "@cgn/contracts";
import {
  EvidenceIdempotencyConflictError,
  type EvidenceObjectValidationProof,
  type EvidenceRecord,
} from "./evidence-repository.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVIDENCE_RECORD_ARCHIVE_CONTRACT_V1: ArchiveEvidenceRequestV1["contract"] =
  "cgn.evidence-record-archive.v1";
const EVIDENCE_RECORD_ARCHIVED_CONTRACT_V1: EvidenceRecordArchivedV1["contract"] =
  "cgn.evidence-record-archived.v1";
const EVIDENCE_RECORD_CREATE_CONTRACT_V1: CreateManualEvidenceRequestV1["contract"] =
  "cgn.evidence-record-create.v1";
const EVIDENCE_RECORD_CONTRACT_V1: EvidenceRecordV1["contract"] =
  "cgn.evidence-record.v1";
const EVIDENCE_RECORD_UPDATE_CONTRACT_V1: UpdateManualEvidenceRequestV1["contract"] =
  "cgn.evidence-record-update.v1";
const IDENTITY_AUTHORIZATION_CONTEXT_CONTRACT: IdentityAuthorizationContextV1["contract"] =
  "cgn.identity.authorization-context.v1";

export class EvidenceApiError extends Error {
  constructor(
    readonly statusCode: 400 | 401 | 404 | 409 | 422 | 500,
    readonly code: EvidenceRecordApiErrorCodeV1,
    message: string,
  ) {
    super(message);
    this.name = "EvidenceApiError";
  }
}

export interface EvidenceUploadedObjectValidator {
  /** Must use the server-side CGN-134 validator and CGN-142 storage inspection. */
  validate(input: {
    readonly ownerId: string;
    readonly objectKey: string;
  }): Promise<EvidenceUploadValidationV1>;
}

export interface EvidenceRepositoryPort {
  create(input: {
    ownerId: string;
    idempotencyKey: string;
    provenanceKind: "manual_claim";
    claimText: string;
    objectKey?: string;
    objectProof?: EvidenceObjectValidationProof;
  }): Promise<EvidenceRecord>;
  findByIdempotencyKey(
    ownerId: string,
    idempotencyKey: string,
  ): Promise<EvidenceRecord | null>;
  findOwnedActive(
    ownerId: string,
    evidenceId: string,
  ): Promise<EvidenceRecord | null>;
  updateManualClaimOwnedActive(input: {
    ownerId: string;
    evidenceId: string;
    expectedRevision: number;
    claimText: string;
  }): Promise<EvidenceRecord | null>;
  archiveOwnedActive(input: {
    ownerId: string;
    evidenceId: string;
    expectedRevision: number;
  }): Promise<EvidenceRecord | null>;
}

function validateEvidenceId(evidenceId: string): void {
  if (typeof evidenceId !== "string" || !UUID_PATTERN.test(evidenceId)) {
    throw new EvidenceApiError(
      400,
      "VALIDATION_ERROR",
      "The evidence identifier is invalid.",
    );
  }
}

function requireOwner(context: IdentityAuthorizationContextV1): string {
  if (
    context?.contract !== IDENTITY_AUTHORIZATION_CONTEXT_CONTRACT ||
    typeof context.accountId !== "string" ||
    !UUID_PATTERN.test(context.accountId) ||
    typeof context.evaluatedAt !== "string" ||
    !Number.isFinite(Date.parse(context.evaluatedAt)) ||
    !Array.isArray(context.roles)
  ) {
    throw new EvidenceApiError(
      401,
      "UNAUTHENTICATED",
      "A verified Identity authorization context is required.",
    );
  }
  return context.accountId;
}

function hasOnlyKeys(value: object, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function validateCreateRequest(request: CreateManualEvidenceRequestV1): void {
  if (
    request?.contract !== EVIDENCE_RECORD_CREATE_CONTRACT_V1 ||
    !hasOnlyKeys(request, [
      "contract",
      "idempotencyKey",
      "claimText",
      "objectKey",
    ]) ||
    typeof request.idempotencyKey !== "string" ||
    !/^[A-Za-z0-9._~:-]{1,128}$/.test(request.idempotencyKey) ||
    typeof request.claimText !== "string" ||
    request.claimText.trim().length === 0 ||
    request.claimText !== request.claimText.trim() ||
    (request.objectKey !== undefined &&
      (typeof request.objectKey !== "string" ||
        request.objectKey.length === 0 ||
        request.objectKey !== request.objectKey.trim() ||
        /^(?:\/\/|[a-z][a-z0-9+.-]*:)/i.test(request.objectKey)))
  ) {
    throw new EvidenceApiError(
      400,
      "VALIDATION_ERROR",
      "The evidence creation request is invalid.",
    );
  }
}

function validateUpdateRequest(request: UpdateManualEvidenceRequestV1): void {
  if (
    request?.contract !== EVIDENCE_RECORD_UPDATE_CONTRACT_V1 ||
    !hasOnlyKeys(request, ["contract", "expectedRevision", "claimText"]) ||
    !Number.isSafeInteger(request.expectedRevision) ||
    request.expectedRevision < 1 ||
    typeof request.claimText !== "string" ||
    request.claimText.trim().length === 0 ||
    request.claimText !== request.claimText.trim()
  ) {
    throw new EvidenceApiError(
      400,
      "VALIDATION_ERROR",
      "The evidence update request is invalid.",
    );
  }
}

function validateArchiveRequest(request: ArchiveEvidenceRequestV1): void {
  if (
    request?.contract !== EVIDENCE_RECORD_ARCHIVE_CONTRACT_V1 ||
    !hasOnlyKeys(request, ["contract", "expectedRevision"]) ||
    !Number.isSafeInteger(request.expectedRevision) ||
    request.expectedRevision < 1
  ) {
    throw new EvidenceApiError(
      400,
      "VALIDATION_ERROR",
      "The evidence archive request is invalid.",
    );
  }
}

function toContract(record: EvidenceRecord): EvidenceRecordV1 {
  return {
    contract: EVIDENCE_RECORD_CONTRACT_V1,
    evidenceId: record.evidenceId,
    ownerId: record.ownerId,
    revision: record.revision,
    provenanceKind: record.provenanceKind,
    claimText: record.claimText,
    sourceReference: record.sourceReference,
    hasValidatedPrivateObject:
      record.objectKey !== null &&
      record.objectRevision !== null &&
      record.objectChecksumSha256 !== null &&
      record.objectValidatedAt !== null,
    verificationState: record.verificationState,
    visibility: "private",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    archivedAt: record.archivedAt,
  };
}

function matchesCreateRequest(
  existing: EvidenceRecord,
  request: CreateManualEvidenceRequestV1,
): boolean {
  return (
    existing.provenanceKind === "manual_claim" &&
    existing.claimText === request.claimText &&
    existing.objectKey === (request.objectKey ?? null)
  );
}

function objectProof(
  validation: EvidenceUploadValidationV1,
  ownerId: string,
  objectKey: string,
): EvidenceObjectValidationProof | null {
  if (
    validation.state !== "validated" ||
    validation.ownerId !== ownerId ||
    validation.objectKey !== objectKey ||
    validation.malwareScan !== "clean" ||
    typeof validation.objectRevision !== "string" ||
    validation.objectRevision.trim().length === 0 ||
    !/^[0-9a-f]{64}$/.test(validation.checksumSha256) ||
    !["application/pdf", "image/jpeg", "image/png"].includes(
      validation.contentType,
    ) ||
    !Number.isSafeInteger(validation.sizeBytes) ||
    validation.sizeBytes < 1 ||
    validation.sizeBytes > 10 * 1024 * 1024 ||
    !Number.isFinite(Date.parse(validation.validatedAt))
  ) {
    return null;
  }
  return {
    objectRevision: validation.objectRevision,
    checksumSha256: validation.checksumSha256,
    contentType: validation.contentType,
    sizeBytes: validation.sizeBytes,
    validatedAt: validation.validatedAt,
  };
}

function notFound(): EvidenceApiError {
  return new EvidenceApiError(
    404,
    "NOT_FOUND",
    "The active evidence record was not found.",
  );
}

function conflict(): EvidenceApiError {
  return new EvidenceApiError(
    409,
    "CONFLICT",
    "The evidence record changed. Read it again before retrying.",
  );
}

function internalError(): EvidenceApiError {
  return new EvidenceApiError(
    500,
    "INTERNAL_ERROR",
    "Evidence could not be processed.",
  );
}

async function repositoryCall<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch {
    throw internalError();
  }
}

/**
 * Evidence-owned application API. Callers must pass an authorization context
 * resolved by Identity; client-supplied owner IDs are never accepted.
 */
export class EvidenceProjectApiV1 {
  constructor(
    private readonly repository: EvidenceRepositoryPort,
    private readonly objectValidator?: EvidenceUploadedObjectValidator,
  ) {}

  async createManualProjectEvidence(
    context: IdentityAuthorizationContextV1,
    request: CreateManualEvidenceRequestV1,
  ): Promise<EvidenceRecordV1> {
    const ownerId = requireOwner(context);
    validateCreateRequest(request);
    const existing = await repositoryCall(() =>
      this.repository.findByIdempotencyKey(ownerId, request.idempotencyKey),
    );
    if (existing) {
      if (existing.archivedAt !== null) throw notFound();
      if (matchesCreateRequest(existing, request)) return toContract(existing);
      throw conflict();
    }

    let proof: EvidenceObjectValidationProof | undefined;
    if (request.objectKey !== undefined) {
      if (!this.objectValidator) {
        throw new EvidenceApiError(
          422,
          "OBJECT_NOT_VALIDATED",
          "The uploaded object could not be validated.",
        );
      }
      try {
        const validation = await this.objectValidator.validate({
          ownerId,
          objectKey: request.objectKey,
        });
        const validProof = objectProof(validation, ownerId, request.objectKey);
        if (!validProof) {
          throw new EvidenceApiError(
            422,
            "OBJECT_NOT_VALIDATED",
            "The uploaded object could not be validated.",
          );
        }
        proof = validProof;
      } catch (error) {
        if (error instanceof EvidenceApiError) throw error;
        throw new EvidenceApiError(
          422,
          "OBJECT_NOT_VALIDATED",
          "The uploaded object could not be validated.",
        );
      }
    }

    try {
      const created = await this.repository.create({
        ownerId,
        idempotencyKey: request.idempotencyKey,
        provenanceKind: "manual_claim",
        claimText: request.claimText,
        ...(request.objectKey !== undefined
          ? { objectKey: request.objectKey }
          : {}),
        ...(proof ? { objectProof: proof } : {}),
      });
      if (created.archivedAt !== null) throw notFound();
      return toContract(created);
    } catch (error) {
      if (error instanceof EvidenceIdempotencyConflictError) throw conflict();
      throw internalError();
    }
  }

  async updateManualProjectEvidence(
    context: IdentityAuthorizationContextV1,
    evidenceId: string,
    request: UpdateManualEvidenceRequestV1,
  ): Promise<EvidenceRecordV1> {
    const ownerId = requireOwner(context);
    validateUpdateRequest(request);
    validateEvidenceId(evidenceId);
    const updated = await repositoryCall(() =>
      this.repository.updateManualClaimOwnedActive({
        ownerId,
        evidenceId,
        expectedRevision: request.expectedRevision,
        claimText: request.claimText,
      }),
    );
    if (updated) return toContract(updated);
    if (
      await repositoryCall(() =>
        this.repository.findOwnedActive(ownerId, evidenceId),
      )
    ) {
      throw conflict();
    }
    throw notFound();
  }

  async archiveProjectEvidence(
    context: IdentityAuthorizationContextV1,
    evidenceId: string,
    request: ArchiveEvidenceRequestV1,
  ): Promise<EvidenceRecordArchivedV1> {
    const ownerId = requireOwner(context);
    validateArchiveRequest(request);
    validateEvidenceId(evidenceId);
    const archived = await repositoryCall(() =>
      this.repository.archiveOwnedActive({
        ownerId,
        evidenceId,
        expectedRevision: request.expectedRevision,
      }),
    );
    if (archived?.archivedAt) {
      return {
        contract: EVIDENCE_RECORD_ARCHIVED_CONTRACT_V1,
        evidenceId: archived.evidenceId,
        revision: archived.revision,
        archivedAt: archived.archivedAt,
      };
    }
    if (
      await repositoryCall(() =>
        this.repository.findOwnedActive(ownerId, evidenceId),
      )
    ) {
      throw conflict();
    }
    throw notFound();
  }
}
