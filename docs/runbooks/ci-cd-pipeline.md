# CGN Zero-Budget CI/CD Pipeline

Ticket: **CGN-227**

CGN uses one shared delivery system for Sandeep, Prachi, Tanvi and coding
agents. Nobody gets a separate pipeline.

## Delivery path

```text
Jira ticket
  -> CGN-XXX-feature branch
  -> Pull Request
  -> Engineering Memory + scope checks
  -> format / lint / typecheck / unit / contracts / build
  -> secret / SAST / dependency / filesystem security
  -> affected Docker build + image scan + SBOM + health smoke
  -> shared integration dependency stack
  -> E2E deployment smoke
  -> controlled k6 performance smoke
  -> Sandeep review / merge decision
  -> main revalidation
  -> source + image security revalidation
  -> integration + E2E + performance revalidation
  -> ephemeral staging validation
  -> manual owner-only production dry-run gate
  -> future real production deployment only after hosting is approved
```

## Pull Request gate

PR CI is the primary pre-merge gate. It detects affected paths and runs the
relevant subset while keeping the final quality summary fail-closed.

Current gates include:

- Jira-scoped branch naming
- Agent Context / Engineering Memory
- workspace quality checks
- unit and contract tests
- Gitleaks
- OSV-Scanner
- Semgrep CE
- Trivy filesystem scan
- changed-service Docker build
- Trivy container scan
- CycloneDX SBOM
- container health smoke
- PostgreSQL / Valkey / Redpanda / object-store dependency smoke
- deployment E2E smoke
- controlled k6 performance smoke
- Terraform / local k3d / local PostgreSQL validation when affected

A skipped affected-code job is valid only when the detector proves that the
corresponding area did not change.

## Main gate

Main is treated as release-candidate history.

On every main push the pipeline:

1. audits that Sandeep performed the main entry and that the SHA is associated
   with a pull request;
2. reruns source security checks;
3. reruns Engineering Memory, sync, quality and contract checks;
4. builds and scans the immutable SHA-tagged artifact;
5. validates health + readiness;
6. revalidates the shared integration stack;
7. reruns E2E and k6 performance smoke.

GitHub Free private repositories cannot enforce all protected-branch/ruleset
features. Therefore this audit is a detection control, not a technical
prevention control. Team policy remains: **never push directly to main**.

## Staging

A green Main CI triggers an ephemeral production-like staging validation for
the exact main SHA. It performs health, readiness, E2E and k6 smoke and uploads
a staging evidence artifact.

Persistent GitOps staging is intentionally separate work under CGN-92/CGN-93.
No cloud resource is created by this pipeline.

## Production gate

Production never deploys automatically after merge.

The owner-only manual release workflow requires:

- exact 40-character main SHA;
- actor `Sandeepagrahari78`;
- explicit `DEPLOY-PRODUCTION` confirmation;
- database migration/backup/restore preflight;
- exact-SHA image build;
- container security scan;
- SBOM;
- health/readiness/E2E/performance smoke;
- immutable release evidence artifact.

Today it remains a **dry run** because no real production target, secrets or
approved paid hosting exist. The final deployment step must not be enabled by a
coding agent without explicit approval.

## Rollback

Rollback is also owner-only and immutable-SHA based. The dry-run workflow
requires a known-good SHA from main history and
`ROLLBACK-PRODUCTION`. It rebuilds/revalidates that exact target and stores
rollback evidence.

When real production is enabled, the dry-run promotion/rollback hooks are
replaced with deployment actions that promote the already validated immutable
artifact rather than rebuilding a different artifact.

## Team usage

Prachi or Tanvi:

1. take the assigned Jira ticket;
2. pull latest main;
3. create `CGN-XXX-description`;
4. give the Jira ticket/context bundle to the coding agent;
5. push the branch;
6. open a PR;
7. fix any red gate rather than bypassing it;
8. wait for Sandeep's review before main.

The same rules apply to Sandeep.
