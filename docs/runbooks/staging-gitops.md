# CGN-92 - Staging GitOps Runbook

## Scope

This runbook covers the zero-budget local-first Argo CD staging GitOps foundation for CGN.
For the combined local beta operations, resource worksheet, persistence checks,
and provider-neutral migration map, see the [CGN-225 beta infrastructure
runbook](beta-infrastructure-and-cloud-migration.md).

CGN-92 installs and validates Argo CD in a local k3d cluster and configures a staging `ApplicationSet` for approved platform baseline manifests. It does **not** create a public staging host, production deployment, cloud Kubernetes cluster, or committed repository credential.

## Source of truth

- Jira ticket: CGN-92
- GitOps contract: `config/gitops/staging-gitops.v1.json`
- Argo CD manifests: `infra/gitops/argocd/`
- Static validator: `scripts/ci/validate-argocd-staging.mjs`
- Local smoke: `scripts/infra/argocd-staging-smoke.sh`
- Main validation workflow: `.github/workflows/local-gitops.yml`

## Local validation

Run from the repository root after Docker, k3d and kubectl are available:

```bash
pnpm ci:gitops
bash scripts/infra/k3d-up.sh
bash scripts/infra/argocd-staging-smoke.sh
bash scripts/infra/k3d-down.sh
```

## CI behavior

PR CI runs the static GitOps contract validation through `pnpm ci:quick`.

After merge to `main`, the path-scoped **Local GitOps Validation** workflow runs when GitOps files, Argo CD validation scripts, or this workflow change. It creates a local k3d cluster, installs Argo CD, applies the CGN staging project and ApplicationSet, verifies the resources, and destroys the cluster even when validation fails.

## Safety rules

- No paid cloud service is provisioned.
- No AWS EKS, GKE, AKS, public load balancer, or cloud secret is created.
- No GitHub repository credential is committed.
- The ApplicationSet points only at approved staging source paths.
- Production deployment remains a separate owner-controlled manual release gate.

## Known limitation

As of 2026-10-20, the live GitHub repository response reports the source repository as public. Read-only cloning therefore does not require a private-repository credential. This does not prove persistent staging sync or create a public staging host. If repository visibility changes to private, configure an approved read-only runtime credential or GitHub App; never commit it. No credential or visibility setting is changed by this runbook.

## Rollback

Rollback is repository-only plus local cluster deletion:

```bash
bash scripts/infra/k3d-down.sh
```

If this change causes CI issues, revert the CGN-92 PR. No cloud resource cleanup is required because this ticket creates none.
