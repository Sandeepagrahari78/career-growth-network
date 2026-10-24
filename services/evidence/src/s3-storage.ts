import { Buffer } from "node:buffer";
import { createHash, createHmac, randomUUID } from "node:crypto";
import type {
  EvidenceDownloadAuthorizationV1,
  EvidenceDownloadValidationV1,
  EvidenceQuarantinedObjectInspectionV1,
  EvidenceUploadAuthorizationV1,
  EvidenceUploadPolicyV1,
} from "@cgn/contracts";
import {
  authorizeEvidenceDownload,
  authorizeEvidenceUpload,
} from "./upload-validation.js";

const MAX_INSPECTED_OBJECT_BYTES = 10 * 1024 * 1024;
const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export interface EvidenceS3Credentials {
  readonly accessKey: string;
  readonly secretKey: string;
}

export interface EvidenceS3StorageConfig {
  readonly endpoint: string;
  readonly region: string;
  readonly bucket: string;
  readonly credentials: EvidenceS3Credentials;
}

export interface EvidenceUploadRequest {
  readonly principalId: string;
  readonly ownerId: string;
  readonly fileName: string;
  readonly declaredContentType: string;
  readonly declaredSizeBytes: number;
  readonly now: Date;
}

export type EvidenceS3UploadGrant =
  | (Extract<EvidenceUploadAuthorizationV1, { allowed: true }> & {
      readonly objectKey: string;
      readonly uploadUrl: string;
      readonly headers: Readonly<Record<string, string>>;
    })
  | Extract<EvidenceUploadAuthorizationV1, { allowed: false }>;

export interface EvidenceDownloadRequest {
  readonly principalId: string;
  readonly ownerId: string;
  readonly objectKey: string;
  readonly objectVisibility: "private" | "public";
  readonly validation: EvidenceDownloadValidationV1;
  readonly now: Date;
}

export type EvidenceS3DownloadGrant =
  | (Extract<EvidenceDownloadAuthorizationV1, { allowed: true }> & {
      readonly downloadUrl: string;
      readonly headers: Readonly<Record<string, string>>;
    })
  | Extract<EvidenceDownloadAuthorizationV1, { allowed: false }>;

interface S3ObjectMetadata {
  readonly contentLengthBytes: number;
  readonly declaredSizeBytes: number;
  readonly contentType: string;
  readonly ownerId: string;
  readonly quarantineState: "quarantined" | "released";
  readonly etag: string | null;
  readonly versionId: string | null;
}

interface S3Revision {
  readonly objectRevision: string;
  readonly versionId: string | null;
  readonly etag: string | null;
}

function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    "%" + character.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Uint8Array, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function signingKey(secret: string, date: string, region: string): Buffer {
  const dateKey = hmac("AWS4" + secret, date);
  const regionKey = createHmac("sha256", dateKey).update(region).digest();
  const serviceKey = createHmac("sha256", regionKey).update("s3").digest();
  return createHmac("sha256", serviceKey)
    .update("aws4_request")
    .digest();
}

function awsTimestamp(now: Date): { date: string; timestamp: string } {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError("A valid signing time is required.");
  }
  const value = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { date: value.slice(0, 8), timestamp: value };
}

function canonicalQuery(
  entries: ReadonlyArray<readonly [string, string]>,
): string {
  return entries
    .map(([key, value]) => [awsEncode(key), awsEncode(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey !== rightKey) return leftKey < rightKey ? -1 : 1;
      if (leftValue === rightValue) return 0;
      return leftValue < rightValue ? -1 : 1;
    })
    .map(([key, value]) => key + "=" + value)
    .join("&");
}

function canonicalHeaderValue(value: string): string {
  if (/[\r\n]/.test(value)) {
    throw new TypeError("S3 request headers cannot contain line breaks.");
  }
  return value.trim().replace(/\s+/g, " ");
}

function canonicalHeaders(
  headers: Readonly<Record<string, string>>,
  host: string,
): { text: string; names: string } {
  const normalized = new Map<string, string>();
  normalized.set("host", host);
  for (const [name, value] of Object.entries(headers)) {
    const lowerName = name.toLowerCase();
    if (
      lowerName === "authorization" ||
      lowerName === "host" ||
      !/^[a-z0-9-]+$/.test(lowerName)
    ) {
      throw new TypeError("Invalid or reserved S3 request header.");
    }
    normalized.set(lowerName, canonicalHeaderValue(value));
  }
  const names = [...normalized.keys()].sort();
  return {
    text: names.map((name) => name + ":" + normalized.get(name) + "\n").join(""),
    names: names.join(";"),
  };
}

