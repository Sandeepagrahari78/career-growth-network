# Helm Staging-to-Production Promotion Runbook

Ticket: CGN-93

## Purpose

Promote one immutable CGN release artifact from staging intent to a production candidate by reusing the CGN-44 chart at `infra/helm/cgn-service`.

This zero-budget phase validates and renders production intent only. It does not deploy to a real production cluster.

## Invariants

- Release identity is an exact 40-character Git SHA.
- Both environments use `cgn-health-demo:sha-<release-sha>`.
- Mutable tags such as `latest`, `main`, `staging`, `production`, and the local `helm-smoke` tag are forbidden for promotion.
- The reusable CGN-44 chart is the only chart used by this ticket.
- Environment drift is limited to approved sizing and environment labels.
- Production promotion remains owner-approved.
- No cloud provider, public endpoint, production secret, or automatic production deployment is introduced.

## Validation

Run:

```bash
pnpm ci:helm-promotion
node scripts/infra/render-helm-promotion.mjs --release-sha 0123456789abcdef0123456789abcdef01234567 --output-dir .local/helm-promotion
```

The GitHub workflow also performs Helm lint, renders staging and production manifests, proves the same immutable image is present in both, and uploads evidence.

## Manual production-values rehearsal

Run the `Helm Promotion Validation` workflow manually with:

- `release_sha`: an exact commit on `main`
- `confirmation`: `PROMOTE-PRODUCTION-VALUES`

Only repository owner `Sandeepagrahari78` is accepted by the workflow.

## Rollback

This ticket does not mutate a real production environment. Rollback is a repository revert; generated evidence is ephemeral.

## Next dependency

CGN-94 adds the database migration Job pattern that must execute safely before a future real deployment.
