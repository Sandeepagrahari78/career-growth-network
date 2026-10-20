# Handoff - CGN-73

- Ticket: CGN-73 - Create API Gateway BFF service with auth context propagation
- Branch: `CGN-73-api-gateway-bff-20261021`
- Base branch: `main` at `57d8027a5bb7c051a619187b0e0ba43e5409ca47`
- PR: [#74](https://github.com/Sandeepagrahari78/career-growth-network/pull/74) - open; technical review and merge authorization pending
- Jira: Sandeep-owned; live status is In Review. Do not transition it to Done until the post-merge delivery gates pass
- Date: 2026-10-21

## What changed

Creates the Gateway service using the existing platform-template NestJS conventions. The versioned `/v1/{service}/...` proxy shape maps only aliases explicitly configured to fixed HTTP(S) origins. Before forwarding, Gateway extracts only the configured Identity session cookie and validates it through Identity's existing authorization-context endpoint. It removes caller-supplied identity/auth context and authorization headers, then forwards the versioned `cgn.gateway.auth-context-forwarding.v1` envelope and the existing request ID.

There are no configured owning-service consumers by default. The new header is transport data only; receivers must not trust it for authorization until CGN-101 authenticates Gateway. No business API paths, business state, cross-service database access, service-auth implementation, production deployment, or paid infrastructure were added.

The versioned contract now records its source and trust boundary: Gateway creates the envelope only from Identity's authorization-context response after Identity validates the session; Identity remains authoritative for account ID and roles; the envelope does not authenticate Gateway or authorize downstream actions. A receiving service must fail closed for protected operations until CGN-101 establishes and verifies trusted service-to-service transport. Production configuration requires HTTPS to Identity and rejects every non-empty upstream map until CGN-101, so this ticket cannot expose a production proxy path without that transport.

No new ADR was required: this change uses the approved Identity context contract and existing versioned service-boundary rules; it introduces no new authentication mechanism or authorization model.

## Files/modules changed

- `packages/contracts/src/gateway/gateway-auth-context-forwarding.v1.ts`
- `packages/contracts/schemas/gateway-auth-context-forwarding.v1.schema.json`
- `packages/contracts/src/index.ts`
- `services/gateway/` package, configuration, bootstrap, health/readiness, safe error filter, structured request logging, Identity context validation, allowlisted versioned proxy, Dockerfile, README and tests
- `tests/contracts/cgn73-gateway-auth-context.contract.test.mjs`
- Review hardening: `services/gateway/src/config/app-config.ts`, `services/gateway/test/unit/app-config.test.mjs`, `services/gateway/test/integration/http.test.mjs`, `services/gateway/test/docker-smoke.mjs`, `services/gateway/README.md`, and the versioned contract schema/type above
- `scripts/ci/detect-changes.mjs`, `.github/workflows/pr-ci.yml`, `eslint.config.js`, root `package.json`, `pnpm-lock.yaml`
- `docs/engineering-memory/03-contract-registry.md`
- `docs/handoffs/CGN-73.md`

## Contracts changed

Adds `cgn.gateway.auth-context-forwarding.v1`, transported in `x-cgn-auth-context-v1`. Its closed envelope contains only the existing Identity authorization context. It carries no cookie/session credential and defines no additional permission. The contract registry explicitly gates consumer trust on CGN-101 service-to-service authentication. The runtime mirror of contract literals is checked by the CGN-73 contract test.

## Events produced / consumed

None.

## Database / migration / config changes

No database, migration, secret, event, or deployment-manifest changes. Runtime configuration requires `IDENTITY_BASE_URL`, accepts the Identity session cookie name (local or `__Host-`), and an optional `CGN_GATEWAY_UPSTREAMS` JSON map of service aliases to fixed origins. The map defaults to empty and rejects credentials, URL paths, query strings and fragments. Production additionally requires HTTPS for Identity and rejects any non-empty upstream map until CGN-101 establishes trusted service-to-service authentication. The HTTP body parser retains the platform's 100 KB limit. No paid or production resources were created or changed.

## Tests run

- Passed: Gateway TypeScript build/typecheck using the workspace-cached TypeScript 5.9.3 toolchain; after the final review hardening, `node services/gateway/node_modules/typescript/bin/tsc --noEmit -p services/gateway/tsconfig.json` passed.
- Passed after review hardening: Gateway unit tests (10), loopback HTTP integration tests (5), and CGN-73 contract tests (3) on Node 22.17.1. These cover valid/invalid/expired Identity responses, malformed context, spoofed context/account/role/Authorization headers, missing routes, upstream failures, propagation, health/readiness, and production route gating. Expiry and upstream services use mocks; this does not claim downstream production authorization.
- Passed: `node scripts/ci/verify-workspace-boundaries.mjs` (16 packages), JavaScript syntax checks for the new test files, and package-manifest JSON parsing.
- Existing full contracts suite: 176/179 passed. The three failures are the repository's Windows line-ending-sensitive CGN-60 autoscaling, CGN-45 probe, and CGN-61 workload identity validators; all CGN-73 contract tests passed. Linux PR CI remains required.
- Previous PR CI run 304 on exact prior head `65ab013e2462ea244c61632562ce7622621d35d2` failed in the same two existing Identity OIDC integration tests. The expired-token test derives token expiry from wall-clock time while the verifier uses a frozen `2026-10-20T10:00:00Z` clock; the refresh test uses a fixture session expiring at 18:00Z while comparing it with wall-clock time.
- Exact review-hardening head `277fd717242d762507cbbfd62754e3761f1554e4`: PR CI run 306 passed frozen install, context/Engineering Memory/handoff/platform-scope gates, security scans, infrastructure validation, format, lint, typecheck, unit tests, platform-template integration, and Gateway integration. It failed only when the existing Identity OIDC integration tests reported `Missing expected rejection: expired` and `session_expired` in unchanged `services/identity/test/integration/oidc-auth.integration.test.mjs`. The quality gate stopped before `test:contracts` and build; Docker matrix jobs were skipped as a result. Do not edit Identity-owned tests under CGN-73; this remains a PR CI blocker to resolve or receive owner-reviewed disposition. Exact-head Local Helm Validation run 192 passed.
- The failing tests are outside CGN-73's owning boundary and were not changed here. They use a fixed `2026-10-20T10:00:00Z` service clock alongside wall-clock time for expired-token and in-memory-session checks; the GitHub runner had advanced beyond those fixture times. Treat the failed PR CI as a merge blocker until the existing test issue is resolved or its owner provides a reviewed disposition.
- Blocked locally: the Docker smoke was retried with access to the user's Docker config; Docker Desktop's Linux engine pipe `//./pipe/dockerDesktopLinuxEngine` is missing, so the image build/container acceptance test cannot run locally. PR CI's Docker job must pass.
- pnpm registry investigation: the configured registry is the default `https://registry.npmjs.org/`, with no project/global registry override or registry/proxy environment override found. A read-only package metadata request failed with OS `EACCES` under the default sandbox, then succeeded with network access enabled; this identifies sandbox egress as the cause, not registry credentials or a changed registry setting. No security settings were weakened and no registry settings were changed. In this PowerShell shell the `pnpm` executable is absent from child-process `PATH`, so Corepack's `pnpm run` dependency check also fails to spawn `pnpm install`; the required context bundle was generated with `node scripts/agent-context.mjs --ticket CGN-73 --domain gateway`, and checks used cached local tools/direct Node commands. Live Jira owner, status, acceptance and links were independently verified through the connected Jira tool.
- Jira acceptance clarification requested in comment [10302](https://sandeepagrahari1.atlassian.net/browse/CGN-73?focusedCommentId=10302): whether health/readiness and mock propagation with protected downstream operations closed can satisfy CGN-73, or whether CGN-73 must wait for CGN-101's trusted staging integration. This ticket remains In Review; no Done claim is made.
- Pending: push this review-hardening commit and obtain green exact-head PR CI including Docker build/security, technical/security review, Sandeep's merge authorization, exact-merge Main CI, staging validation, Jira acceptance clarification and Delivery Sync, and post-merge Engineering Memory update.

## Known limitations / risks

- Until CGN-101 establishes trusted service-to-service authentication, receiving services must fail closed for protected operations and must not trust the forwarded header as proof of Gateway identity. Production route configuration is rejected until then. No consuming service is registered or enabled in this change.
- Identity and business-service origins must be supplied by the runtime owner; no deployment alias is assumed or provisioned here.
- Browser cookie/CSRF policy and service-specific authorization remain outside CGN-73; review them before enabling state-changing browser routes.
- Successful upstream status/body are relayed with a restricted response-header set. CGN-74 remains responsible for the owning error-handling contract and policy.
- The PR is open and no reviews have been submitted. Exact-head PR CI run 306 is not green because of the unchanged Identity OIDC failures listed above; the Docker build/security acceptance job was skipped. A clean exact-head PR CI result and technical/security review are required before merge.

## Exact next step for next agent

Keep PR #74 open. Obtain a clean exact-head PR CI run, technical/security review, Sandeep's explicit merge authorization, and a Jira answer to comment 10302. Fix any regression caused by CGN-73; report the unchanged Identity OIDC clock-sensitive failures to their owning ticket rather than changing Identity here. After merge, verify exact-merge Main CI, staging validation and Jira delivery sync show CGN-73 Done before starting dependent CGN-74. Recheck live Jira Rank and ownership before selecting another ticket: CGN-102 is ranked after CGN-101. Do not bypass CGN-122, CGN-141 or CGN-95 review gates.

## Rollback note

Revert the CGN-73 merge commit through a reviewed GitHub PR. This change adds no schema or persistent data, so rollback requires no data migration. Remove any Gateway upstream map entries separately before reverting if an operator has enabled them. Do not deploy a production Gateway as part of this rollback or acceptance work.

## Engineering Memory updated

Updated `docs/engineering-memory/03-contract-registry.md` with the new envelope and the CGN-101 consumer trust gate. `05-current-state.md` remains merged-state-only and must be updated after CGN-73 actually merges; no unmerged work is represented as current main state.
