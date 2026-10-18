# Handoff - CGN-63

- Ticket: CGN-63 â€” Configure local Kubernetes ingress and development TLS
- Branch: `CGN-63-local-ingress-development-tls`
- Base branch: `main` at `2750acc35e5bbf4de9a79f752f98ac7e0ffd90f1`
- Jira owner/status at implementation: Sandeep Agrahari / To Do (unchanged)
- Live prerequisite check (2026-10-18): only `is blocked by` CGN-62; Jira reports CGN-62 Done. CGN-225 is an outward `blocks` link, not a prerequisite.
- Date: 2026-10-18

## What changed

Configured the existing Traefik IngressClass to route `health.cgn.localhost`
to the existing CGN health-demo Helm service, with a Kubernetes TLS Secret and
a narrow ingress NetworkPolicy. Extended the Bash and PowerShell k3d smoke
scripts to create a local self-signed development certificate, deploy the
existing health-demo in a unique temporary namespace, verify HTTP and trusted
HTTPS health/readiness, check unknown hosts and paths return 404, then remove
the route and verify rollback returns 404. Added Helm to the existing k3d CI
jobs before the smoke runs and documented certificate trust setup.

The PR #49 merge on `main` is the actual CGN-62 predecessor evidence. Its
handoff still contains pre-merge wording, so the live Jira state and the
verified GitHub merge commit take precedence for this dependency check.

## Files/modules changed

- `infra/k8s/local/health-demo-ingress.yaml`
- `infra/k8s/local/health-demo-ingress-allow.yaml`
- `scripts/infra/k3d-smoke.sh`
- `scripts/infra/k3d-smoke.ps1`
- `tests/contracts/local-k3d-cluster.contract.test.mjs`
- `.github/workflows/pr-ci.yml`
- `.github/workflows/local-k8s.yml`
- `docs/runbooks/local-k3d-cluster.md`
- `docs/handoffs/CGN-63.md`

## Contracts changed

No product API, event, or database contract changed. Added a portable
Kubernetes Ingress resource using `ingressClassName: traefik`, a Service
backend and a TLS Secret reference. The local-only smoke NetworkPolicy permits
only kube-system ingress to the selected health-demo pods on TCP 3001.

## Events produced / consumed

None.

## Database / migration / config changes

No database migration, cloud account, public domain, paid load balancer or
production certificate account was added. The development keypair is generated
locally under ignored `.local/k3d/tls/` and never belongs in Git. Smoke
workloads and Kubernetes resources use a PID-specific temporary namespace and
are removed on exit.

## Tests run

- Passed: `node --test tests/contracts/local-k3d-cluster.contract.test.mjs` â€” 5/5.
- Passed: `node scripts/ci/validate-local-network.mjs`.
- Passed: `node scripts/ci/validate-helm-base.mjs`.
- Passed: `node scripts/ci/verify-workspace-boundaries.mjs`.
- Passed: PowerShell parser check for `scripts/infra/k3d-smoke.ps1`.
- Passed after the handoff was added: `node scripts/memory-check.mjs` and `git diff --check`.
- Pending exact-head PR CI: `node scripts/ci/verify-agent-handoff.mjs` must validate this handoff against the branch diff.
- The full `node --test tests/contracts/*.test.mjs` run had 3 failures in autoscaling, workload-identity and Kubernetes-probe validators. These Windows-checkout failures are line-ending-sensitive (`\n` assertions against CRLF files); those files are unchanged by CGN-63.
- `pnpm` is not installed in this Windows environment, so `pnpm agent:context`, `pnpm ci:quick`, and `pnpm memory:check` could not run. Context was generated via the repository's direct Node script and the equivalent Node memory script passed; Linux PR CI is required for the full workspace suite and k3d runtime acceptance.
- Local k3d acceptance was not run here because Helm, k3d and OpenSSL are unavailable. The exact-head Linux PR CI smoke must verify certificate trust, route responses, unknown-host/path handling, NetworkPolicy behavior and rollback.
- GitHub Local Helm Validation run 39118866986 passed. PR CI run 39118866969 passed quality, SAST, Terraform/network, performance, E2E and dependency jobs on retry; its k3d ingress smoke passed HTTP/HTTPS, certificate, unknown-host/path and NetworkPolicy cases but timed out on the first rollback probe after deleting the HTTPS route. The rollback check now confirms Ingress deletion and the default HTTP 404. Exact-head head 59bd6c5 rerun (PR CI run 39119363429, attempt 2; Local Helm run 39119363437) failed before any runner step: GitHub reports empty step arrays, runner_id 0, and no job logs for the initial preflight jobs. Failed jobs were retried; the workflow again failed before steps. Runtime acceptance for the rollback change is therefore still unverified and needs a fresh CI run.

## Known limitations / risks

- The self-signed certificate is for local development only. `curl --cacert` validates it without modifying machine trust. Browser trust is optional and documented as an explicit user-store action.
- The sample route exposes the existing health-demo reference service, not a product business API. Future services should add routes through their owning ticket and service contract.
- This feature branch is not merged. Engineering Memory current-state should describe the route/TLS behavior only after review and merge.

## Exact next step for next agent

Check the exact-head PR CI run, especially the Linux k3d smoke and all package quality checks. Fix any failures introduced by this change. Sandeep must perform the required technical review; do not merge or transition Jira to Done until review, CI, merge and acceptance are verified.

## Rollback note

Revert this ticket's ingress manifests, smoke/runbook changes and workflow Helm setup. The smoke deletes only its generated namespace; the certificate stays under ignored `.local/` until the developer removes it. No existing app release or persistent workload is changed.

## Engineering Memory updated

- `03-contract-registry.md`: no product API/event contract changed.
- `04-decisions.md` / ADR: no ownership decision changed.
- `05-current-state.md`: intentionally unchanged before merge; after merge, record Traefik host routing and local TLS acceptance.
- `06-known-risks.md`: no new production risk; local self-signed certificate and optional trust-store setup are documented in the runbook.

