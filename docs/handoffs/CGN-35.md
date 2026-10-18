# Handoff - CGN-35

- Ticket: CGN-35 — Define synchronous API versioning and error envelope
- Branch: `CGN-35-sync-api-versioning-error-envelope`
- Base branch: `main` at `d1f537a66df04cdcd022f28fcea0f8e9f337da65`
- Agent/person: Codex under Sandeep review
- Date: 2026-10-18

## What changed

Implemented the existing `http.error-envelope.v1` contract in the NestJS platform template. The global filter maps validation, unauthenticated, forbidden, not-found, unexpected server and other request errors to safe stable codes/messages, retains the HTTP status, and returns the correlation ID already set by the request middleware. It never returns exception text, validation values, stack traces or causes. Added the synchronous URL major-version policy, response fixtures, and live HTTP integration coverage.

No business route or product service was added. The health and readiness routes remain unchanged and unversioned.

## Files/modules changed

- `packages/contracts/src/http/error-envelope.v1.ts`
- `packages/contracts/package.json`
- `packages/contracts/fixtures/http/error-envelope.v1.json`
- `services/platform-template/package.json`
- `services/platform-template/README.md`
- `services/platform-template/src/http/api-exception.filter.ts`
- `services/platform-template/src/main.ts`
- `services/platform-template/test/docker-smoke.mjs`
- `services/platform-template/test/integration/http.test.mjs`
- `docs/contracts/synchronous-api-versioning.md`
- `docs/engineering-memory/03-contract-registry.md`
- `tests/contracts/http-error-envelope-v1.test.mjs`
- `pnpm-lock.yaml`
- `docs/handoffs/CGN-35.md`

## Contracts changed

Documented the existing envelope fields without removing or renaming `code`, `message`, optional `requestId`, or optional `details`. The `@cgn/contracts` workspace package now exposes its TypeScript contract entry point to consumers; the platform template consumes it through the workspace dependency. Added examples for HTTP 400, 401, 403, 404 and 500. URL policy uses a major path segment (`/v1/...`); additive changes remain compatible, while breaking changes require a migrated major path. No event contract changed.

## Events produced / consumed

None. Existing request completion telemetry continues to include request ID, method, status and duration.

## Database / migration / config changes

None. No database, service, business API route or infrastructure was created. Added only the shared workspace package dependency and package type export.

## Tests run

- `corepack pnpm --filter @cgn/platform-template test` — passed: build, 6 unit tests, and 3 HTTP integration tests, including all five mappings and secret/stack sanitization.
- `node --test tests/contracts/http-error-envelope-v1.test.mjs` — 2/2 passed.
- `corepack pnpm lint` and `corepack pnpm typecheck` — passed.
- Targeted Prettier 3.6.2 check — passed for all changed source, contract, test and documentation files.
- `corepack pnpm test:contracts` — 112/115 passed. Three unchanged validators fail because the Windows checkout uses CRLF while the existing validators compare LF-only text: autoscaling, Kubernetes probes and workload identity.
- `corepack pnpm ci:quick` — workspace, GitOps, Helm, Helm promotion and migration-job validations passed, then stopped at unchanged `scripts/ci/validate-kubernetes-probes.mjs:43` for that same CRLF/LF assertion.
- `corepack pnpm agent:context --ticket CGN-35 --domain platform` — passed after the lockfile dependencies were installed; generated context was read. Its default bundle is offline, so live Jira was separately checked through Jira MCP.
- Local running-service HTTP smoke — `/health` 200, `/ready` 200, unknown route 404 with the documented envelope and matching header/body request ID.
- Docker/k3d staging smoke — not run locally: Docker reports that its engine named pipe is absent, so the existing local cluster/image acceptance path cannot start. The repository's exact-candidate GitHub staging check remains a post-merge review gate; this work is not merged.
- `corepack pnpm memory:check` and exact-head Linux PR CI — pending.

## Known limitations / risks

- The platform template has no business endpoints; `/v1` is policy for future owning-ticket APIs, not a route introduced here.
- `details` is retained for compatibility but must remain allow-listed and non-sensitive.
- CGN-300 PR #42 is already merged. Review found its completion-evidence collector requires an exact-SHA staging artifact for every Jira-Done predecessor, even when that ticket's acceptance has no staging step. This can falsely block otherwise verified upstream work (for example CGN-34 for CGN-38 and CGN-32 for CGN-66). This finding is separate from CGN-35; no scheduler change or new scheduler ticket is included here.

## CGN-225 work carried forward before task switch

Live Jira on 2026-10-18 shows CGN-225 still `In Progress`, assigned to Sandeep, Rank `0|i001dr:`. Its linked hard prerequisites CGN-63, CGN-89 and CGN-99 are each `To Do`; CGN-283 is `Done`. The existing Jira discussion says the remaining work covers reproducible local/private staging, secret handling, immutable image promotion, backup/restore, monitoring and a repeatable synthetic capacity harness; it explicitly does not authorize cloud spend or a public production claim. No `docs/handoffs/CGN-225.md` exists on latest main. CGN-225 has no Jira dependency link to CGN-35, so its unfinished work does not block this contract ticket. The separate CGN-225 checkout and local `.cgn` artifacts were left untouched.

## Exact next step for next agent

Sandeep reviews the contract semantics and platform-template behavior, then merges only after PR CI and required staging evidence pass. Downstream API consumers must use the documented major-version and error policy and keep any detailed route/schema decisions in their owning Jira tickets. Continue CGN-225 separately when its three pending prerequisites are handled; do not infer that CGN-35 closed that infrastructure work.

## Rollback note

Revert the CGN-35 PR to restore the prior Nest default exception response. No persistent state or deployed resource is created.

## Engineering Memory updated

- [x] 03-contract-registry.md
- [ ] 04-decisions.md / ADR if needed
- [ ] 05-current-state.md (update after merge)
- [ ] 06-known-risks.md if needed

## Owner review and PR references

- GitHub PR URL: pending
- Commit / merge SHA: pending
- Jira live dependency/status verification: CGN-35 `To Do`, Sandeep, Rank `0|i0007j:`; only hard predecessor CGN-34 is `Done`, and its PR #38 merged to main at `86d25de432fccdfcd835b506f57fc51f0137621d`.
- Source and tests inspected on latest main: `d1f537a66df04cdcd022f28fcea0f8e9f337da65`; context bundle generated and read before implementation.
- Required Sandeep review: pending.
