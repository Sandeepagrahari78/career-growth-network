# Career Intelligence

Career owns career tracks, skills and diagnostics. The canonical skill identities
and lifecycle rules are defined by the versioned contract
`cgn.skill-catalog.v1` in `packages/contracts` and its career-owned data in
`catalog/skills.v1.json`.

The catalog in this ticket contains cross-track foundational skills only. Track
curricula and their prerequisite graphs are authored by CGN-76/77/78 and must
reference these immutable IDs or add approved new ones. Do not derive IDs from
display names or create a second catalog in a consumer.
