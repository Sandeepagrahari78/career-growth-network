# Handoff - CGN-62

- Ticket: CGN-62 — Implement namespace and NetworkPolicy baseline
- Branch: `CGN-62-networkpolicy-namespace-baseline`
- Base branch: `main` at `d05d47df8c7e0877727c02d0ae1fe9d2eaa31a91`
- Agent/person: Codex implementation under Sandeep's delegated execution; Jira assignee remains Sandeep Agrahari
- Date: 2026-10-18

## What changed

Extended the local network baseline so all configured CGN namespaces receive
ingress and egress default-deny policies and DNS-only egress. Strengthened the
validator and contract tests to ensure all configured namespaces have those
policies and the existing temporary cross-namespace smoke allow path remains
limited to its named probe pods and TCP port 8080. Updated current-state memory
and the local network security runbook.

## Files/modules changed

- `config/infra/local-network.v1.json`
- `infra/k8s/base/network-policy-default-deny.yaml`
- `infra/k8s/base/network-policy-allow-dns.yaml`
- `scripts/ci/validate-local-network.mjs`
- `tests/contracts/local-network-baseline.contract.test.mjs`
- `docs/runbooks/local-network-security.md`
- `docs/engineering-memory/05-current-state.md`
- `docs/handoffs/CGN-62.md`

## Contracts changed

Extended the existing `cgn.local-network.v1` configuration with the explicit
`networkPolicy.defaultDenyNamespaces` list. It enumerates the three namespaces
already present in the contract. No product API, event or database contract
changed.

## Events produced / consumed

None.

## Database / migration / config changes

No database migration or environment setting. The existing local network
configuration now explicitly names all namespaces covered by the default-deny
policy. No paid/cloud infrastructure was added.

## Tests run

- Passed: `node --test tests/contracts/local-network-baseline.contract.test.mjs` — 7/7.
- Passed: `node scripts/ci/validate-local-network.mjs`.
- Passed: `node scripts/memory-check.mjs` — no additional memory action required.
- Passed: `git diff --check`.
- `pnpm ci:quick` and `pnpm memory:check` could not start because pnpm is not installed in this Windows environment.
- The local k3d network-policy smoke could not run because Docker and k3d are unavailable here. PR CI's Linux k3d smoke must provide this runtime acceptance evidence.
- Passed on implementation head `490a6a9cc7a439799b3fa818c43365cbba045aef`: PR CI run 39116424578 (including local k3d denied/allowed network-policy smoke) and Local Helm Validation run 39116424576.
- Passed on documentation-updated PR head `052daf5cd937f6ea579b5702816439a87c0ef406`: PR CI run 39116721385 and Local Helm Validation run 39116721367.

## Known limitations / risks

- The smoke allow policy is temporary and intentionally proves only its named test path. Permanent application-to-application/data rules remain with service-owning tickets and their actual contracts.
- Sandeep technical review and merge are pending. Jira Done must wait for verified merge and acceptance.

## Exact next step for next agent

Inspect exact-head PR CI and its local Kubernetes/network-policy smoke. Fix failures caused by this change. Sandeep should review the security scope and then merge only after the ticket's allowed and denied connection cases pass.

## Rollback note

Revert the CGN-62 commit to restore the previous app/data-only policy baseline. No persistent runtime or user data is changed by the repository update.

## Engineering Memory updated

- [ ] 03-contract-registry.md — no product API/event contract changed
- [ ] 04-decisions.md / ADR — no ownership decision changed
- [x] 05-current-state.md — default-deny and DNS coverage now includes all three CGN namespaces
- [ ] 06-known-risks.md — no new residual risk identified

## Owner review and PR references

- GitHub PR URL: https://github.com/Sandeepagrahari78/career-growth-network/pull/49 (open; review/merge pending)
- Commit / merge SHA: PR head `052daf5cd937f6ea579b5702816439a87c0ef406` (includes implementation commit `490a6a9cc7a439799b3fa818c43365cbba045aef`); not merged
- Jira live verification (2026-10-18): CGN-62 In Progress after PR sync; assignee Sandeep Agrahari; only explicit blocker CGN-44 is Done; Rank 008 is sequence priority.
- Source and tests inspected on latest main: `d05d47df8c7e0877727c02d0ae1fe9d2eaa31a91`
- Required Sandeep technical review: pending
