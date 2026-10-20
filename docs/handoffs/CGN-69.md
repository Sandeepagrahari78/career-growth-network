# Handoff - CGN-69

- Ticket: CGN-69 - Implement profile roles and application authorization context
- Branch: `CGN-69-application-roles-20261020`
- Base branch: `main` at `40179f9422ea5b0eceebcb1377849797eb6a43e2`
- PR / merge: pending
- Jira status: To Do at implementation start; do not mark Done before merge and delivery validation
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

- Passed: focused Identity authorization, HTTP and OIDC tests (15 tests).
- Passed: CGN-69 contract tests (3 tests).
- Passed earlier on this implementation: Identity unit (20), OIDC integration
  (8), root unit, root integration, root lint and root typecheck.
- Passed earlier: Docker PostgreSQL acceptance for role table ownership,
  constraints, audit behavior and migration rollback.
- Engineering Memory gate passed in PR run `39388979722`; exact-head validation
  is rerunning after aligning this handoff's section headings with the required
  gate labels.
- Windows limitation: root contract suite returned 173/176 because of the
  existing CGN-60 autoscaling, CGN-45 probe and CGN-61 workload identity
  line-ending-sensitive assertions. The CGN-69 contract tests pass; Linux PR CI
  is authoritative for these existing platform-sensitive checks.
- `pnpm format:check` could not be invoked directly in this worktree because
  `pnpm` is not on PATH; use Corepack. Prior targeted CRLF formatting check
  passed before this handoff and final assertion adjustment.

## Known limitations / risks

- `recruiter` does not mean approved organization membership (CGN-102).
- `expert` does not mean verified expertise (CGN-186).
- `admin` does not define delegated Admin/Operator permissions or privacy-safe
  visibility (CGN-279).
- This endpoint returns server-authoritative Identity context for backend
  authorization. A client must not forward it as authorization proof.
- No public or service-to-service role grant mechanism is provided. Grant
  workflows and least-privilege service authentication remain separately owned.
- `docs/engineering-memory/05-current-state.md` needs a fresh-main,
  docs-only follow-up after merge, recording exact merge and workflow evidence.

## Exact next step for next agent

Run Corepack Prettier check, `pnpm memory:check`, final scope/security review,
and build. Commit and push this branch, create the CGN-69 PR, then wait for
exact-head PR CI and Local Helm checks. Record delegated technical review on
the exact head. Merge only after all required checks pass, then verify Main CI,
Docker Images, Local Helm, Staging Validation and Jira Delivery Sync. Update
Engineering Memory 05 from fresh `main`; after that, re-read live Jira sequence,
owner and blockers before selecting the next ticket.

## Rollback note

Use `services/identity/migrations/003_identity_account_roles.down.sql` against
the disposable/local Identity database before reverting the application
reference to role tables. Do not drop shared PostgreSQL volumes. Revert the
merged change only after no runtime instance uses the new context endpoint or
tables.

## Engineering Memory updated

- [x] `03-contract-registry.md`
- [ ] `05-current-state.md` - update from fresh `main` with merge and workflow evidence
- [x] `06-known-risks.md`
