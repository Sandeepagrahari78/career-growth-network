# Kubernetes Probe Standards Runbook

Ticket: CGN-45

## Standard

The reusable `infra/helm/cgn-service` chart supports HTTP startup, readiness, and liveness probes on the named `http` container port.

Generic chart defaults keep probes disabled because most CGN service workspaces do not yet have runnable endpoint implementations. A service may enable the standard only after its health endpoints exist. The runnable health-demo staging and promotion values enable the probes now.

Default health-demo mapping:

- startup: `GET /health`
- readiness: `GET /ready`
- liveness: `GET /health`

## Failure behavior

- Startup failure causes Kubernetes to restart the container after the configured threshold. Until startup succeeds, normal liveness/readiness probing is gated by Kubernetes.
- Readiness failure removes the pod from Service endpoints without treating the process as dead.
- Liveness failure causes Kubernetes to restart the container.

The chart uses HTTP probes only. Exec and TCP-socket probe patterns are intentionally not part of CGN-45.

## Validation

```bash
pnpm ci:probes
pnpm test:contracts
```

The Local Helm Validation workflow also proves:

- invalid probe paths are rejected by Helm schema validation;
- the health-demo chart installs into local k3d;
- startup/readiness/liveness paths are present on the Deployment;
- `/health` and `/ready` are reachable after rollout.

## Observability

Probe results are surfaced by Kubernetes pod status and events. Useful commands:

```bash
kubectl -n cgn-apps describe pod -l app.kubernetes.io/name=cgn-health-demo
kubectl -n cgn-apps get events --sort-by=.lastTimestamp
kubectl -n cgn-apps get pods
```

No product analytics event is emitted because probes are infrastructure health signals, not user/product state changes.

## Security and rollback

Probe endpoints are accessed inside the pod network using the named container port. This ticket creates no public endpoint, credential, cloud resource, or cross-service database read.

Rollback is a repository revert. Disabling `probes.enabled` restores the pre-CGN-45 pod shape.

## Next dependency

CGN-60 owns HPA and PodDisruptionBudget defaults. CGN-61 owns service accounts/IAM patterns.
