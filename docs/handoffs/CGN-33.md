# Handoff - CGN-33

- Ticket: CGN-33
- Branch: CGN-33-monorepo-boundaries
- Base branch: main
- Agent/person: ChatGPT implementation under Sandeep review
- Date: 2026-10-05

## What changed

Hardened the existing pnpm monorepo instead of replacing it.

Every established app/service directory is now an explicit private workspace package, package direction is frozen in `cgn.workspace-boundaries.v1`, and CI rejects direct app-to-service, service-to-service and shared-package-to-service/app workspace dependencies.

## Files/modules changed

- app/service placeholder `package.json` manifests
- `pnpm-lock.yaml`
- `packages/contracts/architecture/workspace-boundaries.v1.json`
- `scripts/ci/verify-workspace-boundaries.mjs`
- `tests/contracts/workspace-boundaries.contract.test.mjs`
- root `package.json`
- `docs/architecture/monorepo-boundaries.md`
- Engineering Memory + handoff

## Contracts changed

Added `cgn.workspace-boundaries.v1`. No product API/event contract changed.

## Events produced / consumed

None.

## Database / migration / config changes

No database migration. Workspace metadata only.

## Tests

`pnpm ci:boundaries` validates real package discovery, workspace roots, unique package names and dependency direction. Negative tests prove direct service/app coupling is rejected.

## Known limitations / risks

The boundary checker currently validates declared workspace package dependencies, not arbitrary dynamic file-system imports. The NestJS golden template ticket should keep service source self-contained and can extend lint rules when service source exists.

## Exact next step for next agent

After merge, implement CGN-34 NestJS microservice golden template on top of these workspace boundaries. The golden template may depend on `@cgn/contracts` but must not import another service package.

## Rollback note

Revert the CGN-33 PR. No runtime/cloud/database state is modified.

## Engineering Memory updated

- [x] 03-contract-registry.md
- [x] 04-decisions.md
- [x] 05-current-state.md
- [x] 06-known-risks.md
