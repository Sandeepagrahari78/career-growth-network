# ADR-0004 - Bounded Context Ownership Is the Integration Boundary

Status: Accepted

Ticket: CGN-32

## Context

CGN spans career execution, social networking, messaging, expert validation, opportunities, analytics and operations. Without explicit ownership, downstream services can duplicate truth, read each other's databases, or drift on privacy/block semantics.

## Decision

Freeze the bounded-context ownership model in `cgn.bounded-contexts.v1`.

Immediate cross-domain interactions use versioned synchronous API contracts through the owning service. Eventual propagation uses versioned domain events wrapped by `domain.event.envelope.v1`. Direct cross-service database reads are forbidden.

`career.activity.v1` remains the canonical synchronization object for eligible career-growth activity. Social Graph owns follow/connection/block truth; Identity owns consent; downstream projections must respect privacy, deletion and block state.

AI remains an internal orchestration/intelligence layer, not a duplicate product source of truth.

## Consequences

Positive:
- agents have one machine-readable ownership source;
- cross-domain integration can be contract-tested;
- privacy and block semantics have explicit authoritative owners;
- service/database boundaries remain portable to horizontal scale and future cloud migration.

Trade-offs:
- some downstream API/event details remain intentionally undefined until their Jira tickets;
- projection consumers must handle eventual consistency and stale-data correction;
- changing an ownership boundary requires architecture review and contract versioning.
