# Career execution / Growth Identity

**Current source paths:** `services/career/`, `services/roadmap/`, `services/evidence/`, `services/growth/` — package skeletons, not completed runtime.

**Ownership:** Career owns track/diagnostic state, Roadmap owns plans/missions, Evidence owns proof validation, Growth owns readiness/longitudinal Growth Identity. Consumers must use owning APIs/events.

**Planned progression:** Diagnostic → Missions → Verified Proof → Growth readiness → eligible `career.activity.v1` events → social and opportunity projections.

**Boundaries:** canonical `career.activity.v1` and `domain.event.envelope.v1` are in the contract registry. Do not invent detailed event payloads or endpoints when ticket-specific contracts are absent.

**Entry points:** `docs/engineering-memory/01-system-map.md`, `docs/engineering-memory/03-contract-registry.md` and owning Jira tickets.

After each merged feature: add actual files, contract versions, migrations, test commands, and cross-module references here.
