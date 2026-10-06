# Handoff - CGN-45

- Ticket: CGN-45
- Branch: CGN-45-kubernetes-probe-standards
- Base branch: main
- Date: 2026-10-07

## What changed

Added configurable startup, readiness and liveness standards to the existing CGN-44 reusable Helm chart.

Health-demo staging, promotion-staging and production-candidate values explicitly enable the standard. Generic chart defaults remain disabled until each owning service implements compatible health endpoints.

## Contracts

Added `cgn.kubernetes-probes.v1`.

## Validation

- static probe contract validation
- contract test
- negative invalid-path fixture
- Helm schema rejection in local Helm smoke
- k3d install/rollout
- Deployment probe-path assertions
- existing `/health` and `/ready` runtime smoke

Unit/business-rule tests beyond configuration validation are not applicable because this ticket adds no product business logic. The relevant unit-equivalent validation is the machine-readable contract/schema test; integration acceptance is the Helm/k3d install smoke.

## Observability

Kubernetes pod status and event stream are the operational signal for probe failures. No product analytics event is appropriate because no user/product state changes.

## Scope preserved

- CGN-60 still owns HPA/PDB.
- CGN-61 still owns service accounts/IAM.
- no cloud provider
- no secret
- no cross-service DB access
- no production auto-deploy

## Exact next step

After green merge, continue CGN-60.
