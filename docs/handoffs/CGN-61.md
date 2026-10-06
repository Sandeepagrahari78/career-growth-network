# Handoff - CGN-61

- Ticket: CGN-61
- Branch: CGN-61-service-account-irsa-pattern
- Base branch: main
- Date: 2026-10-07

## What changed

Added the dedicated Kubernetes ServiceAccount and AWS IRSA configuration pattern to the reusable CGN Helm chart.

## Security defaults

- dedicated ServiceAccount created by default;
- pod token automount fixed to false;
- no silent fallback to the namespace default ServiceAccount;
- structured IRSA field owns the reserved role-ARN annotation;
- no AWS resource, IAM role, cloud provider, credential, or Secret is created.

## Tests/checks expected

- `pnpm ci:workload-identity`
- `pnpm ci:quick`
- contract tests
- schema rejection for token automount=true
- schema rejection for raw IRSA annotation bypass
- Helm failure for missing existing ServiceAccount name
- Helm failure for IRSA missing role ARN
- template-only synthetic IRSA rendering
- local k3d ServiceAccount/pod binding checks
- PR CI/security scans
- post-merge Main CI / Local Helm / staging validation

## Scope

No product API/schema/event change. No cross-service database access. No real AWS account integration. Real cloud IAM provisioning remains separately approval-gated.

## Exact next step

After green merge, inspect remaining CGN-7 child tickets and the release-readiness dependency chain before starting the next ticket.
