# Platform template ownership example

This is a concrete documentation example for the existing
`services/platform-template/` on merged `main` at
`d05d47df8c7e0877727c02d0ae1fe9d2eaa31a91` (2026-10-18). It is a reusable
NestJS service reference, not a business-domain service or a deployed product
backend.

## Service identity and owners

- Service / module: `@cgn/platform-template` — `services/platform-template/`.
- Product/domain owner: Platform; Jira CGN-34 established the template, while
  each adopting service retains its own owner.
- Technical owner: Platform ticket owner; use the active service Jira owner
  and normal engineering escalation for changes.
- Runtime state: **Implemented** as a local/CI reference template. No claim is
  made that this process is deployed as a production CGN service.

## Responsibility and data boundary

- Owns: reference NestJS bootstrap, validated process configuration, health
  probes, request correlation, safe HTTP error mapping, structured operational
  logs, and container defaults.
- Does not own: product routes, identity, domain data, authentication provider,
  product events, or another service's database.
- Data store: **None**. The template does not open a database connection or
  define a migration. The separate CGN-37 outbox implementation is still an
  unmerged PR and is not part of this `main` example.
- Privacy / authorization: no user authorization surface exists in this
  template. Its logger excludes request bodies, URLs, query strings, and
  headers; product services must enforce their own approved authorization and
  privacy contracts.

## Dependencies and contracts

| Direction | Service or package | Contract and version | Purpose | State |
|---|---|---|---|---|
| Consumes | `@cgn/contracts` | `http.error-envelope.v1` | Stable safe HTTP error body | **Implemented** |
| Follows | CGN synchronous API policy | `/v1/<resource>` for business APIs; health paths stay unversioned | Version boundary and error compatibility | **Implemented** in the reference |

There are no product-service dependencies. The authoritative policy is
[`synchronous-api-versioning.md`](../contracts/synchronous-api-versioning.md);
the envelope type is in
[`error-envelope.v1.ts`](../../packages/contracts/src/http/error-envelope.v1.ts).

## Health and operations

- `GET /health`: **Implemented** liveness response `{ "status": "ok" }`.
- `GET /ready`: **Implemented** readiness response after Nest bootstrap; returns
  service unavailable before readiness.
- Operational status: covered by the platform-template HTTP tests and the
  CGN-34 container acceptance script. This example does not claim live
  production monitoring or deployment.

## Telemetry and audit

- **Implemented** structured request completion log with request ID, HTTP
  method, status code and duration.
- Framework log messages are restricted to stable safe text; raw exceptions,
  request URLs, query values, headers and bodies are not logged.
- Product audit events and business metrics: **Not applicable** until an owning
  service adds a product state change and its approved telemetry.

## Database, migrations, backup and rollback

- Database / schema / migrations: **None** in the platform template.
- Backup / restore: **Not applicable** to this stateless reference process.
- Rollback: revert the adopting service's reviewed change or its template
  update. A deployed service owner must define data backup and migration
  compatibility in its own runbook before adding persistent data.

## Local development and verification

Prerequisites are Node.js 22.12+ and the repository-pinned pnpm. From the
repository root:

- Build: `pnpm --filter @cgn/platform-template build`.
- Tests: `pnpm --filter @cgn/platform-template test`.
- Container acceptance: `pnpm --filter @cgn/platform-template test:docker` (Docker
  required; this builds and runs the local reference image).

These commands and cleanup behavior are documented in the
[`platform-template README`](../../services/platform-template/README.md). They
verify the local template, not production deployment or a 5,000-user capacity
target.

## Unimplemented or unverified work

- Product routes, authentication, domain storage, product event producers and
  production deployment: **Planned only when an owning ticket authorizes them**;
  they do not exist in this reference service.
- Live production health monitoring, restore exercises and load/soak evidence:
  **Not validated** here.
- Versioned service ownership and operational details must be maintained by the
  adopting service owner in its module guide and runbook.

