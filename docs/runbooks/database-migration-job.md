# Database Migration Job Runbook

Ticket: CGN-94

## Purpose

Define a fail-closed deployment migration pattern without inventing product schemas. Actual service schema migrations remain owned by service tickets such as CGN-67.

## Migration sequence

1. Verify the exact release SHA.
2. Generate an ephemeral database password.
3. Start the approved non-production PostgreSQL stack.
4. Verify service/database ownership boundaries.
5. Create a pre-migration backup.
6. Run one service-scoped migration using its owner role.
7. Capture structured migration evidence without secrets.
8. Prove backup/restore.
9. Continue deployment validation only if every migration step passed.
10. Destroy the non-production database environment.

## Safety rules

- One service database per migration job.
- Migration SQL must stay inside the repository.
- SQL runs with PostgreSQL `ON_ERROR_STOP=1`.
- SQL runs under the service's owner role.
- Cross-service database access remains forbidden.
- Automatic retry is disabled.
- Database dumps are never uploaded as CI artifacts.
- Only redacted JSON evidence is retained.
- No real production database is modified by this ticket.

## Local validation

```bash
node scripts/ci/validate-database-migration-job.mjs
```

The full functional smoke is executed by `Database Migration Validation` because it requires Docker/PostgreSQL.

## Production dry run

The owner-controlled `Deploy Production Dry Run` workflow now depends on `migration-job`. A failed backup, ownership check, SQL migration, or restore proof blocks the deployment dry run.

## Rollback

Current release execution is still a dry run. The pre-migration backup proves the rollback prerequisite, while real restore policy/retention for production must be approved with the future production database target.
