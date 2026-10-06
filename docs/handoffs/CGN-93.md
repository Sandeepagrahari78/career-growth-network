# Handoff - CGN-93

- Ticket: CGN-93
- Branch: CGN-93-helm-values-promotion
- Base branch: main
- Agent/person: ChatGPT GitHub connector for Sandeep
- Date: 2026-10-06

## What changed

Added a zero-budget Helm staging-to-production promotion pattern around the existing health-demo deployment artifact.

The pattern proves that staging and production candidates use the same immutable SHA-tagged artifact while allowing only controlled environment sizing differences. Production remains render-only until a real production target is separately approved.

## Files/modules changed

- `config/gitops/helm-promotion.v1.json`
- `infra/helm/health-demo/**`
- `scripts/ci/validate-helm-promotion.mjs`
- `scripts/infra/render-helm-promotion.mjs`
- `tests/contracts/helm-promotion.contract.test.mjs`
- `.github/workflows/helm-promotion.yml`
- `docs/runbooks/helm-promotion.md`
- Engineering Memory files
- `package.json`

## Contracts changed

Added `cgn.helm-promotion.v1`.

It requires an exact main SHA, immutable `sha-<commit>` image tags, one artifact across staging/production, manual production approval, and no automatic real production deployment.

## Events produced / consumed

None.

## Database / migration / config changes

No product database schema or migration is introduced.

## Tests run

Expected:

- `pnpm ci:helm`
- contract tests
- PR CI / `pnpm ci:quick`
- Helm lint and staging/production template render in `Helm Promotion Validation`
- post-merge main Helm validation

## Known limitations / risks

- This is a deployment-pattern proof using health-demo, not a public production deployment.
- No real production cluster/registry secret is configured.
- Runtime database migration orchestration is owned by CGN-94.

## Exact next step for next agent

After this PR is green and merged, complete CGN-94 database migration Job pattern and wire it into the controlled deployment dry-run.

## Rollback note

Repository revert only; generated render evidence is ephemeral.

## Engineering Memory updated

- [x] 03-contract-registry.md
- [ ] 04-decisions.md / ADR if needed
- [x] 05-current-state.md
- [x] 06-known-risks.md if needed
