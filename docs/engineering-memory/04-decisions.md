# 04 - Engineering Decisions Log

Use this file for short accepted decisions. Large decisions get an ADR under `docs/adr/`.

## Accepted baseline decisions
- Monorepo uses pnpm workspaces.
- Cross-service DB access is forbidden.
- Contracts are versioned and centralized.
- Local/free-first infrastructure is preferred; future cloud migration must remain possible.
- 2026-10-05 / CGN-39: Terraform is local-state, zero-budget and cloud-provider-free until a separately approved cloud infrastructure ticket.
- 2026-10-05 / CGN-40: local cluster networking uses private non-overlapping pod/service CIDRs, loopback-only developer ingress, internal-only data services and deny-by-default Kubernetes NetworkPolicy intent.
- Production merge and production deployment are separate approvals.
- Initial architecture must support a 5,000-account beta population without redesign; concurrency is measured separately.
- AI is provider-agnostic and not hard-wired to a paid provider.

## Template
Date | Ticket | Decision | Why | Impacted domains | Supersedes
