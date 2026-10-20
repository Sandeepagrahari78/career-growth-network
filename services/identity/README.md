# Identity Service

Identity owns the internal account identifier and external provider-subject
mapping. Provider credentials remain with the authentication provider. Career
goals, stage, profile, and scoring are owned by their respective domains and
are not persisted here.

## Persistence

The `cgn_identity` database contains the Identity-owned `identity` schema.
Migration `001_identity_accounts.up.sql` creates UUID accounts and unique
`(issuer, subject)` provider mappings. The repository uses an injected database
adapter with parameterized queries and a transaction boundary; the service
bootstrap supplies the PostgreSQL driver and connection configuration.

Run repository unit tests with `pnpm --filter @cgn/identity test:unit`. The
PostgreSQL acceptance test runs only against the disposable local/CI database
started by `scripts/infra/postgres-local.mjs` and proves migration rollback and
ownership constraints.
