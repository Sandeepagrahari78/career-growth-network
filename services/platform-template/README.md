# CGN Platform Template

Reusable NestJS + TypeScript reference service for CGN platform work. This package is not a business-domain service and intentionally contains no business routes, authentication provider, or domain events. Its transactional outbox helper accepts the owning service's transaction client; it never opens a database connection or reads another service's database.

## Local use

Requires Node.js 22.12 or later and the repository-pinned pnpm version.

```powershell
pnpm install
pnpm --filter @cgn/platform-template build
pnpm --filter @cgn/platform-template start
```

The process listens on `PORT` (default `3000`). `NODE_ENV` accepts `development`, `test`, or `production`. Invalid configuration exits with a non-zero status and does not log environment values.

`GET /health` is the startup and liveness check. `GET /ready` succeeds only after the Nest application bootstrap lifecycle completes. Business APIs use the URL major-version policy in [the shared synchronous API contract](../../docs/contracts/synchronous-api-versioning.md); health routes remain unversioned. Errors use `http.error-envelope.v1`, including safe 404 responses for unknown paths. All responses include an `x-request-id`; valid caller IDs are retained, while malformed values are replaced with a generated UUID. Error bodies carry the same ID. Structured request logs contain the ID, method, response status, and duration, but no URL, query, body, or headers.

Nest shutdown hooks handle `SIGTERM` and `SIGINT` so Kubernetes can stop the process gracefully.

## Transactional outbox reference

The reusable helper lives at `src/outbox/outbox.ts`. A service writes its
domain row and calls `TransactionalOutbox.enqueue(transaction, event)` with the
same service-owned transaction. The reference schema is
[`migrations/001_transactional_outbox.sql`](migrations/001_transactional_outbox.sql);
apply it only through that service's migration job against that service's
database. Do not point it at a shared platform database.

Workers claim at most 100 due rows per batch with `FOR UPDATE SKIP LOCKED` and
an expiring lease. Publication is at least once: if a worker publishes and
crashes before marking the row published, the lease expires and the same
`eventId` is delivered again. Consumers must deduplicate using that stable ID.
Transient failures use bounded exponential retry. After eight attempts, the
row is durably marked dead-lettered with a safe error code; raw error messages
and event payloads are not copied into error metadata. This reference does not
provide distributed exactly-once delivery or a broker-specific adapter.

The proposed future reusable package path is `packages/platform-outbox/`.
CGN-37 keeps the implementation inside this existing template boundary; a
future package extraction needs its own owning ticket and dependency review.

## Container

```powershell
docker build -f services/platform-template/Dockerfile -t cgn-platform-template:local .
docker run --rm -p 127.0.0.1:3000:3000 cgn-platform-template:local
```

The image runs as the unprivileged `node` user and carries production dependencies only.

## Local k3d staging acceptance

The CGN-34 acceptance script deploys the locally built image into an isolated namespace on the existing `cgn-local` k3d cluster, waits for the configured startup/readiness probes, checks both health routes and an unknown route through the Kubernetes service, then removes only that namespace. It does not delete or recreate the cluster.

```powershell
pnpm --filter @cgn/platform-template build
docker build -f services/platform-template/Dockerfile -t cgn-platform-template:cgn34 .
node scripts/infra/k3d-platform-template-smoke.mjs
```

## Tests

```powershell
pnpm --filter @cgn/platform-template test
pnpm --filter @cgn/platform-template test:docker
```

The first command runs config/readiness unit tests and HTTP integration tests. The Docker test builds and starts the real image, verifies health/readiness and safe unknown-route handling, then checks graceful container termination.
