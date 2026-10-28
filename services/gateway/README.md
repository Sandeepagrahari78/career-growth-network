# CGN Gateway

NestJS backend-for-frontend entry point built from the approved platform-template pattern. It exposes the template health routes and a versioned, allowlisted proxy shape at `/v1/{service}/...`. A service alias is routable only when its origin is present in `CGN_GATEWAY_UPSTREAMS`; request paths never select a destination host.

For each configured request, Gateway extracts only the Identity-owned HttpOnly session cookie, asks Identity's existing `GET /v1/identity/auth/authorization-context` endpoint to validate it, then forwards the returned payload inside `cgn.gateway.auth-context-forwarding.v1` using `x-cgn-auth-context-v1`. Caller-supplied identity/context headers, authorization headers and cookies are never copied to an owning service. Gateway forwards only the request ID, content type, accept header, and the versioned context envelope.

The forwarding envelope is transport data, not proof that the caller is Gateway. Receiving services must not trust it or use it for authorization until CGN-101 service-to-service authentication is implemented and verified. This service defines no business endpoint paths, schemas, persistence, or service-auth mechanism. No upstreams are configured by default.

## Configuration

| Variable                           | Default                | Meaning                                                      |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------ |
| `PORT`                             | `3000`                 | HTTP listener port                                           |
| `NODE_ENV`                         | `development`          | `development`, `test`, or `production`                       |
| `IDENTITY_BASE_URL`                | required               | Origin of the Identity service                               |
| `CGN_IDENTITY_SESSION_COOKIE_NAME` | `cgn_identity_session` | Identity's non-secure local or `__Host-` secure cookie name  |
| `CGN_GATEWAY_UPSTREAMS`            | `{}`                   | JSON object mapping service aliases to fixed HTTP(S) origins |

The upstream map contains origins only. URL credentials, paths, queries and fragments are rejected. In production, `IDENTITY_BASE_URL` must use HTTPS and any non-empty `CGN_GATEWAY_UPSTREAMS` is rejected until CGN-101 establishes trusted service-to-service authentication. Production `/v1/...` proxy routes therefore remain unavailable in this ticket; health and readiness do not authorize downstream operations. The forwarded header alone never authenticates Gateway.

## Upstream response budget

Gateway buffers at most 5 MiB from an upstream response. A declared `Content-Length` above the limit is rejected before reading; streamed bodies are counted as they arrive. When the limit is exceeded, Gateway cancels the upstream body and returns a safe `502 UPSTREAM_RESPONSE_TOO_LARGE` response. The limit is fixed in this version and is not configurable.

## Local use

Requires Node.js 22.12 or later and the repository-pinned pnpm version.

```powershell
pnpm install
pnpm --filter @cgn/gateway build
$env:IDENTITY_BASE_URL = "http://127.0.0.1:3002"
$env:CGN_GATEWAY_UPSTREAMS = '{"career":"http://127.0.0.1:3003"}'
pnpm --filter @cgn/gateway start
```

`GET /health` is liveness and `GET /ready` indicates that the Nest application has completed bootstrap. Authentication and upstream failures use safe `http.error-envelope.v1` responses. Request logs contain correlation ID, method, status and duration only.

## Tests and container

```powershell
pnpm --filter @cgn/gateway test
pnpm --filter @cgn/gateway test:docker
```

The HTTP integration tests use loopback-only fake Identity and owning-service servers. They do not require a database, external identity provider, paid infrastructure or production deployment.
