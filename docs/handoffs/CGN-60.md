# Handoff - CGN-60

- Ticket: CGN-60
- Branch: CGN-60-hpa-pdb-defaults
- Base branch: main
- Date: 2026-10-07

## What changed

Added HPA and PodDisruptionBudget support to the reusable CGN Helm chart.

HPA CPU/memory targets come directly from the approved CGN-283 capacity contract. Replica bounds remain service/evidence-specific instead of being invented as production truth.

## Files/modules

- `config/kubernetes/autoscaling-disruption.v1.json`
- `infra/helm/cgn-service/values.yaml`
- `infra/helm/cgn-service/values.schema.json`
- `infra/helm/cgn-service/templates/deployment.yaml`
- `infra/helm/cgn-service/templates/hpa.yaml`
- `infra/helm/cgn-service/templates/pdb.yaml`
- local Helm smoke fixtures and validation
- tests/contracts
- package CI scripts
- runbook and Engineering Memory

## Tests/checks expected

- `pnpm ci:autoscaling`
- `pnpm ci:quick`
- contract tests
- invalid HPA target rejection
- Helm lint/template
- local k3d HPA/PDB installation
- PR CI security scans
- post-merge Main CI / Local Helm / staging validation

## Scope

No product API/schema/event changes. No cross-service DB access. No cloud resource or paid service. No production sizing claim. CGN-61 still owns ServiceAccount/IAM.

## Exact next step

After green merge, continue CGN-61 Kubernetes service-account and cloud-IAM-safe pattern.
