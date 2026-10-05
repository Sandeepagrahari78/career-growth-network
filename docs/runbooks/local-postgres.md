# CGN Local PostgreSQL

Ticket: **CGN-42**

CGN uses PostgreSQL 16 in Docker/Compose for the current ₹0 local development and CI data layer.

## Ownership model

The machine-readable source is `config/infra/postgres-databases.v1.json`.

Each current data-owning service receives a distinct database and NOLOGIN owner role. No product tables are created by this ticket. The admin user `cgn_admin` is infrastructure-only for initialization, migration orchestration, backup and restore.

Applications must not use the admin credential.

## Local environment

Copy the example values to your shell; do not commit a real password.

### Windows Command Prompt

```bat
set CGN_POSTGRES_PASSWORD=choose-a-local-only-password
set CGN_POSTGRES_HOST=127.0.0.1
set CGN_POSTGRES_PORT=5432
```

### PowerShell

```powershell
$env:CGN_POSTGRES_PASSWORD="choose-a-local-only-password"
$env:CGN_POSTGRES_HOST="127.0.0.1"
$env:CGN_POSTGRES_PORT="5432"
```

PostgreSQL binds only to loopback on the configured host port.

## Start and verify

```bat
node scripts\infra\postgres-local.mjs up
node scripts\infra\postgres-local.mjs verify
```

The verification checks database ownership, NOLOGIN owner roles and that a different service owner cannot CONNECT through PUBLIC privileges.

## Run a service-scoped migration

The migration runner accepts only a service listed in the ownership contract.

```bat
node scripts\infra\postgres-local.mjs migrate identity path\to\migration.sql
```

The SQL executes after `SET ROLE cgn_identity_owner` in `cgn_identity`. Unknown services fail before SQL execution.

CGN-42 does not add product migrations. CI uses a TEMP TABLE-only fixture so the migration path is tested without inventing a product schema.

## Backup

Example:

```bat
node scripts\infra\postgres-local.mjs backup identity .local\backups\cgn_identity.dump
```

`.local/` is ignored by Git. Treat real dumps as sensitive local data and do not commit them.

## Backup/restore proof

```bat
node scripts\infra\postgres-local.mjs backup-restore-smoke
```

The smoke creates temporary marker data in the identity database, produces a custom-format dump, restores it into a temporary database, verifies the restored row, then removes both the temporary restore database and marker table.

## Stop or reset

Preserve the local data volume:

```bat
node scripts\infra\postgres-local.mjs down
```

Destroy the local data volume and force a fresh initialization next time:

```bat
node scripts\infra\postgres-local.mjs reset
```

## Future managed PostgreSQL

Service connection environment names are stable in the ownership contract. A later managed PostgreSQL/RDS ticket should supply new connection values, runtime credentials, TLS/IAM and state migration. It must not introduce cross-service database reads or silently reuse `cgn_admin` as a runtime credential.
