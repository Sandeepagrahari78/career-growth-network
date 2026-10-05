# Handoff - CGN-65

- Ticket: CGN-65
- Branch: CGN-65-changed-service-docker-registry
- Base branch: main
- Agent/person: ChatGPT implementation under Sandeep review
- Date: 2026-10-05

## What changed

Implemented changed-service Docker selection and zero-cost registry support.

PR CI now discovers Docker-capable services and builds only the affected service images. Main-branch Docker workflow uses the same selector and can publish immutable SHA-tagged images to GHCR only when explicitly enabled through the repository variable `CGN_ENABLE_GHCR=true`.

A local Docker Registry compose file is included as the ₹0 fallback.

## Files/modules changed

- `scripts/ci/changed-docker-services.mjs`
- `tests/contracts/docker-service-selection.contract.test.mjs`
- `.github/workflows/pr-ci.yml`
- `.github/workflows/docker-images.yml`
- `infra/docker/docker-compose.registry.yml`
- `docs/runbooks/local-registry.md`
- `docs/handoffs/CGN-65.md`

## Contracts changed

No product API/event contract changed. Added CI behavior for Docker service selection.

## Events produced / consumed

None.

## Database / migration / config changes

No database migration. Added local registry compose configuration and optional GHCR publication control.

## Tests run

PR CI must validate:
- branch/Jira scope
- Engineering Memory gate
- formatting/lint/typecheck/unit/contract/build
- changed-service selection contract tests
- Gitleaks/Semgrep/Trivy
- Docker Buildx build for each selected service
- health smoke for `health-demo`

## Known limitations / risks

- Only services with `services/<name>/Dockerfile` are considered Docker-capable.
- GHCR publish is disabled unless `CGN_ENABLE_GHCR=true` is explicitly configured.
- Registry quota/cost must be checked before enabling GHCR for sustained use.
- Container vulnerability/SBOM policy hardening belongs to CGN-91; this ticket only enables build/publish plumbing.
- Kubernetes runtime validation remains owned by CGN-41 and is currently blocked by its Jira dependency chain.

## Base synchronization note

CGN-283 capacity/SLO contract was merged to `main` as `b55dbc018162fa5f28b1b2732daf063af81ccc45` while this PR was open. This handoff update intentionally retriggers PR CI so the Docker/registry changes are validated against that newer main state before merge.

## Exact next step for next agent

After merge, start CGN-91 container/dependency security hardening and CGN-41 only when its infrastructure dependency is satisfied. Deployment consumers must use immutable SHA image tags.

## Rollback note

Revert the CGN-65 PR. Local registry data is developer-local and no paid/cloud registry is enabled by default.

## Engineering Memory updated

- [ ] 03-contract-registry.md (no product contract change)
- [ ] 04-decisions.md / ADR (no architecture change beyond approved Jira ticket)
- [ ] 05-current-state.md (update after merge)
- [ ] 06-known-risks.md (existing zero-budget registry risk documented here)
