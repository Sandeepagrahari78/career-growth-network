# Handoff - CGN-73

- Ticket: CGN-73 - Create API Gateway BFF service with auth context propagation
- Branch: `CGN-73-pr74-review-20261028` (updates the existing PR source branch)
- Base branch: `main` at `e091ba85a8a618497783bb325456940c7ee8afe7`
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
- CI clock stabilization (explicitly authorized by Sandeep): `services/identity/test/integration/oidc-auth.integration.test.mjs` only. Identity production code is unchanged.
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
- Passed after the authorized test-only clock stabilization: all Identity tests (28 total), Gateway unit tests (10), Gateway integration tests (5), and CGN-73 contract tests (3). The Identity OIDC provider fixture and in-memory session repository now share a suite-start clock; expected session timestamps and expiry advancement derive from that clock. This removes the fixed 2026-10-20 expiry boundary from the tests without changing Identity production behavior or security settings.
- Passed after CI formatting correction: pinned Prettier 3.6.2 check for the changed Identity integration test and this handoff.
- Passed: `node scripts/ci/verify-workspace-boundaries.mjs` (16 packages), JavaScript syntax checks for the new test files, and package-manifest JSON parsing.
- Existing full contracts suite: 176/179 passed. The three failures are the repository's Windows line-ending-sensitive CGN-60 autoscaling, CGN-45 probe, and CGN-61 workload identity validators; all CGN-73 contract tests passed. Linux PR CI remains required.
- Historical PR CI runs 304, 306 and 307 on earlier heads failed in the two Identity OIDC expiry assertions. Runs 306/307 passed the context/Engineering Memory/handoff/platform-scope gates, security scans, infrastructure validation, format, lint, typecheck, unit tests, platform-template integration, and Gateway integration before the Identity failures; the quality gate stopped before contracts/build and Docker jobs were skipped. Exact-head Local Helm Validation run 192 passed. These results predate the approved test-only fix and do not validate the current head.
- PR CI run 311 on head `6d673fdb44ab0382f8e882178fd2c48db2b353ea` passed context/Engineering Memory, platform scope, zero-budget infrastructure validation and security scans, then failed only because Prettier flagged the new Identity test. The quality job stopped before lint, typecheck, unit/integration/contract tests and build. Pinned Prettier 3.6.2 has now reformatted the file and the changed-file format check passes locally; a new exact-head run is required. Local Helm Validation run 195 was still in progress at the last check.
- Sandeep explicitly authorized including the Identity test-only fix in PR #74. The earlier fixed service clock and wall-clock-generated tokens/session comparisons are now aligned to one suite-start clock; local Identity tests pass 28/28. This change remains outside Identity production code. Fresh exact-head PR CI, including downstream contracts/build and Docker checks, is still required before merge.
- Blocked locally: the Docker smoke was retried with access to the user's Docker config; Docker Desktop's Linux engine pipe `//./pipe/dockerDesktopLinuxEngine` is missing, so the image build/container acceptance test cannot run locally. PR CI's Docker job must pass.
- pnpm registry investigation: the configured registry is the default `https://registry.npmjs.org/`, with no project/global registry override or registry/proxy environment override found. A read-only package metadata request failed with OS `EACCES` under the default sandbox, then succeeded with network access enabled; this identifies sandbox egress as the cause, not registry credentials or a changed registry setting. No security settings were weakened and no registry settings were changed. In this PowerShell shell the `pnpm` executable is absent from child-process `PATH`, so Corepack's `pnpm run` dependency check also fails to spawn `pnpm install`; the required context bundle was generated with `node scripts/agent-context.mjs --ticket CGN-73 --domain gateway`, and checks used cached local tools/direct Node commands. Live Jira owner, status, acceptance and links were independently verified through the connected Jira tool.
- Jira acceptance clarification requested in comment [10302](https://sandeepagrahari1.atlassian.net/browse/CGN-73?focusedCommentId=10302): whether health/readiness and mock propagation with protected downstream operations closed can satisfy CGN-73, or whether CGN-73 must wait for CGN-101's trusted staging integration. This ticket remains In Review; no Done claim is made.
- Superseded handoff state: GitHub later refreshed PR #74 to `e6982bf9e7e540bc5d16bab0f3ee286e594b7262`. The 2026-10-28 review follow-up below records the current sync and verification state.

## Known limitations / risks

- Until CGN-101 establishes trusted service-to-service authentication, receiving services must fail closed for protected operations and must not trust the forwarded header as proof of Gateway identity. Production route configuration is rejected until then. No consuming service is registered or enabled in this change.
- Identity and business-service origins must be supplied by the runtime owner; no deployment alias is assumed or provisioned here.
- Browser cookie/CSRF policy and service-specific authorization remain outside CGN-73; review them before enabling state-changing browser routes.
- Successful upstream status/body are relayed with a restricted response-header set. CGN-74 remains responsible for the owning error-handling contract and policy.
- The PR is open and no reviews have been submitted. Its latest CI results are for older heads and remain red on the now-fixed clock-sensitive assertions; the current head must receive a fresh complete PR CI run, including Docker build/security acceptance, and technical/security review before merge.

## Exact next step for next agent

Keep PR #74 open while fresh exact-head CI runs. Obtain a clean PR CI result, technical/security review, Sandeep's explicit merge authorization, and a Jira answer to comment 10302. After merge, verify exact-merge Main CI, staging validation and Jira delivery sync show CGN-73 Done before starting dependent CGN-74. Recheck live Jira Rank and ownership before selecting another ticket: CGN-102 is ranked after CGN-101. Do not bypass CGN-122, CGN-141 or CGN-95 review gates.

## Rollback note

Revert the CGN-73 merge commit through a reviewed GitHub PR. This change adds no schema or persistent data, so rollback requires no data migration. Remove any Gateway upstream map entries separately before reverting if an operator has enabled them. Do not deploy a production Gateway as part of this rollback or acceptance work.

## Engineering Memory updated

Updated `docs/engineering-memory/03-contract-registry.md` with the new envelope and the CGN-101 consumer trust gate. `05-current-state.md` remains merged-state-only and must be updated after CGN-73 actually merges; no unmerged work is represented as current main state.

## Docker regression correction — 2026-10-22

- Gateway Docker image defaults to NODE_ENV=production and correctly requires an HTTPS Identity origin. Old test passed http://identity.invalid, so the Gateway process exited before binding its HTTP port; the readiness check then failed with ECONNREFUSED.
- Updated the smoke test's mock Identity URL to https://identity.invalid and added bounded state and startup-log diagnostics for readiness failures. Production validation and CGN-101 safety restrictions are unchanged.
- Reconciled this feature against latest main without importing obsolete changes to Identity integration tests. Preserve the already merged OpenTelemetry, Evidence, and Fast Delivery V2 implementation.
- Require passing exact-head PR Docker, full CI, human review, Main CI, staging and Jira sync. No local Docker execution was possible in this connected GitHub session.

## PR #74 security and response-budget review follow-up — 2026-10-28

- Synced the existing PR head `e6982bf9e7e540bc5d16bab0f3ee286e594b7262` into a fresh worktree based on latest `main` `e091ba85a8a618497783bb325456940c7ee8afe7`, using a normal merge. The `package.json` and contract export-barrel conflicts were resolved by retaining main's current checks and Identity organization-context export while adding the Gateway checks and Gateway contract export.
- `gateway-proxy.middleware.ts` now checks raw path segments before WHATWG URL parsing, rejects literal/encoded/nested dot segments and encoded separators, and verifies the canonical service alias matches the raw route alias.
- Each upstream body is capped at 5 MiB. Oversized declared lengths are rejected before reading, streamed bodies are counted and cancelled at the limit, and Gateway returns a safe 502 `UPSTREAM_RESPONSE_TOO_LARGE` response. The fixed limit is documented in the Gateway README.
- Added raw-HTTP route-switch regression cases and declared-length/chunked oversized-response cases to the Gateway integration suite.
- Passed after these changes: `corepack pnpm --filter @cgn/gateway test` (10 unit tests and 7 integration tests), root `corepack pnpm lint`, `typecheck`, `test:unit`, `test:integration`, and `build`. Root integration completed with three existing Docker-backed PostgreSQL/Evidence tests skipped because the local Docker engine is unavailable; all Gateway integration cases ran.
- Passed: changed-file Prettier check with `--end-of-line crlf`, branch validation, and the Engineering Memory plus sync-demo/boundary/GitOps/Helm/promotion/migration-job checks at the start of `corepack pnpm ci:full`.
- Windows checkout limitation: repository-wide `format:check` flags 231 existing files because the workflow expects LF while this checkout has CRLF. The changed-file formatting check passes. The probes, autoscaling, and workload-identity validators fail their existing LF-sensitive text assertions on CRLF; `test:contracts` passes 190/193 with only the CGN-45/60/61 validators failing for the same reason. Linux PR CI is authoritative for these checks.
- Local Gateway Docker smoke is blocked: even with Docker config access, Docker Desktop's `//./pipe/dockerDesktopLinuxEngine` does not exist. Exact-head GitHub PR CI Docker acceptance and security scans remain required after push.
- No new contract version or contract shape, event, database migration, runtime configuration, or deployment behavior was added. The contract barrel merge only preserves main's Identity export alongside the existing Gateway contract export.
- Remaining delivery gates: exact-head GitHub PR CI after push and an answer to Jira comment [10302](https://sandeepagrahari1.atlassian.net/browse/CGN-73?focusedCommentId=10302). Keep CGN-73 In Review; do not mark it Done or merge this PR.
- Next agent: inspect the exact pushed PR head and all required CI jobs, obtain the owner decision for comment 10302 and the required technical/security review, then leave merge authorization to Sandeep. Do not merge automatically.
- Rollback: revert the review-fix commit through the existing PR; no data or migration rollback is needed.

- Security follow-up on 2026-10-28: the exact-head PR CI OSV scan found qs@6.16.0 (GHSA-6pq8-jhm2-2vcw), inherited through the existing Nest/Express dependency chain. Updated only the lockfile to qs@6.16.1, the fixed version. Frozen install and Gateway build/unit/integration checks pass on the new resolution (10 unit, 7 integration); the OSV workflow must rerun after this commit.
