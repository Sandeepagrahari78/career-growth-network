# CGN-44 - Helm Base Chart Runbook

## Scope

CGN-44 provides one reusable Helm application chart for the established CGN microservice workspaces. It proves the deployment mechanism with the existing `health-demo` service in local staging.

This ticket intentionally does not define probe standards, autoscaling/PDB defaults, service-account/IAM policy, production cloud resources, or product-specific service configuration. Those belong to CGN-45, CGN-60, CGN-61 and the owning service tickets.

## Source of truth

- Jira: CGN-44
- Contract: `config/kubernetes/helm-base.v1.json`
- Chart: `infra/helm/cgn-service/`
- Staging example: `infra/helm/values/health-demo-staging.yaml`
- Static validator: `scripts/ci/validate-helm-base.mjs`
- Runtime smoke: `scripts/infra/helm-base-smoke.sh`
- Main workflow: `.github/workflows/local-helm.yml`

## Validation

Static:

```bash
pnpm ci:helm
pnpm test:contracts
```

Runtime, after Docker/k3d/kubectl/Helm are installed:

```bash
bash scripts/infra/k3d-up.sh
bash scripts/infra/helm-base-smoke.sh
bash scripts/infra/k3d-down.sh
```

The runtime smoke builds the existing health-demo image, imports it into k3d, installs it through the reusable chart, waits for rollout, and verifies `/health` and `/ready` through a local port-forward.

## Safety

- ClusterIP only.
- No cloud provider or paid resource.
- No committed secret.
- No production deployment.
- Probe/HPA/PDB/service-account standards are not invented by this ticket.

## Rollback

Uninstall the test release and delete the local cluster:

```bash
helm uninstall cgn-health-demo -n cgn-apps || true
bash scripts/infra/k3d-down.sh
```
