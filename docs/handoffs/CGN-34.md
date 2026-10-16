# Handoff - CGN-34

- Ticket: CGN-34
- Branch: CGN-34-nestjs-golden-template
- Base branch: main
- Agent/person: Codex under Sandeep review
- Date: 2026-10-17

## What changed

Implemented the reusable `@cgn/platform-template` NestJS service with validated runtime configuration, privacy-safe structured logs, request correlation, graceful shutdown, `/health`, `/ready`, and safe unknown-route behavior. Added unit, HTTP integration and Docker acceptance scripts, a minimal container, local k3d Helm values and an isolated namespace smoke script. CI now selects the service Docker image and includes its Docker and local Kubernetes acceptance paths.

During continuation, tightened structured logging so free-form framework messages cannot pass through merely because they contain plain characters, corrected the README k3d command, fixed the Docker smoke's repo-root context, and made Docker/k3d readiness polling use an event-loop-safe timeout so cleanup runs on connection failures.

## Files/modules changed

- `services/platform-template/` (NestJS source, tests, Dockerfile, package manifest, TypeScript config and README)
- `infra/helm/values/platform-template-cgn34-staging.yaml`
- `scripts/infra/k3d-platform-template-smoke.mjs`
- `.github/workflows/pr-ci.yml`
- `scripts/ci/detect-changes.mjs`
- root `package.json`, `pnpm-lock.yaml`, `eslint.config.js`
- `docs/engineering-memory/04-decisions.md`
- `docs/handoffs/CGN-34.md`

## Contracts changed

None. No business API, event, database or authentication contract was added. The new service remains a platform reference package and does not depend on another service.

## Events produced / consumed

None. Request and lifecycle logs are operational telemetry only; there is no product-state event.

## Database / migration / config changes

No database or migration. Added service runtime defaults in Helm values and CI/local tooling only. The acceptance script deploys into a uniquely named temporary namespace on an existing `cgn-local` cluster and deletes only that namespace.

## Tests run

- `pnpm --filter @cgn/platform-template test`: passed, including build, 6 unit tests and 2 HTTP integration tests.
- `pnpm --filter @cgn/platform-template test:docker`: passed; checks health, readiness, unknown-route response, invalid configuration and clean SIGTERM shutdown.
- `docker build -f services/platform-template/Dockerfile -t cgn-platform-template:cgn34 .`: passed.
- `node scripts/infra/k3d-platform-template-smoke.mjs`: passed on existing `cgn-local`; deployment rolled out with `/health` startup/liveness and `/ready` readiness probes, both health routes returned 200, the unknown route returned 404, and temporary namespace `cgn-cgn34-staging-21784` was deleted.
- Root `pnpm lint` and `pnpm typecheck`: passed.
- Targeted Prettier check for all CGN-34 files and `node --check` on both smoke scripts: passed.
- `pnpm ci:quick`: stopped at the existing CGN-45 probe validator on Windows because it searches for LF-only YAML text while this checkout uses CRLF. Earlier boundary, GitOps, Helm, Helm promotion and migration-job validators passed.
- `pnpm test:contracts`: 79 passed, 3 failed in existing CGN-45/CGN-60/CGN-61 validators for the same LF-only text assertion on CRLF files.
- Root `format:check`: fails on 95 repository files in this Windows checkout due to CRLF differences; all CGN-34 files pass the targeted formatter check. The failure includes untouched baseline files.
- `pnpm memory:check`: passed after the handoff was added; no Engineering Memory changes are required for unmerged branch state.

## Known limitations / risks

- CGN-34 remains To Do in live Jira until PR CI, technical review, merge and post-merge checks are complete.
- Current Windows checkout line endings trigger false negatives in several existing YAML text validators; Ubuntu CI reads LF files and remains the authoritative CI result.
- The local `pnpm` wrapper is in `.cgn/bin`; nested pnpm scripts require that directory on `PATH` in this shell.
- Local Docker configuration/tool cache files under `.cgn/` are workstation artifacts and must not be committed.

## Exact next step for next agent

Run the full PR CI on Linux (or repair the legacy YAML assertions to normalize CRLF without weakening their checks), then review the diff, push the feature branch and open a PR for Sandeep's review. Keep CGN-35/36 contract work separate.

## Rollback note

Revert the CGN-34 PR. The implementation creates no persistent cloud, database or user state; the smoke script removes only its temporary namespace in a `finally` cleanup.

## Engineering Memory updated

- [x] 04-decisions.md (approved scope record)
- [ ] 03-contract-registry.md (no contract change)
- [ ] 05-current-state.md (merged-state file; update only after merge)
- [ ] 06-known-risks.md (no new architecture risk beyond staging acceptance limitation recorded here)
