# Career skill catalog

`skills.v1.json` is the Career-owned source of truth for canonical skill IDs.
The shared shape is `cgn.skill-catalog.v1` in `packages/contracts`; no endpoint,
database table, event or runtime service is introduced by this catalog ticket.

The catalog is intentionally empty until content owners approve skills in
CGN-76/77/78. This ticket defines the shared identity and migration rules; it
does not invent cross-track or track-specific skill content. Catalog entries
are sorted by ID, aliases are sorted deterministically, and the validator rejects
duplicate IDs, ambiguous names/aliases and invalid replacement references.

## Identity and versioning rules

- An ID matches `skill.<snake_case>` and is immutable. Never rename, delete, or
  reuse an ID, even after deprecation.
- Display names may be edited. When a prior display name should remain
  searchable, preserve it as an alias.
- Aliases are labels only; they always resolve to one canonical ID. Normalized
  aliases and display names must not resolve to multiple IDs.
- Adding a skill or alias is a backward-compatible catalog change. Increment
  the patch version for metadata/alias corrections and the minor version when
  adding skills or optional metadata. A breaking schema change requires a new
  schema major version and an explicit consumer migration plan.
- Deprecate an ID instead of removing or repurposing it. If one active skill
  replaces it, set `replacementId`; the replacement must already exist and be
  active. If there is no safe one-to-one replacement, omit the mapping and require
  the owning consumer to review its references.
- Consumer records keep the canonical ID they originally referenced until the
  owning migration updates them. A replacement mapping does not rewrite career
  history or prove a user's skill.

Run the contract tests to validate `skills.v1.json`. The validator's canonical
serializer sorts entries and aliases for reproducible diffs.
