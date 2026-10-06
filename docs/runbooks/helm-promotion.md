# Helm Staging-to-Production Promotion Runbook

Ticket: CGN-93

## Purpose

CGN promotes one immutable release artifact from staging intent to a production candidate. The zero-budget phase renders and validates production values only; it does not deploy to a real production cluster.

## Invariants

- The release is identified by an exact 40-character Git SHA from `main`.
- Staging and production use the same immutable image tag: `sha-<release-sha>`.
- Mutable tags such as `latest`, `main`, `staging`, and `production` are forbidden.
- Only approved environment drift is allowed: replica count and resource sizing.
- Production promotion requires Sandeep's explicit manual confirmation.
- No cloud target, production credential, or automatic production deployment is introduced by this ticket.

## Local validation

Run:

```bash
pnpm ci:helm
node scripts/infra/render-helm-promotion.mjs --release-sha 0123456789abcdef0123456789abcdef01234567
```

For real Helm rendering, use the same pinned Helm image as CI:

```bash
docker run --rm -v "$PWD:/work" -w /work alpine/helm:3.18.6 lint infra/helm/health-demo
```

## GitHub workflow

`.github/workflows/helm-promotion.yml` runs on relevant pull requests and main pushes.

For an owner-approved production-values rehearsal, dispatch the workflow manually with:

- `release_sha`: exact approved `main` SHA
- `confirmation`: `PROMOTE-PRODUCTION-VALUES`

The workflow verifies the SHA belongs to `main`, renders staging and production values from the same SHA, runs Helm lint/template, and stores evidence artifacts.

## Rollback

No real production state is changed. Rollback is a repository revert or deletion of generated local artifacts under `.local/helm*`.

## Next dependency

CGN-94 adds the database migration Job pattern used by the deployment workflow before a future real production cutover.
