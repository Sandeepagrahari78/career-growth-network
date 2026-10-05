# ADR-0004 - Local PostgreSQL Service Database Boundaries

Status: Accepted

Ticket: CGN-42

## Context

CGN needs a zero-budget local relational data layer before service schemas are implemented. The architecture forbids cross-service database access, but no product schema should be invented before its owning service ticket.

A single local PostgreSQL process is sufficient for developer/CI cost and operational simplicity, while logical database and role boundaries can still model service ownership.

## Decision

Use one Docker-hosted PostgreSQL 16 instance for local development and CI, with one logical database and one distinct NOLOGIN owner role for each currently established data-owning service boundary:

- identity
- career
- roadmap
- evidence
- growth
- feed
- network
- community
- messaging

PUBLIC CONNECT/TEMPORARY privileges are revoked from service databases. The bootstrap admin user is reserved for initialization, migration orchestration, backup and restore. It is not an application runtime identity.

Each service has a stable future `CGN_<SERVICE>_DATABASE_URL` environment name. Runtime login roles and product tables remain owned by the later service implementation tickets.

## Consequences

Positive:
- ₹0 local infrastructure;
- service ownership is explicit before product schemas exist;
- cross-service database access is not the default;
- migration, backup and restore workflows can be proven now;
- later managed PostgreSQL migration can change environment values instead of application contracts.

Trade-offs:
- one local PostgreSQL process does not model managed-database IAM, HA, replicas or network latency;
- the bootstrap admin can technically access all local databases and must never be used as an application runtime credential;
- service runtime roles are intentionally deferred until their owning service tickets define real schemas and permissions.
