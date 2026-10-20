# Handoff - CGN-69

- Ticket: CGN-69 - Implement profile roles and application authorization context
- Branch: `CGN-69-application-roles-20261020`
- Base branch: `main` at `40179f9422ea5b0eceebcb1377849797eb6a43e2`
- PR / merge: [#72](https://github.com/Sandeepagrahari78/career-growth-network/pull/72), merged as `024547534c5303b225a3ceb7fe1126350f253f86`
- Jira status: Done after Jira Delivery Sync run `39390226412` on 2026-10-20
- Assignee: Sandeep Agrahari
- Date: 2026-10-20

## What changed

Adds Identity-owned global application role assignments for `student`, `expert`,
`recruiter` and `admin`, plus a versioned authenticated authorization-context
read endpoint. Roles are resolved from the account in the HttpOnly Identity
session, never from provider or client claims. New accounts have no implicit
role. Only recognized active roles are returned; checks fail closed for
unknown and inactive roles. Trusted repository updates are transactional,
audited and idempotent. No role-grant route or resource-specific permission
matrix is introduced.

## Files/modules changed

- `packages/contracts/src/identity/identity-authorization-context.v1.ts`
- `packages/contracts/schemas/identity-authorization-context.v1.schema.json`
- `packages/contracts/src/identity/identity-oidc-provider.v1.ts`,
  `packages/contracts/src/index.ts`
- `services/identity/src/application-authorization.mjs`
- `services/identity/src/application-role-repository.mjs`
- `services/identity/src/identity-auth-contract.mjs`
- `services/identity/src/identity-auth-runtime.mjs`
- `services/identity/src/oidc-auth-service.mjs`
- `services/identity/src/http-auth-server.mjs`
- `services/identity/migrations/003_identity_account_roles.{up,down}.sql`
- Identity unit, HTTP, OIDC integration and PostgreSQL acceptance tests;
  `tests/contracts/cgn69-identity-authorization.contract.test.mjs`
- `services/identity/README.md`, root `package.json`
- `docs/engineering-memory/03-contract-registry.md`,
  `docs/engineering-memory/06-known-risks.md`
- `docs/handoffs/CGN-69.md`

## Contracts changed

Adds `cgn.identity.authorization-context.v1` and
`GET /v1/identity/auth/authorization-context`. Response contains the current
Identity account ID, evaluation time and recognized active global roles. No
other service database is accessed.

## Events produced / consumed

None.

## Database / migration / config changes

Migration 003 creates Identity-owned `account_roles` and
`account_role_changes` tables with constrained role/status values, account
foreign keys, audit rows and public access revoked. No external configuration,
secrets, paid service or production infrastructure is added.

## Tests run

- Passed: focused Identity authorization, HTTP and OIDC tests (15 tests) and
  CGN-69 contract tests (3 tests).
- Passed earlier on this implementation: Identity unit (20), OIDC integration
  (8), root unit, root integration, root lint and root typecheck.
- Passed: Docker PostgreSQL acceptance for role table ownership, constraints,
  audit behavior and migration rollback.
- Passed: exact-head PR CI run `39389167803` (attempt 2), including format,
  lint, types, unit, contract, build, security, migration, Docker and integration
  gates; PR Local Helm run `39389167996`.
- Passed: post-merge Main CI `39389902415`, Docker Images `39389902434`,
  Local Helm `39389902408`, exact-merge Staging Validation `39390163488`,
  and Jira Delivery Sync `39390226412`. Jira CGN-69 is Done.
- The first PR CI attempt had a transient PostgreSQL socket-startup failure in
  the existing platform-template outbox test. Only the failed CI job was
  rerun; it passed on attempt 2. No CGN-69 test failed.
- Windows limitation: the root contract suite returned 173/176 because of
  existing line-ending-sensitive assertions in CGN-60 autoscaling, CGN-45
  probes and CGN-61 workload identity. CGN-69 contract tests passed; Linux PR CI
  is authoritative for those platform-sensitive checks.
## Known limitations / risks

- `recruiter` does not mean approved organization membership (CGN-102).
- `expert` does not mean verified expertise (CGN-186).
- `admin` does not define delegated Admin/Operator permissions or privacy-safe
  visibility (CGN-279).
- This endpoint returns server-authoritative Identity context for backend
  authorization. A client must not forward it as authorization proof.
- No public or service-to-service role grant mechanism is provided. Grant
  workflows and least-privilege service authentication remain separately owned.
- `docs/engineering-memory/05-current-state.md` and this handoff were updated
  from the fresh-main follow-up branch after exact merge and delivery evidence.

## Exact next step for next agent

CGN-69 is complete. Re-read the live rank-ordered Jira sequence, verify the next
ticket's owner and hard blockers against the fresh current state, then start the
next eligible ticket from a fresh `main` branch/worktree. Do not infer readiness
from ticket-number order.

## Rollback note

Use `services/identity/migrations/003_identity_account_roles.down.sql` against
the disposable/local Identity database before reverting the application
reference to role tables. Do not drop shared PostgreSQL volumes. Revert the
merged change only after no runtime instance uses the new context endpoint or
tables.

## Engineering Memory updated

- [x] `03-contract-registry.md`
- [x] `05-current-state.md` - updated from fresh `main` with merge and workflow evidence
- [x] `06-known-risks.md`
