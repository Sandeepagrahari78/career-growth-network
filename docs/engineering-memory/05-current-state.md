# 05 - Current Merged State

Last updated: 2026-10-05 for the CGN-33 monorepo-boundary delivery.

## Repository
- Shared Engineering Memory and agent synchronization: established.
- CI/CD foundation: established; PR CI, Main CI, Docker Images, Staging Validation and path-scoped local infrastructure validations are active.
- CGN-39: zero-budget Terraform bootstrap merged via PR #6 / `e9fe0cb945eabe9f4bf86eefd144642455641089`.
- CGN-40: local network/security baseline merged via PR #7 / `42499116c5e2d81552bf206585e3cae04f31ecf9`.
- CGN-41: local k3d/K3s cluster merged via PR #8 / `797fbaf4144cf86919817dc61177870480ead5d9`; PR and post-merge local Kubernetes validation are green.
- CGN-42: local PostgreSQL service-database ownership, migration and backup/restore foundation merged via PR #9 / `f686e47be8209b5c834354383d2212c6f2390094`; post-merge validation is green.
- CGN-32: complete bounded-context ownership and integration-boundary contract merged via PR #10 / `bea4c4330d4b281a82e49c3538077c73decc8ba7`; post-merge validation is green.
- CGN-33: explicit pnpm workspace packages and dependency-boundary enforcement are delivered by this change.
- Real cloud provisioning and production deployment remain intentionally disabled.

## Infrastructure state
- Terraform uses local state only; no remote backend or cloud provider is enabled.
- Approved local network contract: `cgn.local-network.v1`.
- Pod CIDR: `10.244.0.0/16`; service CIDR: `10.96.0.0/16`.
- Developer Kubernetes API/HTTP/HTTPS bindings are loopback-only.
- Kubernetes namespaces: `cgn-system`, `cgn-apps`, `cgn-data`.
- `cgn-apps` and `cgn-data` are deny-by-default; DNS egress is explicitly allowed.
- Local Kubernetes runtime: k3d v5.9.0 + K3s v1.35.9-k3s1.
- Local PostgreSQL runtime: PostgreSQL 16 in Docker/Compose, loopback-only.
- Database ownership contract: `cgn.postgres-databases.v1`.
- Current service databases: identity, career, roadmap, evidence, growth, feed, network, community and messaging.
- Product tables and runtime DB roles are not created by infrastructure bootstrap tickets.

## Product state
Jira is the work source of truth. Figma defines the approved product flow for user-facing work. Infrastructure work must not invent product schemas, APIs or flows. Cross-domain ownership is frozen by `cgn.bounded-contexts.v1`; detailed APIs/events still require the owning Jira ticket.

## Operational evidence expected for CGN-42
- PR CI: green.
- Local PostgreSQL initialization: green.
- Service database owner/NOLOGIN isolation checks: green.
- Unknown-service migration negative path: green.
- Owner-scoped migration smoke: green.
- Backup generation and restore verification: green.
- Path-scoped Local PostgreSQL Validation after merge: green.
- Cloud resources created: none.

## Update rule
After each merged PR, record the ticket, PR/merge reference, modules/contracts changed, operational status, risks and exact next dependency.
