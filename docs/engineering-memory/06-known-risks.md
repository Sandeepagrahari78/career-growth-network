# 06 - Known Risks

- Agent drift: agents may infer features that were never approved. Mitigation: Jira + context bundle + stop-on-conflict rule.
- Contract drift: producer and consumer may evolve independently. Mitigation: shared contracts + contract tests.
- Memory drift: docs can become stale. Mitigation: memory check in PR/CI and required handoff update.
- Privacy drift: social/admin features may expose more than intended. Mitigation: server-side consent/block/RBAC and explicit safe projections.
- Scale assumptions: 5,000 registered users is not the same as 5,000 concurrent users. Mitigation: versioned capacity model, separate load profiles and explicit SLOs.
- Performance-target drift: initial 5K thresholds are engineering targets before real beta telemetry exists. Mitigation: keep them machine-readable, require Jira-reviewed changes, and never weaken thresholds only to make CI green.
- Premature infrastructure complexity: pipeline/infra can become the project. Mitigation: phase gates and local-first tools.
- Dependency vulnerability drift: a package can become vulnerable after merge even when code does not change. Mitigation: OSV + Trivy PR gates and scheduled weekly rescans.
- Container/base-image vulnerability drift: newly disclosed OS/library CVEs can affect previously clean images. Mitigation: Trivy image gate, scheduled rebuild/rescan and immutable SHA image promotion.
- Security-gate bypass pressure: teams may be tempted to weaken thresholds to unblock delivery. Mitigation: machine-readable fail-closed policy, Jira-reviewed exceptions, Sandeep review and expiry dates.
- SBOM provenance gap: generated SBOMs are CI artifacts but are not yet cryptographically signed/attached to registry artifacts. Mitigation: retain CycloneDX evidence now and add signing/attestation only in an explicitly approved supply-chain ticket.
- Local Terraform state: the zero-budget phase has no remote locking, shared state or managed backup. Mitigation: keep state uncommitted, limit this bootstrap to local environments, and require a separately reviewed backend migration before cloud/production provisioning.
- Cloud-scope drift: a future agent could accidentally add a managed provider/backend to the local bootstrap. Mitigation: Terraform contract tests and CI reject cloud provider/backend/resource declarations in the zero-budget root.
