# Handoff - CGN-44

- Ticket: CGN-44
- Branch: CGN-44-helm-base-chart
- Base branch: main
- Agent/person: ChatGPT GitHub connector for Sandeep
- Date: 2026-10-06

## What changed

Added a reusable Helm base chart for the established CGN microservice workspaces and a real local-staging smoke using the existing health-demo service.

## Files/modules changed

- `config/kubernetes/helm-base.v1.json`
- `infra/helm/cgn-service/**`
- `infra/helm/values/health-demo-staging.yaml`
- `scripts/ci/validate-helm-base.mjs`
- `scripts/infra/helm-base-smoke.sh`
- `tests/contracts/helm-base-chart.contract.test.mjs`
- `.github/workflows/local-helm.yml`
- `docs/runbooks/helm-base-chart.md`
- `package.json`
- Engineering Memory

## Contracts changed

Added `cgn.helm-base.v1`.

## Events produced / consumed

None.

## Database / migration / config changes

No database schema or migration.

## Tests run

Expected:
- `pnpm ci:helm`
- `pnpm ci:quick`
- contract tests
- PR CI
- post-merge Local Helm Validation

## Known limitations / risks

Probe standards, HPA/PDB defaults and service-account/IAM policy are deliberately deferred to their owning Jira tickets. Only health-demo currently has a runnable service image for deployment smoke.

## Exact next step for next agent

After merge and post-merge validation, continue with CGN-93 Helm values promotion. Do not add production auto-deploy.

## Rollback note

Repository revert plus local Helm uninstall/k3d deletion.

## Engineering Memory updated

- [x] 03-contract-registry.md
- [x] 05-current-state.md
- [x] 06-known-risks.md
