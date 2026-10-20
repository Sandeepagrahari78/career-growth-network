# Evidence service

This package owns evidence records, their provenance metadata and visibility
state. It uses the service-owned PostgreSQL database configured by
CGN_EVIDENCE_DATABASE_URL; it does not read Identity, Career or Experts
databases.

The initial record schema supports manual claims and observed source
references. Every record is private by default, and the current schema only
accepts private visibility. Object keys are opaque private references; public
bucket or signed URLs are rejected. Owner-scoped reads and updates always
include the owner ID in the query, and archived records are absent from active
reads.

This ticket adds no HTTP API, event producer or confidence transition workflow.
Expert validation workflow remains in Experts. The evidence record stores only
the current verification state; later owning tickets define authorized
transitions and cross-domain contracts.

## Migration

Apply migrations from this directory to cgn_evidence using the service owner
role, following config/deployment/database-migration-job.v1.json. Never run
this migration against another service database.
