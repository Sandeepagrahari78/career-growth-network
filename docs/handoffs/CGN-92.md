# Handoff - CGN-92

- Ticket: CGN-92
- Branch: CGN-92-argocd-staging-gitops
- Base branch: main
- Agent/person: ChatGPT GitHub connector for Sandeep
- Date: 2026-10-06

## What changed

Added the zero-budget local-first Argo CD staging GitOps foundation.

This branch configures a staging Argo CD namespace, project and ApplicationSet for the approved CGN platform baseline path. It also adds static validation, local k3d/Argo CD smoke validation, a path-scoped main workflow, runbook and Engineering Memory updates.

## Files/modules changed

- `config/gitops/staging-gitops.v1.json`
- `infra/gitops/argocd/namespace.yaml`
- `infra/gitops/argocd/project-cgn-staging.yaml`
- `infra/gitops/argocd/applicationset-cgn-staging.yaml`
- `infra/gitops/argocd/kustomization.yaml`
- `scripts/ci/validate-argocd-staging.mjs`
- `scripts/infra/argocd-staging-smoke.sh`
- `tests/contracts/argocd-staging-gitops.contract.test.mjs`
- `.github/workflows/local-gitops.yml`
- `docs/runbooks/staging-gitops.md`
- `docs/engineering-memory/05-current-state.md`
- `docs/engineering-memory/06-known-risks.md`
- `package.json`

## Contracts changed

Added `cgn.staging-gitops.v1`.

The contract defines:

- Argo CD namespace: `argocd`
- Argo CD project: `cgn-staging`
- ApplicationSet: `cgn-staging-applications`
- approved source path: `infra/k8s/base`
- destination server: `https://kubernetes.default.svc`
- zero-budget/no-production/no-credential safety rules

## Events produced / consumed

None. This is infrastructure/GitOps configuration only.

## Database / migration / config changes

No database schema, migration or runtime DB role is introduced.

Configuration added:

- `config/gitops/staging-gitops.v1.json`

## Tests run

Expected validation:

- `pnpm ci:gitops`
- `pnpm test:contracts`
- PR CI / `pnpm ci:quick`
- After merge, path-scoped `Local GitOps Validation`

The local smoke installs Argo CD into a k3d cluster, applies the staging project/ApplicationSet, verifies the resources, and tears the cluster down.

## Known limitations / risks

- The CGN repository is private; persistent Argo CD sync requires a runtime repository credential or GitHub App integration.
- No repository credential is committed by design.
- This ticket validates GitOps wiring, not a public persistent staging host.
- Production deployment remains blocked behind owner-controlled release workflow.

## Exact next step for next agent

Open PR for this branch and let PR CI run. After merge, verify the path-scoped `Local GitOps Validation` workflow on main.

Then continue dependency chain with CGN-93 — Helm values promotion from staging to production — only after CGN-92 is green and merged.

## Rollback note

Rollback is repository-only plus local cluster deletion:

```bash
bash scripts/infra/k3d-down.sh
```

No cloud resource cleanup is required.

## Engineering Memory updated

- [ ] 03-contract-registry.md
- [ ] 04-decisions.md / ADR if needed
- [x] 05-current-state.md
- [x] 06-known-risks.md if needed
