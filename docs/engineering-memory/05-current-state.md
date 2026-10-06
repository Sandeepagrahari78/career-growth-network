# 05 - Current Merged State

Last updated: 2026-10-06 for the CGN-93 Helm promotion delivery branch.

## Repository
- Shared Engineering Memory and agent synchronization: established.
- CI/CD foundation: established; PR CI, Main CI, Docker Images, Staging Validation, release/rollback dry runs and path-scoped local infrastructure validations are active.
- CGN-39: zero-budget Terraform bootstrap merged via PR #6 / `e9fe0cb945eabe9f4bf86eefd144642455641089`.
- CGN-40: local network/security baseline merged via PR #7 / `42499116c5e2d81552bf206585e3cae04f31ecf9`.
- CGN-41: local k3d/K3s cluster merged via PR #8 / `797fbaf4144cf86919817dc61177870480ead5d9`; PR and post-merge local Kubernetes validation are green.
- CGN-42: local PostgreSQL service-database ownership, migration and backup/restore foundation merged via PR #9 / `f686e47be8209b5c834354383d2212c6f2390094`; post-merge validation is green.
- CGN-32: complete bounded-context ownership and integration-boundary contract merged via PR #10 / `bea4c4330d4b281a82e49c3538077c73decc8ba7`; post-merge validation is green.
- CGN-33: explicit pnpm workspace packages and dependency-boundary enforcement merged via PR #11 / `109ac67dc15d5b2c3bf35a9f3d12b9f204187abb`.
- CGN-227: release/rollback gate hardening merged via PR #13 / `47d719160d9b53ca0fed84cc59795b3bbd9f65f9`; Main CI, Docker Images and Staging Validation are green.
- CGN-92: Argo CD staging GitOps foundation merged via PR #14 / `2dac829a0911ca15cb2572c6cf4960b543209f9b`; PR CI, Main CI, Docker Images, Local Kubernetes Validation and Local GitOps Validation are green.
- CGN-44: reusable microservice Helm base chart merged via PR #16 / `52ece317461db43c05f28106ca3eaf580f236e70`; Main CI, Local Helm, Local Kubernetes, Docker Images and Staging Validation are green.
- CGN-93 is staged on branch `CGN-93-helm-values-promotion-v2`; it reuses the CGN-44 chart and validates immutable staging-to-production values promotion.
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
- Staging GitOps contract: `cgn.staging-gitops.v1`.
- Argo CD namespace/project/ApplicationSet manifests live under `infra/gitops/argocd/`.
- Helm base-chart contract: `cgn.helm-base.v1`; reusable chart lives under `infra/helm/cgn-service/`.
- Helm promotion contract: `cgn.helm-promotion.v1`; staging and production candidates must use the same SHA-tagged artifact.
- Product tables and runtime DB roles are not created by infrastructure bootstrap tickets.

## Product state
Jira is the work source of truth. Figma defines the approved product flow for user-facing work. Infrastructure work must not invent product schemas, APIs or flows. Cross-domain ownership is frozen by `cgn.bounded-contexts.v1`; detailed APIs/events still require the owning Jira ticket.

## Operational evidence expected for CGN-93
- PR CI: green.
- `pnpm ci:helm-promotion`: green.
- Helm lint/template for the reusable CGN-44 chart: green.
- Staging and production candidates resolve to the same immutable `sha-<release>` image.
- Owner-approved manual production-values rehearsal works for an exact main SHA.
- Cloud resources created: none.
- Production deployment performed: none.

## Update rule
After each merged PR, record the ticket, PR/merge reference, modules/contracts changed, operational status, risks and exact next dependency.
