## Jira scope

- Ticket: CGN-XXX
- Domain:
- Owner:
- Reviewer:

## What changed

Describe only the approved ticket scope.

## Contracts / events / data

- Contracts changed:
- Events produced/consumed:
- Migration/config changes:

## Validation

- [ ] `pnpm agent:context --ticket CGN-XXX --domain <domain>` was read before implementation
- [ ] `pnpm ci:quick` passes locally
- [ ] `pnpm memory:check` passes before handoff
- [ ] Relevant unit/integration/contract/E2E/security tests are included or omissions are justified
- [ ] No direct cross-service database access
- [ ] No secret/token/private data was committed
- [ ] Engineering Memory / handoff updated when required

## Risk / rollback

- Known risks:
- Rollback approach:

## Review

Architecture, security, data model, backend contracts, and production-impact changes require Sandeep review.
