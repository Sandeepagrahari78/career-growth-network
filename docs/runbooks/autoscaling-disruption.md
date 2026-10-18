# HPA and PodDisruptionBudget Runbook

Ticket: CGN-60

## Purpose

CGN's reusable Helm chart now supports Kubernetes `autoscaling/v2` HorizontalPodAutoscaler and `policy/v1` PodDisruptionBudget resources.

The approved capacity contract remains the source for utilization triggers:

- CPU scale trigger: 70%
- memory scale trigger: 75%
- observation window: 5 minutes
- capacity evidence owner for full 5K validation: CGN-284

## Replica bounds

Generic autoscaling defaults are **disabled** and generic `minReplicas` / `maxReplicas` are intentionally unset.

This avoids inventing production capacity before service-specific load evidence exists. When autoscaling is enabled, Helm fails rendering unless replica bounds are explicitly supplied.

The local-staging validation fixture uses 2–4 replicas only to prove Kubernetes wiring. It is not a production sizing claim.

## PodDisruptionBudget

The chart supports a PDB with `minAvailable: 1`. It is disabled by default and enabled by the local validation overlay.

A voluntary eviction that would violate the PDB is rejected by Kubernetes.

## Failure behavior

- missing HPA replica bounds: Helm render fails;
- utilization target outside 1–100: values schema fails;
- unavailable resource metric: HPA surfaces its condition and retains the current replica state rather than inventing capacity;
- voluntary disruption below PDB budget: eviction is denied.

## Validation

```bash
pnpm ci:autoscaling
pnpm test:contracts
```

Local Helm Validation additionally proves:

- invalid CPU target is rejected;
- HPA and PDB render from the existing CGN-44 chart;
- HPA points to the health-demo Deployment;
- CPU and memory targets are 70/75;
- PDB exists with `minAvailable: 1`;
- health-demo still rolls out with CGN-45 probes.

## Resource request/limit policy and evidence

The health-demo staging profile declares CPU request/limit `50m/500m` and
memory request/limit `64Mi/256Mi`. The Helm values schema requires CPU and
memory together in both requests and limits whenever a service supplies a
resource profile. This keeps the chart generic while rejecting incomplete
profiles; services must use their own representative workload to size them.

The PR performance job runs a shortened 25 RPS health-demo profile with a
100-VU pool configured, then repeats it while a disposable process holds 64 MiB
and consumes CPU inside the same container capped at the declared limits. Its
GitHub Actions step summary reports request utilization and remaining limit
headroom. This staging-only health-demo evidence does not exercise a
5,000-account dataset or prove sustained HPA behavior or production capacity.
CGN-284 remains responsible for full synthetic-user load and soak evidence.

## Observability

Operational signals are Kubernetes-native:

```bash
kubectl -n cgn-apps get hpa cgn-health-demo
kubectl -n cgn-apps describe hpa cgn-health-demo
kubectl -n cgn-apps get pdb cgn-health-demo
kubectl -n cgn-apps get events --sort-by=.lastTimestamp
```

Full load/soak dashboards and evidence remain CGN-284.

## Rollback

Disable `autoscaling.enabled` and `disruptionBudget.enabled`, or revert the CGN-60 merge. The Deployment then returns to explicit `replicaCount` ownership.

CGN-61 remains the owner for ServiceAccount/IAM policy.
