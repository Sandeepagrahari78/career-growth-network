# CGN Production Release Runbook

Ticket: **CGN-227**

Production is never automatic from a merge.

## Current release gate

1. Confirm the exact release SHA is on approved `main` history.
2. Confirm Main CI and Staging Validation are green for that SHA.
3. Open **Deploy Production Dry Run**.
4. Supply:
   - `release_sha=<40-character approved main SHA>`
   - `confirmation=DEPLOY-PRODUCTION`
5. The workflow allows only `Sandeepagrahari78`.
6. Database migration smoke + backup/restore preflight must pass.
7. The exact SHA image is built, scanned and assigned a CycloneDX SBOM.
8. Health, readiness, E2E and controlled k6 smoke must pass.
9. Release evidence + SBOM are retained as workflow artifacts.

## Important current boundary

The workflow is intentionally a **dry run**. It creates no real production
infrastructure and deploys to no public users.

Real deployment must not be activated until:

- a production hosting target is approved;
- secrets management is ready;
- persistent staging/GitOps is proven;
- production backup/restore is proven;
- migrations have service-specific recovery plans;
- monitoring/alerts are live;
- the rollback action is connected to the same immutable artifact store.

When real deployment is activated, promote the exact SHA-tagged artifact
already validated in staging. Do not rebuild a different release artifact.

## Approval model

```text
PR green
  -> Sandeep reviews
  -> merge main
  -> Main CI green
  -> staging green
  -> Sandeep manually triggers production release
```

Merge approval and production approval remain two separate decisions.
