# Platform / CI/CD / Deployment

**Existing files:** `.github/workflows/pr-ci.yml` (PR CI); `.github/workflows/main-ci.yml`; `scripts/ci/` (validators); `infra/k8s/`, `infra/helm/`, `infra/gitops/`, `infra/terraform/` (local-first infrastructure).

**Validated now:** CI checks for engineering memory, unit/contract/format/lint/security, affected-path Docker/Kubernetes/DB/integration gates; health-demo image smoke, local Helm/Kubernetes tests, ephemeral staging, rollback rehearsal.

**Not validated:** live production deploy, persistent remote GitOps, full user journey E2E, realistic 5,000-user load/soak. Release/rollback are dry-run only.

**PR policy:** the CGN-285 handoff gate checks that changed source is paired with a matching `docs/handoffs/CGN-NNN.md`; never bypass tests for speed. The current private repo cannot enforce main protection as a GitHub Free repository; policy remains owner review and PR-only merges.

[CI runbook](../runbooks/ci-cd-pipeline.md) · [Engineering Memory](../engineering-memory/05-current-state.md)
