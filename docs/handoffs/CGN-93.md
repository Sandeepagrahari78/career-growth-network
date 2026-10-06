# Handoff - CGN-93

- Ticket: CGN-93
- Branch: CGN-93-helm-values-promotion-v2
- Base branch: main
- Date: 2026-10-06

## Why v2 exists

The original CGN-93 PR #15 started before CGN-44 completed. CGN-44 / PR #16 then merged the reusable `infra/helm/cgn-service` chart into `main`.

PR #15 was closed without merge to prevent two competing Helm chart implementations. This branch restarts CGN-93 from latest main and extends the CGN-44 source of truth.

## What changed

- Added `cgn.helm-promotion.v1`.
- Added staging-promotion and production values for health-demo.
- Reused the CGN-44 `cgn-service` chart.
- Added deterministic immutable-SHA rendering.
- Added static contract tests.
- Added `Helm Promotion Validation` for Helm lint/template and artifact-equality proof.
- Kept production owner-approved and render-only.

## Safety

- No direct main push.
- No cloud resource.
- No paid service.
- No committed production secret.
- No automatic real production deployment.
- No second Helm base chart.

## Validation expected

- `pnpm ci:helm-promotion`
- `pnpm ci:quick`
- contract tests
- Semgrep/Gitleaks/OSV/Trivy
- Helm lint
- staging template render
- production template render
- immutable artifact equality proof
- post-merge Main CI / Local Helm / Staging Validation

## Exact next step

After green merge and Jira completion, continue CGN-94 database migration Job pattern.

## Engineering Memory

- [x] Contract registry updated
- [x] Current state updated
- [x] Known risks updated
