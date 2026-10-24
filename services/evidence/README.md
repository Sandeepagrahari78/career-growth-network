# Evidence service

This package owns evidence records, their provenance metadata and visibility
state. It uses the service-owned PostgreSQL database configured by
CGN_EVIDENCE_DATABASE_URL; it does not read Identity, Career or Experts
databases.

The initial record schema supports manual claims and observed source
references. Every record is private by default, and the current schema only
accepts private visibility. Object keys are opaque private references; public
bucket or signed URLs are rejected. Owner-scoped reads and updates always
include the owner ID in the query, and archived records are absent from active
reads.

This ticket adds no HTTP API, event producer or confidence transition workflow.
Expert validation workflow remains in Experts. The evidence record stores only
the current verification state; later owning tickets define authorized
transitions and cross-domain contracts.

## Upload validation policy (CGN-134)

`config/evidence-upload-policy.v1.json` is the service-owned configuration for
the versioned `cgn.evidence-upload-policy.v1` contract. It allows PDF, JPEG
(`.jpg`/`.jpeg`) and PNG only; caps files at 10 MiB; sets signed upload and
download URL lifetimes to 300 and 60 seconds; and requires private objects,
owner authorization, post-upload validation and quarantine until a clean scan.
The JSON Schema and shared TypeScript shapes live under `packages/contracts/`.

The provider-neutral helpers in `src/upload-validation.ts` do not issue URLs or
access storage or scanner services directly. An Evidence adapter must use
`authorizeEvidenceUpload` before signing an upload URL and honor its expiry and
private/quarantined state. After upload, it must call
`validateUploadedEvidence` with server-measured size, signature bytes, private
quarantine state, an immutable object revision and its SHA-256 checksum. The
inspection must also return the authoritative server-side owner and stored
Content-Type; both must match the authorization and bytes. The scanner receives
that exact revision/checksum and an AbortSignal; the adapter supplies the
scanner timeout from its configuration. Missing, unavailable, throwing,
timed-out or suspicious scans return a rejected result. Only a clean result is
`validated`, and consumers must pin that revision/checksum when releasing or
authorizing a download.

Before signing any download URL, the service must use
`authorizeEvidenceDownload` with the authenticated principal and owning record.
It authorizes only the owner, private objects and records pinned to a clean,
validated scan. It returns the 60-second expiry and object revision; it never
returns a URL. No upload route, storage provider or malware-scanner integration
is created by CGN-134; CGN-142 wires these contracts to SeaweedFS.

## S3-compatible storage adapter (CGN-142)

services/evidence/src/s3-storage.ts implements the provider-neutral S3 adapter.
Configure it with an HTTPS endpoint, region, bucket and server-side
bucket-scoped credentials. Plain HTTP is allowed only for a loopback development
endpoint.
Never send storage credentials to clients or include them in logs.

EvidenceS3Storage.createUploadGrant calls the CGN-134 authorization helper
before signing a PUT. It creates a random quarantine/ key that contains no
owner or filename, and signs the content type, owner metadata, declared size,
quarantine state and If-None-Match: * condition. The client's URL expires
within the policy's 300-second maximum and cannot replace an existing object.
The bucket must remain private; public ACLs or anonymous reads are not allowed.

inspectQuarantinedObject reads the object metadata from S3, confirms the
signed owner/quarantine/declared-size metadata, then reads the same revision
using its S3 version ID when available or a signed If-Match ETag condition
otherwise. It computes SHA-256 from the stored bytes and returns the signature
prefix and measured size to validateUploadedEvidence. The injected scanner
must validate that exact revision and checksum; CGN-142 does not add a scanner
implementation or persist a validation result.

createDownloadGrant calls authorizeEvidenceDownload, verifies the owner,
clean scan revision and SHA-256 against current S3 bytes, then signs a
revision-pinned GET that expires within the policy's 60-second maximum. The
Evidence service remains the authorization boundary; no route or event is
introduced by this adapter.

Run pnpm --filter @cgn/evidence test for the package tests. The SeaweedFS
integration test starts an isolated Compose project and removes only that
project's temporary volume and generated credentials.

## Migration

Apply migrations from this directory to cgn_evidence using the service owner
role, following config/deployment/database-migration-job.v1.json. Never run
this migration against another service database.
