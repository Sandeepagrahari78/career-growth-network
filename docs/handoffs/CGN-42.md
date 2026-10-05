# Handoff - CGN-42

- Ticket: CGN-42
- Branch: CGN-42-local-postgres-service-databases
- Base branch: main
- Agent/person: ChatGPT implementation under Sandeep review
- Date: 2026-10-05

## What changed

Added the zero-budget local PostgreSQL foundation with explicit service database ownership boundaries, environment-driven connection names, service-scoped migration execution and executable backup/restore proof.

No product table/schema is created.

## Files/modules changed

- `config/infra/postgres-databases.v1.json`
- `infra/docker/docker-compose.postgres.yml`
- `infra/postgres/**`
- `scripts/infra/postgres-local.mjs`
- `tests/contracts/postgres-database-boundaries.contract.test.mjs`
- `tests/fixtures/postgres/migration-smoke.sql`
- `.github/workflows/pr-ci.yml`
- `.github/workflows/local-postgres.yml`
- `scripts/ci/detect-changes.mjs`
- `package.json`
- `eslint.config.js`
- `.gitignore`
- `docs/adr/ADR-0004-local-postgres-service-boundaries.md`
- `docs/runbooks/local-postgres.md`
- Engineering Memory and this handoff

## Contracts changed

No product API/event contract changed. Added infrastructure ownership contract `cgn.postgres-databases.v1`.

## Events produced / consumed

None.

## Database / migration / config changes

Local PostgreSQL initialization creates databases and NOLOGIN owner roles only. Product tables are intentionally deferred.

The migration smoke uses a TEMP TABLE. Backup/restore smoke data is removed automatically.

## Tests run

PR/main PostgreSQL validation must prove:
- static database/owner/env contract consistency
- loopback-only PostgreSQL exposure
- no committed database password
- service database ownership and NOLOGIN owner roles
- cross-service CONNECT is not granted through PUBLIC
- unknown-service migration rejection
- owner-scoped migration execution
- custom-format backup generation
- backup restore and data verification
- volume teardown in CI

## Known limitations / risks

The local admin remains a PostgreSQL superuser for bootstrap/backup. It must not become an application credential. Local Docker PostgreSQL does not model managed HA/IAM/TLS behavior.

## Exact next step for next agent

CGN-67 becomes unblocked after this ticket is merged. Its Identity Service migration/repository work must use `cgn_identity` and create runtime permissions within the Identity boundary only; it must not access another service database.

## Rollback note

Run `node scripts/infra/postgres-local.mjs reset` to remove the local container/volume, then revert the CGN-42 PR. No cloud database or production user data is modified.

## Engineering Memory updated

- [ ] 03-contract-registry.md (no product API/event contract)
- [x] 04-decisions.md / ADR
- [x] 05-current-state.md
- [x] 06-known-risks.md
