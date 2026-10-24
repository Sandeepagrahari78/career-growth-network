import type {
  EvidenceContentTypeV1,
  EvidenceDownloadAuthorizationV1,
  EvidenceDownloadValidationV1,
  EvidenceMalwareScannerV1,
  EvidenceQuarantinedObjectInspectionV1,
  EvidenceUploadAuthorizationV1,
  EvidenceUploadPolicyV1,
  EvidenceUploadRejectionV1,
  EvidenceUploadValidationV1,
} from "@cgn/contracts";

export interface EvidenceUploadAuthorizationInput {
  readonly principalId: string;
  readonly ownerId: string;
  readonly fileName: string;
  readonly declaredContentType: string;
  readonly declaredSizeBytes: number;
  readonly now: Date;
}

export interface EvidenceUploadedObjectInput
  extends EvidenceUploadAuthorizationInput {
  readonly objectKey: string;
  readonly uploadUrlExpiresAt: string;
  readonly scanTimeoutMs: number;
  readonly inspectQuarantinedObject: (input: {
    readonly ownerId: string;
    readonly objectKey: string;
  }) => Promise<EvidenceQuarantinedObjectInspectionV1>;
  readonly scanner?: EvidenceMalwareScannerV1;
}

export interface EvidenceDownloadAuthorizationInput {
  readonly principalId: string;
  readonly ownerId: string;
  readonly objectVisibility: "private" | "public";
  readonly validation: EvidenceDownloadValidationV1;
  readonly now: Date;
}