function canonicalObjectPath(bucket: string, objectKey: string): string {
  if (
    typeof objectKey !== "string" ||
    objectKey.length === 0 ||
    objectKey.length > 512 ||
    objectKey.startsWith("/") ||
    objectKey.includes("\\") ||
    objectKey.split("/").some((part) => !part || part === "." || part === "..") ||
    /^(?:https?:\/\/|s3:|\/\/)/i.test(objectKey)
  ) {
    throw new TypeError("Evidence object key must be an opaque S3 key.");
  }
  return (
    "/" +
    awsEncode(bucket) +
    "/" +
    objectKey.split("/").map(awsEncode).join("/")
  );
}

function revisionFromMetadata(metadata: S3ObjectMetadata): S3Revision {
  if (metadata.versionId) {
    return {
      objectRevision: "version:" + metadata.versionId,
      versionId: metadata.versionId,
      etag: metadata.etag,
    };
  }
  if (metadata.etag) {
    return {
      objectRevision: "etag:" + metadata.etag,
      versionId: null,
      etag: metadata.etag,
    };
  }
  throw new Error("S3 object has no revision identifier.");
}

function revisionParts(value: string): S3Revision | null {
  if (value.startsWith("version:") && value.length > "version:".length) {
    return {
      objectRevision: value,
      versionId: value.slice("version:".length),
      etag: null,
    };
  }
  if (value.startsWith("etag:") && value.length > "etag:".length) {
    return {
      objectRevision: value,
      versionId: null,
      etag: value.slice("etag:".length),
    };
  }
  return null;
}

function responseContentLength(response: Response): number {
  const value = response.headers.get("content-length");
  const parsed = value === null ? Number.NaN : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error("S3 object has invalid size metadata.");
  }
  return parsed;
}

function validateConfig(config: EvidenceS3StorageConfig): URL {
  for (const [name, value] of Object.entries({
    endpoint: config?.endpoint,
    region: config?.region,
    bucket: config?.bucket,
    accessKey: config?.credentials?.accessKey,
    secretKey: config?.credentials?.secretKey,
  })) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new TypeError("Evidence S3 configuration is missing " + name + ".");
    }
  }
  if (!/^[a-z0-9-]{1,64}$/.test(config.region)) {
    throw new TypeError("Evidence S3 region is invalid.");
  }
  if (
    !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(config.bucket) ||
    config.bucket.includes("..") ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(config.bucket)
  ) {
    throw new TypeError("Evidence S3 bucket name is invalid.");
  }
  if (/[\r\n]/.test(config.credentials.accessKey + config.credentials.secretKey)) {
    throw new TypeError("Evidence S3 credentials are invalid.");
  }
  let endpoint: URL;
  try {
    endpoint = new URL(config.endpoint);
  } catch {
    throw new TypeError("Evidence S3 endpoint is invalid.");
  }
  const loopback =
    endpoint.hostname === "localhost" ||
    endpoint.hostname === "::1" ||
    endpoint.hostname.startsWith("127.");
  if (
    (endpoint.protocol !== "https:" &&
      !(endpoint.protocol === "http:" && loopback)) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new TypeError(
      "Evidence S3 endpoint must be HTTPS or a loopback HTTP origin.",
    );
  }
  return endpoint;
}

export class EvidenceS3Storage {
  private readonly endpoint: URL;
  private readonly config: EvidenceS3StorageConfig;

  constructor(config: EvidenceS3StorageConfig) {
    this.config = config;
    this.endpoint = validateConfig(config);
  }

  createUploadGrant(
    input: EvidenceUploadRequest,
    policy: EvidenceUploadPolicyV1,
  ): EvidenceS3UploadGrant {
    const authorization = authorizeEvidenceUpload(input, policy);
    if (!authorization.allowed) return authorization;

    const objectKey = "quarantine/" + randomUUID();
    const headers = {
      "content-type": authorization.contentType,
      "if-none-match": "*",
      "x-amz-meta-owner-id": authorization.ownerId,
      "x-amz-meta-quarantine-state": "quarantined",
      "x-amz-meta-declared-size-bytes": String(
        authorization.declaredSizeBytes,
      ),
    } as const;
    const uploadUrl = this.presign(
      "PUT",
      objectKey,
      [],
      headers,
      policy.signedUploadUrlTtlSeconds,
      input.now,
    );
    return { ...authorization, objectKey, uploadUrl, headers };
  }

