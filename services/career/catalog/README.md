# Career skill catalog

`skills.v1.json` is the Career-owned source of truth for canonical skill IDs.
The shared shape is `cgn.skill-catalog.v1` in `packages/contracts`; no endpoint,
database table, event or runtime service is introduced by this catalog ticket.

`skills.v1.json` contains canonical skill IDs and names. CGN-76/77/78 track
catalogs reference those IDs and may add reviewed skills. Track-specific
required/optional status, prerequisites and version-pinned source metadata live
in `tracks.v1.json`; consumers must not create a second catalog. Catalog entries
are sorted by ID, aliases are sorted deterministically, and the validators reject
duplicate IDs, ambiguous names/aliases, invalid references and cyclic
prerequisites.

`tracks.v1.json` currently contains the proposed AI Engineer track from CGN-76.
Its content review is pending; it is not an accredited curriculum. Validate the
track and all skill references with:

```bash
node services/career/catalog/validate-track-catalog.mjs
```

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
