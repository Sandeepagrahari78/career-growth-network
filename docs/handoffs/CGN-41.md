# Handoff - CGN-41

- Ticket: CGN-41
- Branch: CGN-41-local-k3d-cluster
- Base branch: main
- Agent/person: ChatGPT implementation under Sandeep review
- Date: 2026-10-05

## What changed

Provisioned the repository definition for CGN's zero-budget local Kubernetes environment with k3d/K3s.

The cluster consumes CGN-40's network contract, keeps CoreDNS/Traefik/NetworkPolicy enabled, applies the shared namespace/security baseline and includes an executable service-discovery plus deny/allow NetworkPolicy enforcement smoke.

Windows PowerShell and Bash create/smoke/destroy paths are documented.

## Files/modules changed

- `infra/k8s/local/k3d.yaml`
- `infra/k8s/smoke/**`
- `scripts/infra/k3d-*.sh`
- `scripts/infra/k3d-*.ps1`
- `tests/contracts/local-k3d-cluster.contract.test.mjs`
- `.github/workflows/pr-ci.yml`
- `.github/workflows/local-k8s.yml`
- `docs/adr/ADR-0003-local-k3d-cluster.md`
- `docs/runbooks/local-k3d-cluster.md`
- `docs/engineering-memory/04-decisions.md`
- `docs/engineering-memory/05-current-state.md`
- `docs/engineering-memory/06-known-risks.md`
- `docs/handoffs/CGN-41.md`

## Contracts changed

No product API/event contract changed. The local cluster consumes infrastructure contract `cgn.local-network.v1`.

## Events produced / consumed

None.

## Database / migration / config changes

No database migration. Local k3d/K3s cluster configuration and Kubernetes smoke fixtures added. No cloud infrastructure is created.

## Tests run

PR CI must prove:
- existing Engineering Memory, quality and security gates
- Terraform/local-network baseline validation
- k3d cluster creation
- namespace readiness
- CoreDNS and Traefik readiness
- loopback-only API/ingress mappings
- service discovery
- default-deny NetworkPolicy enforcement
- explicit allow-policy recovery
- cluster teardown

A main-branch path-scoped Local Kubernetes Validation workflow repeats the cluster smoke after merge.

## Known limitations / risks

This proves Kubernetes semantics on local K3s, not managed-cloud networking, IAM, load balancers or storage.

## Exact next step for next agent

After CGN-41 is merged and Jira is Done, start CGN-42 only if its dependency graph is clear. Reuse the `cgn-data` namespace and internal-only data-service rule; do not publish PostgreSQL externally by default.

## Rollback note

Revert the CGN-41 PR and run the destroy script if a local cluster exists. No cloud infrastructure or persistent production user data is modified.

## Engineering Memory updated

- [ ] 03-contract-registry.md (no product contract change)
- [x] 04-decisions.md
- [x] 05-current-state.md
- [x] 06-known-risks.md
