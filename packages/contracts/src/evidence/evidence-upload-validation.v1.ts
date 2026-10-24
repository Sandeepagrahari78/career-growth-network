export type EvidenceContentTypeV1 =
  | "application/pdf"
  | "image/jpeg"
  | "image/png";

export interface EvidenceUploadAllowedFileV1 {
  readonly extensions: readonly string[];
  readonly contentType: EvidenceContentTypeV1;
}

export interface EvidenceUploadPolicyV1 {
  readonly contract: "cgn.evidence-upload-policy.v1";
  readonly maxFileSizeBytes: number;
  readonly signedUploadUrlTtlSeconds: number;
  readonly signedDownloadUrlTtlSeconds: number;
  readonly allowedFiles: readonly EvidenceUploadAllowedFileV1[];
  readonly privateObjectsOnly: true;
  readonly quarantineUntilClean: true;
  readonly ownerAuthorizationRequired: true;
  readonly postUploadValidationRequired: true;
  readonly scannerFailureMode: "fail_closed";
}

export type EvidenceUploadRejectionV1 =
  | "invalid_policy"
  | "owner_mismatch"
  | "unsupported_file_type"
  | "invalid_declared_size"
  | "declared_size_exceeded"
  | "invalid_upload_expiry"
  | "upload_expired"
  | "invalid_scan_timeout"
  | "object_inspection_failed"
  | "object_not_private"
  | "object_not_quarantined"
  | "actual_size_exceeded"
  | "invalid_actual_size"
  | "actual_size_mismatch"
  | "invalid_object_revision"
  | "invalid_object_checksum"
  | "scanner_unavailable"
  | "scanner_timeout"
  | "scanner_error"
  | "suspicious_content";

export type EvidenceUploadAuthorizationV1 =
  | {
      readonly allowed: true;
      readonly ownerId: string;
      readonly fileName: string;
      readonly contentType: EvidenceContentTypeV1;
      readonly declaredSizeBytes: number;
      readonly objectVisibility: "private";
      readonly validationState: "quarantined";
      readonly expiresAt: string;
    }
  | {
      readonly allowed: false;
      readonly reason: EvidenceUploadRejectionV1;
    };

export interface EvidenceQuarantinedObjectInspectionV1 {
  /** Owner read by the server from the authoritative upload record. */
  readonly ownerId: string;
  /** Opaque revision or immutable-object token supplied by the storage adapter. */
  readonly objectRevision: string;
  /** SHA-256 of the exact object revision, computed from the stored bytes. */
  readonly checksumSha256: string;
  readonly contentLengthBytes: number;
  /** Content-Type returned by the server-side storage metadata inspection. */
  readonly storedContentType: string;
  /** Bytes read from offset zero by the server-side storage adapter. */
  readonly signaturePrefix: Uint8Array;
  readonly visibility: "private" | "public";
  readonly quarantineState: "quarantined" | "released";
}

export interface EvidenceMalwareScanRequestV1 {
  readonly ownerId: string;
  readonly objectKey: string;
  readonly objectRevision: string;
  readonly checksumSha256: string;
  readonly contentType: EvidenceContentTypeV1;
}

export type EvidenceMalwareScanVerdictV1 =
  | "clean"
  | "suspicious"
  | "unavailable";

export interface EvidenceMalwareScannerV1 {
  scan(
    request: EvidenceMalwareScanRequestV1 & { readonly signal: AbortSignal },
  ): Promise<EvidenceMalwareScanVerdictV1>;
}

export type EvidenceUploadValidationV1 =
  | {
      readonly state: "validated";
      readonly ownerId: string;
      readonly objectKey: string;
      readonly objectRevision: string;
      readonly checksumSha256: string;
      readonly contentType: EvidenceContentTypeV1;
      readonly sizeBytes: number;
      readonly malwareScan: "clean";
      readonly validatedAt: string;
    }
  | {
      readonly state: "rejected";
      readonly reason: EvidenceUploadRejectionV1;
    };

export interface EvidenceDownloadValidationV1 {
  readonly state: "quarantined" | "validated" | "rejected";
  readonly objectRevision?: string;
  readonly checksumSha256?: string;
  readonly malwareScan?: EvidenceMalwareScanVerdictV1;
}

export type EvidenceDownloadAuthorizationV1 =
  | {
      readonly allowed: true;
      readonly ownerId: string;
      readonly objectRevision: string;
      readonly checksumSha256: string;
      readonly expiresAt: string;
    }
  | {
      readonly allowed: false;
      readonly reason:
        | "invalid_policy"
        | "owner_mismatch"
        | "object_not_private"
        | "content_not_validated";
    };
