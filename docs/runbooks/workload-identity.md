# Kubernetes ServiceAccount and IRSA Pattern Runbook

Ticket: CGN-61

## Purpose

CGN services use a dedicated Kubernetes ServiceAccount instead of silently falling back to the namespace `default` ServiceAccount. The reusable Helm chart disables ServiceAccount token automount by default.

This ticket also defines an AWS IRSA annotation pattern without creating AWS infrastructure.

## Default security posture

- `serviceAccount.create: true`
- ServiceAccount name defaults to the CGN service fullname.
- `automountServiceAccountToken: false` is enforced by the values schema.
- Pods explicitly reference the resolved ServiceAccount.
- If `serviceAccount.create=false`, an explicit existing ServiceAccount name is required.
- Raw `eks.amazonaws.com/role-arn` annotations are rejected; IRSA must use the structured workload-identity block.

## IRSA pattern

IRSA is disabled by default.

When enabled:

- the chart must own the ServiceAccount;
- a valid IAM role ARN identifier is required;
- the chart emits only the `eks.amazonaws.com/role-arn` annotation;
- no AWS provider, IAM role, access key, secret, EKS cluster, or paid cloud resource is created.

The repository contains a synthetic ARN fixture using account `123456789012` only for Helm rendering tests. It is not a credential and is never applied to AWS.

## Failure behavior

- external ServiceAccount with empty name -> Helm render fails;
- IRSA enabled without role ARN -> Helm render fails;
- IRSA enabled while the chart does not own the ServiceAccount -> Helm render fails;
- token automount set to true -> values schema fails;
- raw IRSA annotation bypass -> values schema fails.

## Validation

```bash
pnpm ci:workload-identity
pnpm test:contracts
```

Local Helm Validation also proves the dedicated ServiceAccount is installed in k3d, pod token automount stays false, and the synthetic IRSA annotation renders without creating cloud resources.

## Observability

Use Kubernetes-native state:

```bash
kubectl -n cgn-apps get serviceaccount cgn-health-demo -o yaml
kubectl -n cgn-apps get deployment cgn-health-demo -o yaml
kubectl -n cgn-apps get events --sort-by=.lastTimestamp
```

No product analytics event is emitted because workload identity is infrastructure configuration, not user state.

## Rollback

Disable or revert the CGN-61 chart changes. A future service requiring Kubernetes API access or real cloud workload identity must receive an explicit security-reviewed ticket; do not weaken the shared default silently.
