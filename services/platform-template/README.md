# CGN Platform Template

Reusable NestJS + TypeScript reference service for CGN platform work. This package is not a business-domain service and intentionally contains no business routes, database access, authentication provider, or domain events.

## Local use

Requires Node.js 22.12 or later and the repository-pinned pnpm version.

```powershell
pnpm install
pnpm --filter @cgn/platform-template build
pnpm --filter @cgn/platform-template start
```

The process listens on `PORT` (default `3000`). `NODE_ENV` accepts `development`, `test`, or `production`. Invalid configuration exits with a non-zero status and does not log environment values.

`GET /health` is the startup and liveness check. `GET /ready` succeeds only after the Nest application bootstrap lifecycle completes. Unknown paths use Nest's standard 404 response. All responses include an `x-request-id`; valid caller IDs are retained, while malformed values are replaced with a generated UUID. Structured request logs contain the ID, method, response status, and duration, but no URL, query, body, or headers.

Nest shutdown hooks handle `SIGTERM` and `SIGINT` so Kubernetes can stop the process gracefully.

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
