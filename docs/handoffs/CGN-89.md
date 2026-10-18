# Handoff - CGN-89

- Ticket: CGN-89 — Provision SeaweedFS S3-compatible evidence storage
- Branch: CGN-89-seaweedfs-storage
- Base branch: `main` at `61bb85267c7f93e76231e279f5d7c171a2860a6c`
- Agent/person: Codex implementation under Sandeep review
- Date: 2026-10-19

## What changed

Added a pinned SeaweedFS 4.46 local S3-compatible service with loopback-only
host exposure, reproducible private bucket initialization, a bucket-scoped
application identity and a persistent Compose volume. Added CLI commands for
up, verify, restart-smoke, down and reset. The smoke exercises authenticated
put/get/head, anonymous denial, cross-bucket denial and persistence after
container restart.

## Files/modules changed

- `infra/docker/docker-compose.seaweedfs.yml`
- `scripts/infra/seaweedfs-local.mjs`
- `scripts/ci/detect-changes.mjs`
- `.github/workflows/pr-ci.yml`
- `.gitignore`
- `package.json`
- `tests/contracts/seaweedfs-local.contract.test.mjs`
- `docs/runbooks/local-seaweedfs.md`
- `docs/handoffs/CGN-89.md`
- `docs/engineering-memory/05-current-state.md`

## Contracts changed

No product API, database or event contract change is planned. The service is an
infrastructure-owned local S3-compatible development dependency.

## Events produced / consumed

None.

## Database / migration / config changes

No product database or migration. Local Compose config and ignored generated
credentials only; no cloud resources or paid services.

## Tests run

- Passed: `node --check scripts/infra/seaweedfs-local.mjs`.
- Passed: `node --test tests/contracts/seaweedfs-local.contract.test.mjs` (4/4).
- Passed: `git diff --check`.
- Passed: `docker compose -f infra/docker/docker-compose.seaweedfs.yml config`;
  the local Docker config file emitted an access warning, but the Compose model
  rendered successfully.
- Blocked locally: `node scripts/infra/seaweedfs-local.mjs restart-smoke`;
  `docker info` cannot connect to the Windows Docker daemon in this environment.
  Linux PR CI is configured to run the full S3 and restart smoke.
- Local Prettier could not run because Corepack failed resolving the Windows
  user directory (`EPERM: realpath C:\Users\Sandeep`); PR CI is authoritative.
- First PR CI run `39160657706` found missing explicit Node global imports and
  an ESLint curly-brace error; the branch now contains those fixes and the full
  CI suite is being rerun.
- Main CI, exact-candidate staging validation and owner review: pending.

## Known limitations / risks

The local SeaweedFS service is single-node development infrastructure, not
production availability, encryption-at-rest, backup or disaster-recovery
evidence.

## Exact next step for next agent

Sandeep reviews the CGN-89 PR after Linux PR CI passes. Confirm Main CI and
exact-candidate staging validation after merge, then reconcile Jira. Re-check
the live owner and dependency graph before the next listed ticket; CGN-90
remains assigned to Tanvi.

## Rollback note

Run `pnpm seaweedfs:reset` to stop the scoped Compose project and remove only its
local data volume, then revert the CGN-89 PR. Generated files stay under the
ignored `.cgn/seaweedfs/` directory.

## Engineering Memory updated

- [x] 05-current-state.md
