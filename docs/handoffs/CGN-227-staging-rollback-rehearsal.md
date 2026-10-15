# CGN-227 — Staging failure and rollback rehearsal

## Why this exists

Operational verification requested 2026-10-15. This is a regression check for
the already-defined CGN-227 production approval and rollback runbook, not a new
product service or production deployment.

## Flow

1. Build the existing health-demo Docker image from the PR checkout.
2. Start the known-good application on loopback only.
3. Verify /health, /ready and the existing E2E smoke test.
4. Stop the healthy candidate.
5. Launch a deliberately unhealthy **ephemeral** container returning HTTP 503.
6. Verify both health and readiness failures are detected.
7. Remove that candidate and relaunch the original immutable known-good image.
8. Re-run readiness, health and the E2E smoke test.
9. Upload redacted JSON evidence to the CI run, then remove containers.

## Safety and scope

No actual production, external staging host, GitOps sync, cloud subscription,
credentials, persistent database, or paid infrastructure. The 503 responder is
generated in a temporary runner directory and never becomes CGN product code.
The test requires a GitHub Actions runner with Docker. Success demonstrates
an **ephemeral container recovery drill** only; it does not prove that a live
Argo CD/Kubernetes production rollback has been tested.

## Commands

- GitHub Actions: CGN Staging Rollback Rehearsal on the PR.
- Local Docker-capable machine: node scripts/ci/staging-rollback-rehearsal.mjs.

## Review

CGN-227 has production-impact approval rules. Sandeep must inspect CI evidence
and review the PR before merge. Production remains manual and separate.
