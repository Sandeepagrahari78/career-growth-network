# Handoff - CGN-32

- Ticket: CGN-32
- Branch: CGN-32-bounded-context-ownership
- Base branch: main
- Agent/person: ChatGPT implementation under Sandeep review
- Date: 2026-10-05

## What changed

Frozen the complete CGN bounded-context and ownership model in a machine-readable cross-domain architecture contract and human-readable boundary map.

The change makes synchronous API vs asynchronous event boundaries explicit, preserves `career.activity.v1` as the canonical career synchronization object, fills previously missing ownership rows, and records social/privacy/block/projection rules without inventing downstream feature APIs.

## Files/modules changed

- `packages/contracts/architecture/bounded-contexts.v1.json`
- `tests/contracts/bounded-contexts.contract.test.mjs`
- `docs/architecture/bounded-context-map.md`
- `docs/adr/ADR-0004-bounded-context-ownership.md`
- `docs/engineering-memory/01-system-map.md`
- `docs/engineering-memory/02-domain-ownership.md`
- `docs/engineering-memory/03-contract-registry.md`
- `docs/engineering-memory/04-decisions.md`
- `docs/engineering-memory/06-known-risks.md`
- `docs/handoffs/CGN-32.md`

## Contracts changed

Added architecture contract `cgn.bounded-contexts.v1`. Existing `career.activity.v1`, `domain.event.envelope.v1` and `http.error-envelope.v1` remain unchanged.

## Events produced / consumed

No runtime event producer/consumer is added. The ownership map declares the approved canonical Career Activity participation for downstream implementations.

## Database / migration / config changes

No database migration. The architecture contract explicitly forbids cross-service database reads.

## Tests

Contract tests verify context completeness/uniqueness, versioned API/event boundaries, social ownership, canonical Career Activity consumers and Admin privacy exclusions. Existing CI/security/infrastructure gates remain required.

## Known limitations / risks

Detailed endpoint paths and future event names are intentionally not frozen in this ticket. They must be introduced by the owning Jira ticket and registered as versioned shared contracts.

## Exact next step for next agent

After merge, reconcile/start CGN-33. The monorepo already exists, but CGN-33 must prove workspace/package boundaries against this newly frozen ownership contract rather than duplicating product-domain truth.

## Rollback note

Revert the CGN-32 PR. No runtime service, database, cloud resource or user data is modified.

## Engineering Memory updated

- [x] 01-system-map.md
- [x] 02-domain-ownership.md
- [x] 03-contract-registry.md
- [x] 04-decisions.md
- [x] 06-known-risks.md
