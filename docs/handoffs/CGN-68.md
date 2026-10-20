# Handoff - CGN-68

- Ticket: CGN-68 - Implement open-source OIDC/JWT email and Google authentication
- Branch: `CGN-68-keycloak-oidc-20261020`
- Base branch: `main` at `27167973b186393b5d70387e4739c8e4bf67dc2a`
- PR: [#70](https://github.com/Sandeepagrahari78/career-growth-network/pull/70), merged as `720fec55af251acea528817c239b258f2552df2b`
- Jira status: Done after final Jira Delivery Sync on 2026-10-20
- Agent/person: Codex implementation under Sandeep's delegated execution; Jira assignee remains Sandeep Agrahari
- Date: 2026-10-20

## What changed

Implements Identity email/password and optional Google-brokered sign-in using
the owner-approved Keycloak decision. The provider-neutral config and safe
session response are versioned in `packages/contracts`. Identity owns the
OIDC callback, exact issuer/subject account selection, durable one-time login
transactions and sessions, safe HTTP responses and token handling. Local
Keycloak uses a pinned development realm and loopback-only port. The application
never merges accounts by email. No role, permission or consent state is created
here; CGN-69 remains the owning follow-up for authorization context.

## Files/modules changed

- `packages/contracts/src/identity/identity-oidc-provider.v1.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/schemas/identity-oidc-provider-config.v1.schema.json`
- `packages/contracts/schemas/identity-auth-session.v1.schema.json`
- `services/identity/src/oidc-config.mjs`
- `services/identity/src/auth-crypto.mjs`
- `services/identity/src/auth-session-repository.mjs`
- `services/identity/src/oidc-auth-service.mjs`
- `services/identity/src/http-auth-server.mjs`
- `services/identity/src/identity-auth-contract.mjs`
- `services/identity/src/identity-auth-runtime.mjs`
- `services/identity/migrations/002_identity_auth_sessions.{up,down}.sql`
- `services/identity/keycloak/docker-compose.yml`
- `services/identity/keycloak/realm-export/cgn-local-realm.json`
- `services/identity/keycloak/configure-google-broker.mjs`
- `services/identity/test/` including controlled OIDC, repository, HTTP, runtime and PostgreSQL acceptance tests
- `tests/contracts/cgn68-identity-oidc.contract.test.mjs`
- `services/identity/README.md`, `services/identity/package.json`, `pnpm-lock.yaml`, and root `package.json`
- `docs/adr/ADR-0006-keycloak-oidc-identity.md`
- `docs/engineering-memory/03-contract-registry.md`, `04-decisions.md`, `05-current-state.md`, `06-known-risks.md`
- `docs/handoffs/CGN-68.md`

## Contracts changed

Adds `cgn.identity.oidc-provider-config.v1` with provider-neutral issuer,
client, URI, lifetime and environment-secret references; it carries no secret
values. Adds `cgn.identity.auth-session.v1` with internal account ID and
timestamps only. The Identity HTTP paths are versioned under
`/v1/identity/auth/`. No cross-service event or API dependency was added.

## Events produced / consumed

None.

## Database / migration / config changes

Migration 002 adds Identity-owned `identity.oidc_login_transactions` and
`identity.auth_sessions` with SHA-256 state/session lookup digests, encrypted
OIDC transaction/session secrets, expiry constraints and an account FK. It is
executed as `cgn_identity_owner`; PostgreSQL acceptance checks ownership,
cross-service denial, FK and expiry enforcement, and rollback of both
migrations.

Keycloak 26.8.1 is configured for local development on `127.0.0.1:18080`, with
exact callback allow-list, standard code flow + PKCE S256, and implicit/direct
grants disabled. Admin and Google OAuth credentials are read from local
environment/secret configuration. The Google broker script retains Keycloak's
first-broker reauthentication/link flow and does not trust email for linking.
No live Google credentials were available. No production deployment or paid
infrastructure was created.

## Tests run

- Passed: root `pnpm test:unit` (33 tests), root `pnpm test:integration` (15 tests, including the Docker-backed PostgreSQL outbox test), and `node --test tests/contracts/cgn68-identity-oidc.contract.test.mjs` (3 tests).
- Passed: root `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
- Passed: targeted Prettier check for CGN-68 changed files with `--end-of-line crlf`; all matched files use the expected Windows checkout formatting.
- Windows-only limitation: root `pnpm test:contracts` passed 170/173. Three unrelated existing line-ending-sensitive validator tests fail on Windows: CGN-60 autoscaling/disruption, CGN-45 probe standards, and CGN-61 workload identity. The new CGN-68 contract tests pass. Linux PR CI is authoritative per the ticket.
- Windows-only limitation: root `pnpm format:check` flags 177 files because the checkout uses CRLF while the repository-wide command expects LF. The targeted CGN-68 Prettier check passes with CRLF explicitly selected; no unrelated repository files were reformatted.
- Passed: Identity PostgreSQL acceptance on PostgreSQL 16 in disposable Docker project `cgn68-pg-acceptance`. It verified table ownership, cross-service access denial, FK/expiry/hash constraints, and rollback of both migrations. The unique test container, volume and network were removed afterward; the shared local database was not used.
- Passed: Keycloak 26.8.1 live local realm import and Admin API inspection using disposable Docker projects. Discovery issuer, exact callback, standard flow, disabled implicit/direct grants, and imported `pkce.code.challenge.method=S256` were verified. The test realm and volume were removed afterward.
- Passed: `docker compose ... config --quiet` and `node --check services/identity/keycloak/configure-google-broker.mjs` using disposable local configuration values. No real Google login was attempted because no Google credentials were available.
- PR #70's first exact-head run `39382840535` found a blocking Semgrep issue because AES-GCM decryption did not specify the tag length; fixed by requiring 12-byte IVs and 16-byte authentication tags, with regression coverage. That attempt also hit a transient PostgreSQL socket-unavailable error in the pre-existing platform-template Docker outbox test.
- Passed: exact-candidate PR CI on `cdbbe015` via [PR CI run 39383305176](https://github.com/Sandeepagrahari78/career-growth-network/actions/runs/39383305176) and [Local Helm Validation run 39383305169](https://github.com/Sandeepagrahari78/career-growth-network/actions/runs/39383305169). The failed workflow job was rerun; quality, security, PostgreSQL migration, integration-stack, Docker build/security and PR quality summary jobs passed. The first-attempt Docker outbox startup error did not recur.
- Passed: final exact-head PR CI on `f7ce74d` via [PR CI run 39384124086](https://github.com/Sandeepagrahari78/career-growth-network/actions/runs/39384124086) and [Local Helm Validation run 39384124095](https://github.com/Sandeepagrahari78/career-growth-network/actions/runs/39384124095). Quality, security, migration, integration-stack, Docker build/security, Engineering Memory and quality-summary checks passed; conditional infrastructure, local Kubernetes, end-to-end deployment and k6 jobs were skipped by workflow conditions.
- Passed: delegated technical review on exact head `f7ce74d` was recorded in [PR review comment 5581790344](https://github.com/Sandeepagrahari78/career-growth-network/pull/70#pullrequestreview-5581790344), with no blocking findings. It was not an independent approval; merge proceeded under Sandeep's direct authorization after all exact-head checks passed.
- Passed: post-merge Main CI `39384524683`, Docker Images `39384524833`, Local Helm Validation `39384524859`, exact-merge Staging Validation `39384763954`, and final Jira Delivery Sync `39384840920`. Jira CGN-68 reached Done.
- Passed: `pnpm memory:check` after staging the implementation, security fix and post-merge memory update. The post-merge memory update itself is being delivered from a fresh `main` branch.
- Context: `pnpm agent:context --ticket CGN-68 --domain identity` attempted dependency installation but registry access was denied; fallback `node scripts/agent-context.mjs --ticket CGN-68 --domain identity` generated the bundle. Jira CGN-68, CGN-67 and CGN-99 were checked live; both hard prerequisites were Done.

## Known limitations / risks

- Production Keycloak hosting, TLS, confidential client secrets, encryption-key rotation, realm backup/restore and monitoring are not configured or validated.
- Google broker credentials are not available, so its real upstream login is not tested. Controlled OIDC tests validate Identity protocol behavior only.
- This ticket provides a runtime composition factory that accepts the existing Identity database adapter. The hosting process remains responsible for injecting its driver, pool, connection settings and lifecycle.
- The repo's Windows checkout has CRLF-sensitive existing checks as recorded above; Linux PR CI is authoritative for those platform-sensitive checks.

## Exact next step for next agent

CGN-68 is complete. Re-read the live rank-ordered Jira sequence, verify the next ticket's owner and blockers, and start the next eligible item from a fresh `main` worktree. CGN-69 and CGN-73 are now downstream of the merged authentication work; do not start either until its remaining prerequisites are Done.

## Rollback note

For a disposable local database, execute
`node scripts/infra/postgres-local.mjs migrate identity services/identity/migrations/002_identity_auth_sessions.down.sql`
before the existing 001 account migration rollback. Do not remove the shared
local PostgreSQL volume as part of this feature rollback. Revert the PR only
after the Identity runtime no longer references the new session tables. Remove
the separate disposable Keycloak realm with
`docker compose -f services/identity/keycloak/docker-compose.yml down -v` only
when its local test data is no longer needed.

## Engineering Memory updated

- [x] `03-contract-registry.md`
- [x] `04-decisions.md`
- [x] `05-current-state.md`
- [x] `06-known-risks.md`