const MIME_TYPES = new Set<EvidenceContentTypeV1>([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const APPROVED_EXTENSION_TYPES = new Map<string, EvidenceContentTypeV1>([
  [".pdf", "application/pdf"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
]);

function isUsablePolicy(policy: EvidenceUploadPolicyV1): boolean {
  if (
    policy?.contract !== "cgn.evidence-upload-policy.v1" ||
    !Number.isSafeInteger(policy.maxFileSizeBytes) ||
    policy.maxFileSizeBytes <= 0 ||
    policy.maxFileSizeBytes > 10 * 1024 * 1024 ||
    !Number.isSafeInteger(policy.signedUploadUrlTtlSeconds) ||
    policy.signedUploadUrlTtlSeconds <= 0 ||
    policy.signedUploadUrlTtlSeconds > 300 ||
    !Number.isSafeInteger(policy.signedDownloadUrlTtlSeconds) ||
    policy.signedDownloadUrlTtlSeconds <= 0 ||
    policy.signedDownloadUrlTtlSeconds > 60 ||
    policy.privateObjectsOnly !== true ||
    policy.quarantineUntilClean !== true ||
    policy.ownerAuthorizationRequired !== true ||
    policy.postUploadValidationRequired !== true ||
    policy.scannerFailureMode !== "fail_closed" ||
    !Array.isArray(policy.allowedFiles) ||
    policy.allowedFiles.length === 0
  ) {
    return false;
  }

  const seen = new Set<string>();
  return policy.allowedFiles.every((file) => {
    if (
      !file ||
      !MIME_TYPES.has(file.contentType) ||
      !Array.isArray(file.extensions) ||
      file.extensions.length === 0
    ) {
      return false;
    }

    return file.extensions.every((extension: unknown) => {
      if (typeof extension !== "string") return false;
      const normalized = extension.toLowerCase();
      if (
        !APPROVED_EXTENSION_TYPES.has(normalized) ||
        APPROVED_EXTENSION_TYPES.get(normalized) !== file.contentType ||
        seen.has(normalized)
      ) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  });
}

function normalizeContentType(value: string): EvidenceContentTypeV1 | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized && MIME_TYPES.has(normalized as EvidenceContentTypeV1)
    ? (normalized as EvidenceContentTypeV1)
    : null;
}

function extensionOf(fileName: string): string | null {
  if (typeof fileName !== "string") return null;
  const finalDot = fileName.lastIndexOf(".");
  if (finalDot < 0) return null;
  const extension = fileName.slice(finalDot).toLowerCase();
  return /^\.[a-z0-9]+$/.test(extension) ? extension : null;
}

function allowedContentType(
  fileName: string,
  contentType: string,
  policy: EvidenceUploadPolicyV1,
): EvidenceContentTypeV1 | null {
  const extension = extensionOf(fileName);
  const normalizedContentType = normalizeContentType(contentType);
  if (!extension || !normalizedContentType) return null;

  const allowed = policy.allowedFiles.find(
    (file) =>
      file.contentType === normalizedContentType &&
      file.extensions.some((item) => item.toLowerCase() === extension),
  );
  return allowed?.contentType ?? null;
}

function declaredContentRejection(
  input: EvidenceUploadAuthorizationInput,
  policy: EvidenceUploadPolicyV1,
): EvidenceUploadRejectionV1 | null {
  if (
    typeof input.principalId !== "string" ||
    input.principalId.length === 0 ||
    typeof input.ownerId !== "string" ||
    input.ownerId.length === 0 ||
    input.principalId !== input.ownerId
  ) {
    return "owner_mismatch";
  }
  if (
    !Number.isSafeInteger(input.declaredSizeBytes) ||
    input.declaredSizeBytes <= 0
  ) {
    return "invalid_declared_size";
  }
  if (input.declaredSizeBytes > policy.maxFileSizeBytes) {
    return "declared_size_exceeded";
  }
  if (
    typeof input.fileName !== "string" ||
    input.fileName.length === 0 ||
    typeof input.declaredContentType !== "string" ||
    !allowedContentType(input.fileName, input.declaredContentType, policy)
  ) {
    return "unsupported_file_type";
  }
  return null;
}

function rejection(
  reason: EvidenceUploadRejectionV1,
): EvidenceUploadValidationV1 {
  return { state: "rejected", reason };
}

function uploadRejection(
  reason: EvidenceUploadRejectionV1,
): EvidenceUploadAuthorizationV1 {
  return { allowed: false, reason };
}

function detectSignature(prefix: Uint8Array): EvidenceContentTypeV1 | null {
  if (
    prefix.length >= 5 &&
    prefix[0] === 0x25 &&
    prefix[1] === 0x50 &&
    prefix[2] === 0x44 &&
    prefix[3] === 0x46 &&
    prefix[4] === 0x2d
  ) {
    return "application/pdf";
  }
  if (
    prefix.length >= 3 &&
    prefix[0] === 0xff &&
    prefix[1] === 0xd8 &&
    prefix[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    prefix.length >= 8 &&
    prefix[0] === 0x89 &&
    prefix[1] === 0x50 &&
    prefix[2] === 0x4e &&
    prefix[3] === 0x47 &&
    prefix[4] === 0x0d &&
    prefix[5] === 0x0a &&
    prefix[6] === 0x1a &&
    prefix[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}

function isoExpiry(now: Date, ttlSeconds: number): string | null {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) return null;
  const expiry = new Date(nowMs + ttlSeconds * 1000);
  return Number.isFinite(expiry.getTime()) ? expiry.toISOString() : null;
}

export function authorizeEvidenceUpload(
  input: EvidenceUploadAuthorizationInput,
  policy: EvidenceUploadPolicyV1,
): EvidenceUploadAuthorizationV1 {
  if (!isUsablePolicy(policy)) return uploadRejection("invalid_policy");

  const reason = declaredContentRejection(input, policy);
  if (reason) return uploadRejection(reason);
  if (!(input.now instanceof Date)) return uploadRejection("invalid_policy");

  const contentType = allowedContentType(
    input.fileName,
    input.declaredContentType,
    policy,
  );
  const expiresAt = isoExpiry(input.now, policy.signedUploadUrlTtlSeconds);
  if (!contentType || !expiresAt) return uploadRejection("invalid_policy");

  return {
    allowed: true,
    ownerId: input.ownerId,
    fileName: input.fileName,
    contentType,
    declaredSizeBytes: input.declaredSizeBytes,
    objectVisibility: "private",
    validationState: "quarantined",
    expiresAt,
  };
}

export async function validateUploadedEvidence(
  input: EvidenceUploadedObjectInput,
  policy: EvidenceUploadPolicyV1,
): Promise<EvidenceUploadValidationV1> {
  if (!isUsablePolicy(policy)) return rejection("invalid_policy");

  const reason = declaredContentRejection(input, policy);
  if (reason) return rejection(reason);

  if (typeof input.uploadUrlExpiresAt !== "string") {
    return rejection("invalid_upload_expiry");
  }
  const uploadExpiryMs = Date.parse(input.uploadUrlExpiresAt);
  if (!Number.isFinite(uploadExpiryMs))
    return rejection("invalid_upload_expiry");
  if (!(input.now instanceof Date) || !Number.isFinite(input.now.getTime())) {
    return rejection("invalid_upload_expiry");
  }
  if (input.now.getTime() >= uploadExpiryMs) return rejection("upload_expired");
  if (
    !Number.isSafeInteger(input.scanTimeoutMs) ||
    input.scanTimeoutMs <= 0 ||
    input.scanTimeoutMs > 2_147_483_647
  ) {
    return rejection("invalid_scan_timeout");
  }
  if (
    typeof input.objectKey !== "string" ||
    input.objectKey.trim().length === 0 ||
    /^(?:https?:\/\/|s3:|\/\/|\/)/i.test(input.objectKey)
  ) {
    return rejection("object_inspection_failed");
  }

  let inspection: EvidenceQuarantinedObjectInspectionV1;
  try {
    inspection = await input.inspectQuarantinedObject({
      ownerId: input.ownerId,
      objectKey: input.objectKey,
    });
  } catch {
    return rejection("object_inspection_failed");
  }

  if (!inspection || typeof inspection !== "object") {
    return rejection("object_inspection_failed");
  }
  if (inspection.ownerId !== input.ownerId) return rejection("owner_mismatch");
  if (inspection.visibility !== "private")
    return rejection("object_not_private");
  if (inspection.quarantineState !== "quarantined") {
    return rejection("object_not_quarantined");
  }
  if (
    !Number.isSafeInteger(inspection.contentLengthBytes) ||
    inspection.contentLengthBytes <= 0
  ) {
    return rejection("invalid_actual_size");
  }
  if (inspection.contentLengthBytes > policy.maxFileSizeBytes) {
    return rejection("actual_size_exceeded");
  }
  if (inspection.contentLengthBytes !== input.declaredSizeBytes) {
    return rejection("actual_size_mismatch");
  }
  if (
    typeof inspection.objectRevision !== "string" ||
    !inspection.objectRevision.trim()
  ) {
    return rejection("invalid_object_revision");
  }
  if (
    typeof inspection.checksumSha256 !== "string" ||
    !/^[a-f0-9]{64}$/i.test(inspection.checksumSha256)
  ) {
    return rejection("invalid_object_checksum");
  }
  if (!(inspection.signaturePrefix instanceof Uint8Array)) {
    return rejection("unsupported_file_type");
  }

  const detectedType = detectSignature(inspection.signaturePrefix);
  const storedType =
    typeof inspection.storedContentType === "string"
      ? normalizeContentType(inspection.storedContentType)
      : null;
  const declaredType = allowedContentType(
    input.fileName,
    input.declaredContentType,
    policy,
  );
  if (
    !detectedType ||
    detectedType !== declaredType ||
    detectedType !== storedType
  ) {
    return rejection("unsupported_file_type");
  }

  if (!input.scanner || typeof input.scanner.scan !== "function") {
    return rejection("scanner_unavailable");
  }

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<"timeout">((resolve) => {
    timeout = setTimeout(() => {
      controller.abort();
      resolve("timeout");
    }, input.scanTimeoutMs);
  });

  let verdict: "timeout" | "clean" | "suspicious" | "unavailable" | "error";
  try {
    verdict = await Promise.race([
      input.scanner
        .scan({
          ownerId: input.ownerId,
          objectKey: input.objectKey,
          objectRevision: inspection.objectRevision,
          checksumSha256: inspection.checksumSha256,
          contentType: detectedType,
          signal: controller.signal,
        })
        .catch(() => "error" as const),
      timedOut,
    ]);
  } catch {
    verdict = "error";
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  if (verdict === "timeout") return rejection("scanner_timeout");
  if (verdict === "unavailable") return rejection("scanner_unavailable");
  if (verdict === "error") return rejection("scanner_error");
  if (verdict === "suspicious") return rejection("suspicious_content");
  if (verdict !== "clean") return rejection("scanner_error");

  return {
    state: "validated",
    ownerId: input.ownerId,
    objectKey: input.objectKey,
    objectRevision: inspection.objectRevision,
    checksumSha256: inspection.checksumSha256.toLowerCase(),
    contentType: detectedType,
    sizeBytes: inspection.contentLengthBytes,
    malwareScan: "clean",
    validatedAt: new Date().toISOString(),
  };
}

export function authorizeEvidenceDownload(
  input: EvidenceDownloadAuthorizationInput,
  policy: EvidenceUploadPolicyV1,
): EvidenceDownloadAuthorizationV1 {
  if (!isUsablePolicy(policy))
    return { allowed: false, reason: "invalid_policy" };
  if (!(input.now instanceof Date)) {
    return { allowed: false, reason: "invalid_policy" };
  }
  if (
    typeof input.principalId !== "string" ||
    input.principalId.length === 0 ||
    input.principalId !== input.ownerId
  ) {
    return { allowed: false, reason: "owner_mismatch" };
  }
  if (input.objectVisibility !== "private") {
    return { allowed: false, reason: "object_not_private" };
  }
  const validation = input.validation;
  if (!validation || typeof validation !== "object") {
    return { allowed: false, reason: "content_not_validated" };
  }
  if (
    validation.state !== "validated" ||
    validation.malwareScan !== "clean" ||
    typeof validation.objectRevision !== "string" ||
    !validation.objectRevision.trim() ||
    typeof validation.checksumSha256 !== "string" ||
    !/^[a-f0-9]{64}$/i.test(validation.checksumSha256)
  ) {
    return { allowed: false, reason: "content_not_validated" };
  }

  const expiresAt = isoExpiry(input.now, policy.signedDownloadUrlTtlSeconds);
  if (!expiresAt) return { allowed: false, reason: "invalid_policy" };
  return {
    allowed: true,
    ownerId: input.ownerId,
    objectRevision: validation.objectRevision,
    checksumSha256: validation.checksumSha256.toLowerCase(),
    expiresAt,
  };
}