  async inspectQuarantinedObject(input: {
    readonly ownerId: string;
    readonly objectKey: string;
  }): Promise<EvidenceQuarantinedObjectInspectionV1> {
    const metadata = await this.headObject(input.objectKey);
    const revision = revisionFromMetadata(metadata);
    const response = await this.getObject(input.objectKey, revision);
    if (!response.ok) {
      throw new Error("S3 object revision could not be read.");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (
      bytes.length !== metadata.contentLengthBytes ||
      bytes.length > MAX_INSPECTED_OBJECT_BYTES ||
      response.headers.get("etag") !== metadata.etag
    ) {
      throw new Error("S3 object changed during inspection.");
    }
    if (
      response.headers.get("x-amz-version-id") !== metadata.versionId &&
      metadata.versionId !== null
    ) {
      throw new Error("S3 object version changed during inspection.");
    }
    if (metadata.declaredSizeBytes !== metadata.contentLengthBytes) {
      throw new Error("S3 upload size metadata does not match stored bytes.");
    }
    return {
      ownerId: metadata.ownerId,
      objectRevision: revision.objectRevision,
      checksumSha256: createHash("sha256").update(bytes).digest("hex"),
      contentLengthBytes: metadata.contentLengthBytes,
      storedContentType: metadata.contentType,
      signaturePrefix: bytes.slice(0, 16),
      visibility: "private",
      quarantineState: metadata.quarantineState,
    };
  }

  async createDownloadGrant(
    input: EvidenceDownloadRequest,
    policy: EvidenceUploadPolicyV1,
  ): Promise<EvidenceS3DownloadGrant> {
    const authorization = authorizeEvidenceDownload(
      input,
      policy,
    );
    if (!authorization.allowed) return authorization;

    const revision: S3Revision | null = revisionParts(
      authorization.objectRevision,
    );
    if (!revision) {
      return { allowed: false, reason: "content_not_validated" };
    }

    try {
      const metadata = await this.headObject(input.objectKey, revision);
      if (
        metadata.ownerId !== input.ownerId ||
        metadata.quarantineState !== "quarantined"
      ) {
        return { allowed: false, reason: "content_not_validated" };
      }
      const actualRevision = revisionFromMetadata(metadata);
      if (actualRevision.objectRevision !== authorization.objectRevision) {
        return { allowed: false, reason: "content_not_validated" };
      }
      const response = await this.getObject(input.objectKey, revision);
      if (!response.ok) {
        return { allowed: false, reason: "content_not_validated" };
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      const checksum = createHash("sha256").update(bytes).digest("hex");
      if (
        bytes.length !== metadata.contentLengthBytes ||
        bytes.length > MAX_INSPECTED_OBJECT_BYTES ||
        checksum !== authorization.checksumSha256 ||
        response.headers.get("etag") !== metadata.etag ||
        (metadata.versionId !== null &&
          response.headers.get("x-amz-version-id") !== metadata.versionId)
      ) {
        return { allowed: false, reason: "content_not_validated" };
      }
      const headers = revision.versionId
        ? {}
        : { "if-match": revision.etag as string };
      const downloadUrl = this.presign(
        "GET",
        input.objectKey,
        revision.versionId ? [["versionId", revision.versionId]] : [],
        headers,
        policy.signedDownloadUrlTtlSeconds,
        input.now,
      );
      return { ...authorization, downloadUrl, headers };
    } catch {
      return { allowed: false, reason: "content_not_validated" };
    }
  }

  private async headObject(
    objectKey: string,
    revision?: S3Revision,
  ): Promise<S3ObjectMetadata> {
    const query = revision?.versionId
      ? [["versionId", revision.versionId] as const]
      : [];
    const headers =
      revision?.etag && !revision.versionId
        ? { "if-match": revision.etag }
        : {};
    const response = await this.signedRequest(
      "HEAD",
      objectKey,
      query,
      headers,
    );
    if (!response.ok) {
      throw new Error("S3 object metadata lookup failed.");
    }
    const ownerId = response.headers.get("x-amz-meta-owner-id") ?? "";
    const quarantineState =
      response.headers.get("x-amz-meta-quarantine-state") === "quarantined"
        ? "quarantined"
        : "released";
    const declaredSize = Number(
      response.headers.get("x-amz-meta-declared-size-bytes"),
    );
    const contentLengthBytes = responseContentLength(response);
    if (
      !Number.isSafeInteger(declaredSize) ||
      declaredSize !== contentLengthBytes ||
      contentLengthBytes > MAX_INSPECTED_OBJECT_BYTES
    ) {
      throw new Error("S3 object size metadata is invalid.");
    }
    return {
      contentLengthBytes,
      declaredSizeBytes: declaredSize,
      contentType: response.headers.get("content-type") ?? "",
      ownerId,
      quarantineState,
      etag: response.headers.get("etag"),
      versionId: response.headers.get("x-amz-version-id"),
    };
  }

  private async getObject(
    objectKey: string,
    revision: S3Revision,
  ): Promise<Response> {
    const query = revision.versionId
      ? [["versionId", revision.versionId] as const]
      : [];
    const headers =
      revision.etag && !revision.versionId
        ? { "if-match": revision.etag }
        : {};
    return this.signedRequest("GET", objectKey, query, headers);
  }

  private async signedRequest(
    method: "GET" | "HEAD",
    objectKey: string,
    query: ReadonlyArray<readonly [string, string]>,
    headers: Readonly<Record<string, string>>,
  ): Promise<Response> {
    const now = new Date();
    const { date, timestamp } = awsTimestamp(now);
    const path = canonicalObjectPath(this.config.bucket, objectKey);
    const queryString = canonicalQuery(query);
    const url =
      this.endpoint.origin +
      path +
      (queryString.length > 0 ? "?" + queryString : "");
    const payloadHash = EMPTY_SHA256;
    const requestHeaders = {
      ...headers,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": timestamp,
    };
    const normalized = canonicalHeaders(requestHeaders, this.endpoint.host);
    const canonicalRequest = [
      method,
      path,
      queryString,
      normalized.text,
      normalized.names,
      payloadHash,
    ].join("\n");
    const scope = date + "/" + this.config.region + "/s3/aws4_request";
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      timestamp,
      scope,
      sha256(canonicalRequest),
    ].join("\n");
    const signature = createHmac(
      "sha256",
      signingKey(this.config.credentials.secretKey, date, this.config.region),
    )
      .update(stringToSign)
      .digest("hex");
    const authorization =
      "AWS4-HMAC-SHA256 Credential=" +
      this.config.credentials.accessKey +
      "/" +
      scope +
      ", SignedHeaders=" +
      normalized.names +
      ", Signature=" +
      signature;
    return fetch(url, {
      method,
      signal: AbortSignal.timeout(10_000),
      headers: {
        ...requestHeaders,
        Authorization: authorization,
      },
    });
  }

  private presign(
    method: "GET" | "PUT",
    objectKey: string,
    query: ReadonlyArray<readonly [string, string]>,
    headers: Readonly<Record<string, string>>,
    expiresInSeconds: number,
    now: Date,
  ): string {
    if (
      !Number.isSafeInteger(expiresInSeconds) ||
      expiresInSeconds <= 0 ||
      expiresInSeconds > 604800
    ) {
      throw new TypeError("S3 signed URL expiry is invalid.");
    }
    const { date, timestamp } = awsTimestamp(now);
    const path = canonicalObjectPath(this.config.bucket, objectKey);
    const scope = date + "/" + this.config.region + "/s3/aws4_request";
    const queryEntries: Array<readonly [string, string]> = [
      ...query,
      ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
      [
        "X-Amz-Credential",
        this.config.credentials.accessKey + "/" + scope,
      ],
      ["X-Amz-Date", timestamp],
      ["X-Amz-Expires", String(expiresInSeconds)],
      ["X-Amz-SignedHeaders", canonicalHeaders(headers, this.endpoint.host).names],
    ];
    const queryString = canonicalQuery(queryEntries);
    const normalized = canonicalHeaders(headers, this.endpoint.host);
    const canonicalRequest = [
      method,
      path,
      queryString,
      normalized.text,
      normalized.names,
      "UNSIGNED-PAYLOAD",
    ].join("\n");
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      timestamp,
      scope,
      sha256(canonicalRequest),
    ].join("\n");
    const signature = createHmac(
      "sha256",
      signingKey(this.config.credentials.secretKey, date, this.config.region),
    )
      .update(stringToSign)
      .digest("hex");
    return (
      this.endpoint.origin +
      path +
      "?" +
      canonicalQuery([...queryEntries, ["X-Amz-Signature", signature]])
    );
  }
}
