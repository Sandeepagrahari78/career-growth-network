# Handoff - CGN-73

- Ticket: CGN-73 - Create API Gateway BFF service with auth context propagation
- Branch: `CGN-73-api-gateway-bff-20261021`
- Base branch: `main` at `57d8027a5bb7c051a619187b0e0ba43e5409ca47`
- PR: [#74](https://github.com/Sandeepagrahari78/career-growth-network/pull/74) - open; technical review and merge authorization pending
- Jira: Sandeep-owned, To Do at implementation start; keep Jira ownership and status unchanged until the post-merge delivery gates pass
- Date: 2026-10-21

## What changed

Creates the Gateway service using the existing platform-template NestJS conventions. The versioned `/v1/{service}/...` proxy shape maps only aliases explicitly configured to fixed HTTP(S) origins. Before forwarding, Gateway extracts only the configured Identity session cookie and validates it through Identity's existing authorization-context endpoint. It removes caller-supplied identity/auth context and authorization headers, then forwards the versioned `cgn.gateway.auth-context-forwarding.v1` envelope and the existing request ID.

There are no configured owning-service consumers by default. The new header is transport data only; receivers must not trust it for authorization until CGN-101 authenticates Gateway. No business API paths, business state, cross-service database access, service-auth implementation, production deployment, or paid infrastructure were added.

## Files/modules changed

- `packages/contracts/src/gateway/gateway-auth-context-forwarding.v1.ts`
- `packages/contracts/schemas/gateway-auth-context-forwarding.v1.schema.json`
- `packages/contracts/src/index.ts`
- `services/gateway/` package, configuration, bootstrap, health/readiness, safe error filter, structured request logging, Identity context validation, allowlisted versioned proxy, Dockerfile, README and tests
- `tests/contracts/cgn73-gateway-auth-context.contract.test.mjs`
- `scripts/ci/detect-changes.mjs`, `.github/workflows/pr-ci.yml`, `eslint.config.js`, root `package.json`, `pnpm-lock.yaml`
- `docs/engineering-memory/03-contract-registry.md`
- `docs/handoffs/CGN-73.md`

## Contracts changed

Adds `cgn.gateway.auth-context-forwarding.v1`, transported in `x-cgn-auth-context-v1`. Its closed envelope contains only the existing Identity authorization context. It carries no cookie/session credential and defines no additional permission. The contract registry explicitly gates consumer trust on CGN-101 service-to-service authentication. The runtime mirror of contract literals is checked by the CGN-73 contract test.

## Events produced / consumed

None.

## Database / migration / config changes

No database, migration, secret, event, or deployment configuration changes. Runtime configuration requires `IDENTITY_BASE_URL`, accepts the Identity session cookie name (local or `__Host-`), and an optional `CGN_GATEWAY_UPSTREAMS` JSON map of service aliases to fixed origins. The map defaults to empty and rejects credentials, URL paths, query strings and fragments. The HTTP body parser retains the platform's 100 KB limit. No paid or production resources were created or changed.

## Tests run

- Passed: Gateway TypeScript build and typecheck using the workspace-cached TypeScript 5.9.3 toolchain.
- Passed: Gateway unit tests (9), loopback HTTP integration tests (5) and CGN-73 contract tests (3) on Node 22.17.1.
- Passed: `node scripts/ci/verify-workspace-boundaries.mjs` (16 packages), JavaScript syntax checks for the new test files, and package-manifest JSON parsing.
- Existing full contracts suite: 176/179 passed. The three failures are the repository's Windows line-ending-sensitive CGN-60 autoscaling, CGN-45 probe, and CGN-61 workload identity validators; all CGN-73 contract tests passed. Linux PR CI remains required.
- Blocked locally: Docker daemon is unavailable (`docker_engine` named pipe missing), so the Gateway Docker acceptance test could not run. PR CI's Docker job must pass.
- Blocked locally: complete pnpm installation was prevented by missing offline tarballs and registry `EACCES`; direct `pnpm` build attempts retried the restricted registry. Compile/tests used the cached toolchain and did not modify the lockfile beyond the Gateway workspace importer.
- Pending: PR CI, review, merge authorization, Main CI, staging validation, Jira Delivery Sync, `pnpm memory:check` on the staged candidate, and post-merge Engineering Memory update.

## Known limitations / risks

- Until CGN-101 is merged, receiving services must not trust the forwarded header as proof of Gateway identity. No consuming service is registered or enabled in this change.
- Identity and business-service origins must be supplied by the runtime owner; no deployment alias is assumed or provisioned here.
- Browser cookie/CSRF policy and service-specific authorization remain outside CGN-73; review them before enabling state-changing browser routes.
- Successful upstream status/body are relayed with a restricted response-header set. CGN-74 remains responsible for the owning error-handling contract and policy.
- Local Docker acceptance and Linux PR CI have not yet produced evidence.

## Exact next step for next agent

Complete the staged-candidate memory/handoff gates, commit and push this branch, then open the CGN-73 PR. Wait for required technical review and Sandeep's merge authorization. After merge, verify exact-head Main CI, staging validation and Jira delivery sync show CGN-73 Done before starting dependent CGN-74. Recheck live Jira Rank and ownership before selecting any other ready Sandeep-owned ticket. Do not bypass CGN-122, CGN-141 or CGN-95 review gates.

## Rollback note

Revert the CGN-73 merge commit through a reviewed GitHub PR. This change adds no schema or persistent data, so rollback requires no data migration. Remove any Gateway upstream map entries separately before reverting if an operator has enabled them. Do not deploy a production Gateway as part of this rollback or acceptance work.

## Engineering Memory updated

Updated `docs/engineering-memory/03-contract-registry.md` with the new envelope and the CGN-101 consumer trust gate. `05-current-state.md` remains merged-state-only and must be updated after CGN-73 actually merges; no unmerged work is represented as current main state.
