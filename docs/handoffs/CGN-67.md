# Handoff - CGN-67

- Ticket: CGN-67 — Create Identity Service schema migrations and repository layer
- Branch: `CGN-67-identity-service-20261020`
- Base branch: `main` at `4e97805c89121f5ba3e7c39a4e8937666309a50d`
- Agent/person: Codex implementation under Sandeep's delegated execution; Jira assignee remains Sandeep Agrahari
- Date: 2026-10-20

## What changed

Adds Identity-owned persistence for internal UUID accounts and OIDC provider
subject mappings. The repository requires an injected query/transaction adapter
and uses parameterized SQL. Provider credentials remain with the provider; no
email, Career status, stage, goals, endpoint, or event was added. CGN-290 is
treated as resolved per owner direction and Jira status: this ticket does not
persist V2 stage or goal fields.

## Files/modules changed

- `packages/contracts/src/identity/identity-account.v1.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/schemas/identity-account.v1.schema.json`
- `packages/contracts/schemas/identity-provider-subject.v1.schema.json`
- `services/identity/migrations/001_identity_accounts.{up,down}.sql`
- `services/identity/src/account-repository.mjs`
- `services/identity/test/account-repository.test.mjs`
- `services/identity/test/postgres-acceptance.mjs`
- `services/identity/package.json` and `README.md`
- `tests/contracts/cgn67-identity-persistence.contract.test.mjs`
- `scripts/ci/detect-changes.mjs`
- `.github/workflows/pr-ci.yml`
- `package.json` and `eslint.config.js`
- `docs/engineering-memory/03-contract-registry.md`
- `docs/handoffs/CGN-67.md`

## Contracts changed

Adds `cgn.identity.account.v1` and `cgn.identity.provider-subject.v1` as
Identity-owned persistence shapes. Provider-subject issuer and subject are
opaque and are not returned from the account repository. No cross-service API
or event was introduced.

## Events produced / consumed

None.

## Database / migration / config changes

Adds the `identity` schema in the existing `cgn_identity` database. Accounts
use application-generated UUIDs. `(issuer, subject)` is the provider mapping's
primary key and the account foreign key cascades on account deletion. The
migration runs through the CGN-42 service-scoped owner-role runner and the down
migration drops the Identity-owned schema. CI's PostgreSQL job now applies the
migration, checks ownership and cross-service table access, verifies provider
uniqueness and FK enforcement, then proves rollback.

## Tests run

- Passed: `node --test services/identity/test/account-repository.test.mjs tests/contracts/cgn67-identity-persistence.contract.test.mjs` — 7/7 after adding the CI-gate contract check.
- Passed: `pnpm test:unit` — health-demo 1/1, platform-template 11/11, Identity 4/4.
- Passed: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm ci:verify-branch`, and `pnpm memory:check`.
- Passed: Prettier 3.6.2 on all touched files with the Windows checkout's CRLF convention; Git stores normalized LF.
- Passed: isolated PostgreSQL 16 acceptance using `node scripts/infra/postgres-local.mjs up`, `node services/identity/test/postgres-acceptance.mjs`, and `node scripts/infra/postgres-local.mjs reset`. The run proved owner, no Career table access, duplicate subject rejection, FK enforcement and rollback; only the isolated CGN-67 Compose project/volume was removed.
- Windows-only baseline limitation: `pnpm format:check` reports 145 repository files because the checked-in script uses Prettier's default line-ending behavior against this `core.autocrlf=true` checkout. The targeted changed-file check passed with `--end-of-line crlf`.
- Windows-only baseline limitation: `pnpm test:contracts` — 166/169 passed. The three unrelated failures are existing CRLF-sensitive assertions in CGN-60 autoscaling, CGN-45 probes and CGN-61 workload identity. The new CGN-67 contract tests passed.
- Passed: exact-head Linux PR CI run `39371584997` and Local Helm run
  `39371584971` on head `9e61281ba906ecf2e70cc629e665fd22a8d499e7`.
- Passed: post-merge Main CI `39372850079`, Docker Images `39372850129`, and
  Local Helm `39372850071` on merge SHA `6d44d746b585f0f92cb48756fdac8438a5f107fa`.
- Passed: exact-merge Staging Validation run `39373071513`; Jira Delivery Sync
  run `39373071566` passed and Jira status is Done.

## Known limitations / risks

- No PostgreSQL driver, pool, HTTP route, authentication flow or runtime
  bootstrap is added. The service bootstrap must inject an adapter implementing
  `query` and `withTransaction` and use credentials scoped to the Identity DB.
- The exact-head PR CI and Local Helm checks passed. Sandeep authorized
  delegated technical review and merge on 2026-10-20; staging validation is
  still required to complete delivery sync.
- The migration covers account/provider-subject persistence only; it does not
  establish production readiness or a live identity provider integration.

## Exact next step for next agent

CGN-67 is Done after exact-merge Staging Validation and delivery sync. The next
live dependency-ordered ticket, CGN-68, has CGN-67 and CGN-99 Done; run its
standard fresh-main preflight before implementation.

## Rollback note

Run the Identity down migration through
`node scripts/infra/postgres-local.mjs migrate identity
services/identity/migrations/001_identity_accounts.down.sql` before reverting
the PR. No external database or production user data is modified.

## Engineering Memory updated

- [x] `03-contract-registry.md` — added the Identity v1 persistence contracts.
- [x] `05-current-state.md` — records the merged Identity persistence scope and
      exact PR/merge checks; this follow-up still needs to merge.
- [ ] ADR / known risks — no ownership or architecture decision changed; record
      follow-up only if review changes the runtime-role boundary.

## Owner review and PR references

- Jira status/dependencies were checked live on 2026-10-20 before merge: In Progress;
  required dependencies CGN-34, CGN-35, CGN-42, CGN-66 and CGN-290 were Done.
- The owner resolved the CGN-290 persistence boundary on 2026-10-20; no V2
  stage/goal fields are included.
- GitHub PR: [#67](https://github.com/Sandeepagrahari78/career-growth-network/pull/67),
  head `9e61281ba906ecf2e70cc629e665fd22a8d499e7`, merged as
  `6d44d746b585f0f92cb48756fdac8438a5f107fa`.
- Sandeep authorized delegated technical review/merge on 2026-10-20; the
  repository, migration boundaries and rollback path were reviewed before merge.
- After Main CI, Docker, Local Helm and exact-merge Staging Validation passed,
  Jira Delivery Sync completed and CGN-67 transitioned to Done.
