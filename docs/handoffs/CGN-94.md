# Handoff - CGN-94

- Ticket: CGN-94
- Branch: CGN-94-database-migration-job
- Base branch: main
- Date: 2026-10-06

## What changed

Added the database migration job pattern used before deployment validation.

The implementation deliberately does not create Identity or other product schemas. It uses the existing CGN-42 database ownership contract and the existing migration smoke fixture to validate deployment behavior.

## Files/modules changed

- `config/deployment/database-migration-job.v1.json`
- `scripts/ci/validate-database-migration-job.mjs`
- `scripts/infra/run-database-migration-job.mjs`
- `scripts/infra/postgres-local.mjs`
- `tests/contracts/database-migration-job.contract.test.mjs`
- `.github/workflows/database-migration.yml`
- `.github/workflows/release.yml`
- `package.json`
- runbook and Engineering Memory

## Safety

- One service DB per job.
- Service owner role only.
- Repository-contained SQL only.
- `ON_ERROR_STOP=1`.
- Pre-migration backup required.
- Backup/restore proof required.
- No raw DB dump uploaded.
- No committed credential.
- No automatic production DB mutation.

## Validation expected

- `pnpm ci:migration-job`
- `pnpm ci:quick`
- contract tests
- PR source-security gates
- Database Migration Validation with local PostgreSQL
- post-merge Main CI and staging validation

## Exact next step

After green merge, continue the remaining CI/CD/release-hardening dependency path without inventing service schemas. Product schema work remains with its owning Jira tickets.
