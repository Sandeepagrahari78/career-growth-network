# 04 - Engineering Decisions Log

Use this file for short accepted decisions. Large decisions get an ADR under `docs/adr/`.

## Accepted baseline decisions
- Monorepo uses pnpm workspaces.
- Cross-service DB access is forbidden.
- Contracts are versioned and centralized.
- Local/free-first infrastructure is preferred; future cloud migration must remain possible.
- 2026-10-05 / CGN-39: Terraform is local-state, zero-budget and cloud-provider-free until a separately approved cloud infrastructure ticket.
- 2026-10-05 / CGN-40: local cluster networking uses private non-overlapping pod/service CIDRs, loopback-only developer ingress, internal-only data services and deny-by-default Kubernetes NetworkPolicy intent.
- 2026-10-05 / CGN-41: use k3d v5.9.0 with pinned K3s v1.35.9-k3s1 for the ₹0 local Kubernetes environment; prove CoreDNS, Traefik and NetworkPolicy behavior in CI instead of assuming manifest application equals enforcement.
- 2026-10-05 / CGN-42: local PostgreSQL uses one Docker-hosted PostgreSQL 16 process with separate service databases and NOLOGIN owner roles; admin is migration/backup-only and product schemas/runtime roles remain service-ticket responsibilities.
- Production merge and production deployment are separate approvals.
- Initial architecture must support a 5,000-account beta population without redesign; concurrency is measured separately.
- AI is provider-agnostic and not hard-wired to a paid provider.

- 2026-10-05 / CGN-32: bounded-context ownership is frozen in `cgn.bounded-contexts.v1`; synchronous access uses versioned owning-service APIs, asynchronous propagation uses versioned events, and cross-service database reads remain forbidden.

- 2026-10-05 / CGN-33: all established apps/services/shared packages are explicit private pnpm workspace packages; app/service implementations may depend on shared packages, but direct app-to-service and service-to-service workspace dependencies are forbidden.

## Template
Date | Ticket | Decision | Why | Impacted domains | Supersedes
