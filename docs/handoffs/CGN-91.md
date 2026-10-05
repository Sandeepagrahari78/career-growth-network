# Handoff - CGN-91

- Ticket: CGN-91
- Branch: CGN-91-security-hardening
- Base branch: main
- Agent/person: ChatGPT implementation under Sandeep review
- Date: 2026-10-05

## What changed

Hardened CGN's CI/CD security wall with fail-closed dependency, secret, SAST, repository, container and SBOM gates.

PR source security now runs Gitleaks, OSV-Scanner, Semgrep and Trivy as an aggregate gate so all findings can be collected before the job fails.

Docker-capable services are scanned as built images with Trivy and produce CycloneDX SBOM artifacts.

The scheduled weekly security workflow now rescans source/dependencies and all Docker-capable services so newly disclosed vulnerabilities can be detected without a new code change.

## Files/modules changed

- `config/security/security-policy.v1.json`
- `tests/contracts/security-policy.contract.test.mjs`
- `.github/workflows/pr-ci.yml`
- `.github/workflows/docker-images.yml`
- `.github/workflows/security-scheduled.yml`
- `.github/workflows/main-ci.yml`
- `docs/runbooks/security-gates.md`
- `docs/engineering-memory/06-known-risks.md`
- `docs/handoffs/CGN-91.md`

## Contracts changed

Added non-functional security gate contract `cgn.security-gates.v1`. No product API or event contract changed.

## Events produced / consumed

None.

## Database / migration / config changes

No database migration. Added security gate policy configuration and CI artifacts only.

## Tests / validation

PR CI must prove:
- branch/Jira and Engineering Memory gates
- existing code-quality and contract tests
- security-policy contract invariants
- Gitleaks
- OSV dependency scan
- Semgrep
- Trivy filesystem scan
- Trivy container image scan
- CycloneDX SBOM generation
- Docker health smoke where applicable

## Known limitations / risks

- Current Trivy policy blocks fixable HIGH/CRITICAL findings and ignores unfixed findings to keep the gate actionable; unfixed findings still require periodic review.
- SBOMs are retained as CI artifacts, not yet signed/attested in a registry.
- GHCR publication remains disabled unless explicitly enabled.
- Real deployment admission policies belong to the later Kubernetes/GitOps tickets.

## Exact next step for next agent

After merge, re-check CGN-41's dependency chain. Do not start Kubernetes work while Jira still marks its prerequisite unresolved.

## Rollback note

Revert the CGN-91 PR. No production infrastructure, secrets or user data are modified.

## Engineering Memory updated

- [ ] 03-contract-registry.md (no product API/event contract)
- [ ] 04-decisions.md / ADR (security implementation follows approved CI/CD direction)
- [ ] 05-current-state.md (update after merge)
- [x] 06-known-risks.md
