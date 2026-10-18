# CGN Bounded-Context and Boundary Map

Ticket: **CGN-32**

This document freezes the service ownership model used by downstream coding agents. The machine-readable source is `packages/contracts/architecture/bounded-contexts.v1.json`.

## Communication rules

Synchronous cross-domain reads or commands go through the owning service's **versioned API boundary** when an immediate response is required. The Gateway/BFF may compose client-facing responses, but it does not become the source of truth for the underlying domains.

Asynchronous cross-domain propagation uses **versioned domain events** wrapped by `domain.event.envelope.v1`. New detailed API paths or event names are not invented here; downstream tickets must register them in the shared contract package before use.

Direct cross-service database access is forbidden.

## Canonical Career Activity

`career.activity.v1` remains the canonical object for an eligible meaningful career action. Career, Roadmap, Evidence, Experts and Opportunities may produce eligible activities when their own ticket/contract permits it. Growth, Feed/Stories, Notifications and downstream opportunity projections consume the canonical activity instead of defining feature-specific copies.

## Social ownership and privacy

- Social Graph owns follow, connection and block truth.
- Communities owns community membership, discussions and moderation metadata.
- Messaging owns conversation/message/read state but consumes connection/block eligibility from Social Graph.
- Identity owns account, role and consent truth.
- Feed/Stories owns projections/ranking, not source-domain truth.
- Admin/Ops consumes allow-listed privacy-safe projections only.

Blocked relationships, private/deleted source content and revoked consent must not remain visible through downstream social, notification or admin projections. Private message bodies, private evidence files, credentials/tokens and AI conversation history are excluded from default Admin projections.

## Projection freshness and deletion

A projection is not authoritative source truth. Consumers must tolerate stale projections and must support correction/removal when the owning domain emits or exposes an approved state change. A stale projection never grants permission that the owning domain would deny.

## Platform constraint

AI remains an internal intelligence/orchestration layer. Product UX remains organized around Career, Growth, Feed, Network, Community and Opportunity concepts.

The local-first architecture must remain portable to a future managed-cloud environment without changing domain ownership.

Security trust boundaries, threats and testable acceptance criteria are
documented in the [CGN V1 threat model](../security/CGN-66-threat-model.md).
That checklist is an implementation/review baseline; it does not claim that
the planned product runtimes or controls already exist.
