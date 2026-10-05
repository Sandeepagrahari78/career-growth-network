# 03 - Contract Registry

All cross-domain contracts live under `packages/contracts`.

## Canonical contracts
- `cgn.bounded-contexts.v1` — cross-domain ownership and integration-boundary contract.
- `cgn.workspace-boundaries.v1` — monorepo package roots and allowed workspace dependency direction.
- `career.activity.v1` — canonical eligible career-growth activity.
- `domain.event.envelope.v1` — common versioned event envelope.
- `http.error-envelope.v1` — common synchronous error shape.

## Contract change policy
1. Prefer additive, backward-compatible changes.
2. Version breaking changes.
3. Update producer and consumer tests.
4. Update this registry and handoff note.
5. Do not silently change field meaning.
6. Do not change domain ownership without architecture/security review.

## Bounded contexts
`packages/contracts/architecture/bounded-contexts.v1.json` freezes the CGN service ownership matrix, synchronous-vs-asynchronous boundary rules, social policy ownership and projection privacy rules.

Detailed endpoint paths and new event names are intentionally not invented by the architecture contract. They are added by the owning Jira ticket and must be versioned here before cross-domain use.

## Career Activity
One meaningful career action can update Growth, Feed, Stories, Notifications and downstream opportunity projections. Do not create mobile-only or feature-specific copies of the activity model.
