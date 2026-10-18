# Handoff - CGN-37

- Ticket: CGN-37 — Implement transactional outbox reference library
- Branch: `CGN-37-transactional-outbox-reference`
- Base branch: `main` at `d05d47df8c7e0877727c02d0ae1fe9d2eaa31a91`
- Agent/person: Codex implementation under Sandeep ownership
- Date: 2026-10-18

## What changed

Adds a transaction-aware PostgreSQL outbox reference in the existing platform
template. Producers pass their own service transaction when enqueuing, so a
domain write and event row commit or roll back together. Workers use bounded
`FOR UPDATE SKIP LOCKED` claims and expiring leases, publish the unchanged
versioned event, then mark it published. A crash after publish can redeliver
the same `eventId`, documenting at-least-once delivery. Transient failures use
bounded retry; after eight claims the row is durably dead-lettered with a safe
error code.

The proposed future extraction path is `packages/platform-outbox/`. This ticket
keeps the implementation in `services/platform-template/src/outbox/`, within
the Jira-owned implementation boundary. Extraction needs a separate owning
ticket and package-boundary review.

## Files/modules changed

- `services/platform-template/src/outbox/outbox.ts`
- `services/platform-template/migrations/001_transactional_outbox.sql`
- `services/platform-template/test/unit/outbox.test.mjs`
- `services/platform-template/test/integration/outbox.postgres.test.mjs`
- `services/platform-template/README.md`
- `docs/handoffs/CGN-37.md`

## Contracts changed

No shared API or event contract changed. The helper consumes the existing
`DomainEventEnvelopeV1` from `@cgn/contracts`. The reference migration must be
applied inside each consumer's own service database through that service's
migration job; this ticket adds no shared database or cross-service access.

## Events produced / consumed

The helper stores and publishes the caller-supplied version-1 event envelope.
It does not create a producer, consumer, broker connection, or product event
type. Publisher adapters remain owned by the integrating service.

## Database / migration / config changes

Adds a reference migration for `cgn_outbox_events` with durable available,
lease, attempt, publication and dead-letter state. It is not applied to any
runtime database by this change. Each service owner must include the schema in
its own reviewed migration. No secret, new database, paid infrastructure or
production configuration was added.

## Tests run

- Passed: platform-template TypeScript build with the checked-out TypeScript
  5.9.3 dependency.
- Passed: `node --test services/platform-template/test/unit/*.test.mjs` — 11/11.
- Passed: `node --test services/platform-template/test/integration/*.test.mjs` —
  3 passed; the PostgreSQL outbox integration test was skipped because this
  machine has no Docker daemon.
- Passed: `node --check` for both new test files.
- Applied repo-pinned Prettier 3.6.2 to the implementation and both test files.
- PostgreSQL integration tests use a uniquely named Docker Compose project and
  cover atomic domain/outbox commit and rollback, two concurrent disjoint worker
  claims, and same-ID redelivery by a restarted worker after publish-before-ack
  crash. Linux PR CI must run these real-database cases.
- Passed: `git diff --cached --check`.
- `node scripts/memory-check.mjs` reported no Engineering Memory files need
  updating; no shared contract or merged-state record changed.
- `pnpm memory:check` was attempted, but pnpm's dependency sync reached
  registry.npmjs.org and received `EACCES`; the direct Node check above
  completed.
- Initial exact-head PR CI runs identified Prettier formatting and five ESLint
  brace-rule findings in the integration harness. Both were fixed; the current
  head must pass a fresh CI run before review.
- The next PostgreSQL CI run passed the atomic commit/rollback case and exposed
  psql's command tag in the two-worker and restart result parsing. The test now
  runs psql in quiet mode; the updated real-database cases must pass on the
  current head.
- `pnpm ci:quick` could not complete locally because pnpm dependency sync
  received `EACCES` from registry.npmjs.org. Linux PR CI remains authoritative.

## Known limitations / risks

- Delivery is at least once; consumers must deduplicate by `eventId`. Exactly
  once across PostgreSQL and a broker is not claimed.
- The helper uses a generic SQL client and does not select a PostgreSQL driver or
  broker adapter for services.
- The reference migration must be installed in the owning service database
  before the helper is used there.

## Exact next step for next agent

Review the exact-head PR CI, especially platform-template unit tests and the
PostgreSQL integration scenarios. Integrating services should call `enqueue`
inside their own domain transaction, apply the reference schema with their own
migration, configure a bounded worker lease, and implement their authorized
publisher adapter. Consumers should deduplicate by the stable event ID.

## Rollback note

Revert this PR. No runtime database was migrated. If a service later applies the
reference migration, that service must plan its own table retention/removal
before rolling back its migration.

## Engineering Memory updated

- [x] 03-contract-registry.md — no shared contract changed
- [ ] 04-decisions.md / ADR — no architecture decision changed
- [ ] 05-current-state.md — update only after merge if the helper becomes merged
  implementation truth
- [ ] 06-known-risks.md — at-least-once behavior is recorded above

## Owner review and PR references

- GitHub PR URL: https://github.com/Sandeepagrahari78/career-growth-network/pull/46
- Implementation commit: `cfadba8c723bd4852a80ab3e9c9a7b1caa0d5ed3`; merge pending.
- Jira live dependency/status verification: CGN-37 In Review after the PR opened
  and delivery sync ran; assignee remains Sandeep. Explicit blockers CGN-36,
  CGN-42, CGN-43 were all Done on 2026-10-18. Jira Rank is priority, not an
  additional blocker. No manual Jira status or assignee change was made.
- Source and tests inspected on latest main: `d05d47df8c7e0877727c02d0ae1fe9d2eaa31a91`
- Required Sandeep review: pending
