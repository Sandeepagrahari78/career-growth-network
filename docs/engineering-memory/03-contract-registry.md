# 03 - Contract Registry

All cross-domain contracts live under `packages/contracts`.

## Initial canonical contracts
- `career.activity.v1`
- `domain.event.envelope.v1`
- `http.error-envelope.v1`

## Contract change policy
1. Prefer additive, backward-compatible changes.
2. Version breaking changes.
3. Update producer and consumer tests.
4. Update this registry and handoff note.
5. Do not silently change field meaning.

## Career Activity
One meaningful career action can update Growth, Feed, Stories, Notifications and downstream opportunity projections. Do not create mobile-only or feature-specific copies of the activity model.
