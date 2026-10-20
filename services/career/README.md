# Career Intelligence

Career owns career tracks, skills and diagnostics. The canonical skill identities
and lifecycle rules are defined by the versioned contract
`cgn.skill-catalog.v1` in `packages/contracts` and its career-owned data in
`catalog/skills.v1.json`.

The skill catalog contains canonical skill IDs and names. CGN-76/77/78 track
catalogs reference these immutable IDs or add reviewed new ones. Track-specific
required/optional status, prerequisites and version-pinned source metadata live
in the Career-owned, versioned track catalog; consumers must not create a second
catalog. Do not derive IDs from display names.
