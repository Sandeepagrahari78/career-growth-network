# Handoff - CGN-88

- Ticket: CGN-88 — Provision local Valkey or Redis cache
- Branch: CGN-88-local-valkey-cache
- Base branch: main (`9bb6f7d473af903fe2ed1ec5e4ad6427bda6bb7c`)
- Agent/person: Codex implementation under Sandeep review
- Date: 2026-10-19

## What changed

Added a pinned, local-only Valkey Compose service, an environment-configurable
password, a lifecycle CLI, and a TTL/restart smoke. Data lives in a dedicated
Compose volume and is explicitly documented as disposable cache state.

## Files/modules changed

- `infra/docker/docker-compose.valkey.yml`
- `scripts/infra/valkey-local.mjs`
- `scripts/ci/detect-changes.mjs`
- `.github/workflows/pr-ci.yml`
- `package.json`
- `tests/contracts/valkey-local.contract.test.mjs`
- `docs/runbooks/local-valkey.md`
- `docs/handoffs/CGN-88.md`
- `docs/engineering-memory/05-current-state.md`
- `docs/engineering-memory/06-known-risks.md`

## Contracts changed

No product API, database or event contract changed. The local cache remains an
infrastructure dependency and does not own canonical domain state.

## Events produced / consumed

None.

## Database / migration / config changes

No database, migration, paid infrastructure or committed secret was added.
Compose pins Valkey `9.1.2`, binds host port `16379` to loopback, uses a named
volume, enables append-only persistence for local recovery checks, and accepts
an optional `CGN_VALKEY_PASSWORD` environment value.

## Tests run

- Passed: `node --test tests/contracts/valkey-local.contract.test.mjs` (4/4).
- Full contract suite: 147 passed, 3 unrelated existing Windows newline-sensitive
  validators failed (CGN-45 probes, CGN-60 autoscaling, CGN-61 workload
  identity); the same baseline failures are recorded in the merged CGN-43
  handoff. The Linux PR CI contract suite passed.
- Passed: `docker compose -f infra/docker/docker-compose.valkey.yml config`;
  Docker emitted a local config-file access warning, but rendered the Compose
  model successfully.
- Passed: `node scripts/memory-check.mjs` after staging the 10 ticket files.
- Blocked locally: `node scripts/infra/valkey-local.mjs restart-smoke`; Docker
  CLI is installed, but the daemon pipe `npipe:////./pipe/docker_engine` is not
  available in this environment. The Docker-backed Valkey TTL/restart smoke
  passed in Linux PR CI.
- `pnpm` is not available on this Windows PATH; equivalent repository Node
  scripts were used locally. PR CI installs the pinned pnpm version.
- Passed: Linux PR CI run `39158003080` (run 226), including quality, security,
  Docker, end-to-end, performance and integration jobs.
- Passed: Local Helm Validation run `39158003197` (run 138).

## Known limitations / risks

- This is a single-node developer cache, not production availability or
  capacity evidence.
- Persistence is for reproducible local recovery checks; cache contents remain
  disposable and are not a source of truth.
- Docker daemon availability is environment-dependent.

## Exact next step for next agent

Sandeep reviews [PR #51](https://github.com/Sandeepagrahari78/career-growth-network/pull/51)
and required CI. Fix any CGN-88-owned CI failure. After review and merge, select
CGN-89 as the next Sandeep-owned ticket in the supplied order.

## Rollback note

Run `pnpm valkey:reset` to stop the scoped Compose project and remove only its
local data volume, then revert the CGN-88 PR.

## Engineering Memory updated

- [x] 05-current-state.md
- [x] 06-known-risks.md

## Owner review and PR references

- GitHub PR URL: https://github.com/Sandeepagrahari78/career-growth-network/pull/51
- CI-verified branch head: `17208e8391ceb2568ce8b5160dc5b10396286d4c`; merge pending
- Jira live dependency/status verification: CGN-43 Done; merged handoff and
  implementation are present on fetched `main` at `9bb6f7d`.
- Source and tests inspected on latest main: yes
- Required Sandeep review: required before merge
