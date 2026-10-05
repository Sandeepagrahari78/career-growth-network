# CGN Production Release Runbook

Production is never automatic from a merge.

1. Confirm the exact release SHA is on approved main history.
2. Confirm Main CI and staging validation are green for that SHA.
3. Trigger **Deploy Production Dry Run** with:
   - `release_sha=<40-character main SHA>`
   - `confirmation=DEPLOY-PRODUCTION`
4. Only Sandeepagrahari78 is authorized by the workflow gate.
5. Today this workflow is intentionally a no-op/dry-run artifact build + smoke test.
6. Real production deployment must not be enabled until infrastructure, secrets, rollback, backup and release evidence are ready.
7. When real deployment is activated, promote the exact SHA-tagged artifact already validated in staging.
