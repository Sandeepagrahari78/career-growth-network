# Handoff - CGN-36

- Ticket: CGN-36 — Define canonical domain-event envelope and schema versioning
- Branch: `CGN-36-domain-event-envelope`
- Base branch: `main` at `ab1f041cab534f170c29cfae00dfc5f40f5197f0`
- Agent/person: Codex under Sandeep review
- Date: 2026-10-18

## What changed

Extended the existing `domain.event.envelope.v1` interface with explicit required/optional field and compatibility rules. Added a Draft 2020-12 JSON Schema that requires event ID, event type, version 1, RFC 3339 `occurredAt`, producer and object payload. The version-1 schema rejects unknown envelope versions and permits unknown optional properties for additive evolution. Added valid, invalid and additive-compatible fixtures plus contract tests.

No domain-specific event payload, producer, consumer, runtime service, route, database or infrastructure was added.

## Files/modules changed

- `packages/contracts/src/events/domain-event-envelope.v1.ts`
- `packages/contracts/schemas/domain-event-envelope.v1.schema.json`
- `packages/contracts/fixtures/events/domain-event-envelope.v1.json`
- `tests/contracts/domain-event-envelope-v1.test.mjs`
- `docs/engineering-memory/03-contract-registry.md`
- `docs/handoffs/CGN-36.md`

## Contracts changed

Formalized the already-existing `domain.event.envelope.v1` contract. Required fields: `eventId`, `eventType`, `eventVersion: 1`, `occurredAt`, `producer`, and `payload`. Optional `subjectId` and `correlationId` are strings. Timestamps use RFC 3339 date-time form. Unknown envelope versions are rejected; unknown optional envelope fields remain allowed so additive fields do not require a major version change. Breaking envelope shape changes require a new event envelope version. Domain payload compatibility is owned by each producer contract.

## Events produced / consumed

None. No event producer or consumer runtime was added.

## Database / migration / config changes

None.

## Tests run

- `node --test tests/contracts/domain-event-envelope-v1.test.mjs` — passed, 2/2 tests.
- `node --check tests/contracts/domain-event-envelope-v1.test.mjs` — passed.
- `pnpm test:contracts` — 114/117 passed. Three unrelated existing autoscaling, Kubernetes-probes and workload-identity checks fail because their validators compare LF-only strings against the Windows CRLF checkout.
- `pnpm memory:check` — passed.
- `pnpm lint`, `pnpm typecheck` and the targeted Prettier check were attempted. Their `pnpm dlx` step fails locally with `EPERM: operation not permitted, realpath 'C:\\Users\\Sandeep'`; run authoritative Linux PR CI after push.
- `git diff --check` — passed.

## Known limitations / risks

- This change publishes a shared contract only. It does not implement an event bus, producer, consumer, delivery guarantees, or a domain payload.
- Schema validators must enable JSON Schema `date-time` format assertion to reject invalid timestamps.
- CGN-37 and other downstream consumers may integrate only after owner review of this versioned interface.

## Exact next step for next agent

Sandeep reviews and approves the version-1 envelope rules before downstream producer/consumer integration. Each producer ticket must define and validate its own payload schema without duplicating the common envelope.

## Rollback note

Revert the CGN-36 PR to restore the prior interface-only envelope. No runtime state or persistent data is changed.

## Engineering Memory updated

- [x] 03-contract-registry.md
- [ ] 04-decisions.md / ADR if needed
- [ ] 05-current-state.md (update after merge)
- [ ] 06-known-risks.md if needed

## Owner review and PR references

- GitHub PR URL: https://github.com/Sandeepagrahari78/career-growth-network/pull/44
- Commit / merge SHA: `9d4f109b010a84cb435dd8f3787a31885a91097f` (PR open; not merged)
- Jira live dependency/status verification: CGN-36 To Do, assigned to Sandeep, Highest; hard predecessor CGN-32 Done.
- Source and tests inspected on latest main: `ab1f041cab534f170c29cfae00dfc5f40f5197f0`; CGN-32 handoff and existing envelope/Career Activity interfaces reviewed.
- Required Sandeep review: pending.
