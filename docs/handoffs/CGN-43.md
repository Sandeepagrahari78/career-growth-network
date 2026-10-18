# Handoff - CGN-43

- Ticket: CGN-43 — Provision local Kafka-compatible event bus with Redpanda
- Branch: CGN-43-local-redpanda-event-bus
- Base branch: main
- Agent/person: Codex implementation under Sandeep review
- Date: 2026-10-18

## What changed

Added a local pinned Redpanda Compose service with loopback-only host ports and
persistent broker data. A lifecycle CLI verifies readiness and topic creation,
then publishes an existing versioned event fixture, restarts Redpanda and
checks that the exact event ID remains consumable. Stop preserves data; reset
removes only the volume scoped to this Compose project.

## Files/modules changed

- `infra/docker/docker-compose.redpanda.yml`
- `scripts/infra/redpanda-local.mjs`
- `scripts/ci/detect-changes.mjs`
- `.github/workflows/pr-ci.yml`
- `package.json`
- `tests/contracts/redpanda-local.contract.test.mjs`
- `docs/runbooks/local-redpanda.md`
- `docs/handoffs/CGN-43.md`

## Contracts changed

No product API or event contract changed. Smoke verification consumes the
existing `domain.event.envelope.v1` fixture. The smoke topic is infrastructure
test data only; product topic names remain subject to owning-service contract
registration.

## Events produced / consumed

The local/CI restart smoke publishes and consumes one fixture-shaped
`career.activity.recorded` event (envelope version 1) on
`cgn.contract-smoke.v1`. No application service is wired to the broker.

## Database / migration / config changes

No database, migration, paid infrastructure, or secret configuration was
added. Compose uses Redpanda `v24.2.10`, loopback host ports 19092/19644, and a
named data volume. Runbook documents versioned topic naming and bounded retry /
DLQ handling expectations for future owning-service tickets.

## Tests run

- Passed: focused Redpanda and event-envelope contract tests (6 tests).
- Passed: Prettier check for changed files.
- Passed: TypeScript compile check for the existing health-demo project.
- Passed: `docker compose config` for the new broker file.
- Passed: `pnpm memory:check`.
- Full contract suite: 131 passed, 3 unrelated existing Windows newline-sensitive
  validator tests failed (CGN-60 autoscaling, CGN-45 probes, CGN-61 workload
  identity); Linux PR CI remains authoritative for these checks.
- Local broker restart smoke could not run because this Windows environment has
  no Docker daemon. The GitHub Linux Docker integration job passed the same
  publish, broker restart, recovery, and scoped-volume cleanup smoke.
- Full Linux PR CI quality gate (`pnpm ci:quick`), security scans, Terraform
  validation, and integration stack passed for implementation commit `c20fc55`.

## Known limitations / risks

- Single-node local Redpanda is for development and test, not production HA.
- Retry and DLQ topic creation, retention, consumer backoff, replay, and alerts
  remain owned by future service tickets.
- Local Docker engine availability depends on the developer environment.

## Exact next step for next agent

Sandeep should review the PR and inspect the green PR CI run. Future service
owners must register their own topic/event contract and implement bounded
retry/DLQ handling before connecting application producers or consumers.

## Rollback note

Run `pnpm redpanda:reset` to stop the scoped Compose project and remove its
local data volume, then revert the CGN-43 PR. The command does not prune or
remove unrelated Docker volumes.

## Engineering Memory updated

- [ ] 03-contract-registry.md (no product contract change)
- [ ] 04-decisions.md / ADR if needed
- [ ] 05-current-state.md
- [ ] 06-known-risks.md if needed

## Owner review and PR references

- GitHub PR URL: https://github.com/Sandeepagrahari78/career-growth-network/pull/45
- Commit / merge SHA: implementation commit `c20fc55db3eb9df06f7d2a2d12aa103593fb306f`; merge pending
- Jira live dependency/status verification: CGN-43 To Do, Sandeep, Highest;
  CGN-36 Done and its merge is present in fresh main.
- Source and tests inspected on latest main: yes
- Required Sandeep review (if sensitive): required before merge
