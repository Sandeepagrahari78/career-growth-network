# Handoff - CGN-75

- Ticket: CGN-75 - Define canonical skill ID taxonomy and versioning rules
- Branch: `CGN-75-skill-taxonomy`
- Base branch: `main` at `9b85fdac44328ba67e56cfe1797d63a9cffe29b1`
- Agent/person: Codex under Sandeep's explicit backlog execution and merge authorization
- Date: 2026-10-19

## What changed

Added the versioned shared skill-catalog shape and JSON Schema, an intentionally
empty Career-owned catalog, ID/lifecycle/alias/replacement rules, a validator,
canonical serialization, and contract tests. The catalog has no skill rows
because the live CGN-75 specification says initial track content comes from
CGN-76/77/78; adding example skills as production data would invent taxonomy.

## Files/modules changed

- `packages/contracts/src/career/skill-catalog.v1.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/schemas/skill-catalog.v1.schema.json`
- `services/career/README.md`
- `services/career/catalog/README.md`
- `services/career/catalog/skills.v1.json`
- `services/career/catalog/validate-skill-catalog.mjs`
- `docs/engineering-memory/03-contract-registry.md`
- `tests/contracts/cgn75-skill-taxonomy.contract.test.mjs`
- `docs/handoffs/CGN-75.md`

## Contracts changed

Added `SkillCatalogV1` and `SkillDefinitionV1` to the shared contracts package,
registered as `cgn.skill-catalog.v1`. Career owns catalog content. IDs use
`skill.<snake_case>`, remain immutable, aliases/display labels resolve to one
ID, and deprecated entries can map to a different active replacement. No
endpoint or event is authorized by this ticket.

## Events produced / consumed

None planned.

## Database / migration / config changes

None planned. The catalog is versioned JSON; no database migration is authorized.

## Tests run

Passed locally:

- `node --check services/career/catalog/validate-skill-catalog.mjs`
- `node --test tests/contracts/cgn75-skill-taxonomy.contract.test.mjs` — 5/5
- `git diff --check`
- `node scripts/memory-check.mjs` — passed before updating the contract registry;
  rerun with the final candidate changes below.
- PR CI, main CI and applicable staging checks are pending.

## Known limitations / risks

No skill rows are seeded. CGN-76/77/78 content owners must submit reviewed
track content and use stable IDs; do not derive identity from mutable display
text. No runtime career service exists in this workspace yet. This PR changes
the shared contract, so Sandeep's architecture/data-contract review is required
before downstream consumption.

## Exact next step for next agent

After merge, implement CGN-131 in original rank order if its live Jira
prerequisites remain satisfied; verify links and owner review again first.

## Rollback note

Revert the CGN-75 PR. No runtime, database, or external state is modified.

## Engineering Memory updated

- [x] `03-contract-registry.md`
- [ ] `04-decisions.md` / ADR if needed
- [ ] `05-current-state.md` (will be updated in a follow-up after merge SHA is known)
- [ ] `06-known-risks.md` if needed

## Owner review and PR references

- GitHub PR URL: pending
- Candidate commit / merge SHA: pending
- Jira live dependency/status verification (2026-10-19): CGN-75 To Do; assignee Tanvi Ambre; hard prerequisite CGN-32 Done. Live links show CGN-75 blocks CGN-76 and CGN-144, so they are downstream.
- Source and tests inspected on latest main SHA: `9b85fdac44328ba67e56cfe1797d63a9cffe29b1`; generated context bundle read before implementation.
- Required Sandeep review: contract and architecture review before merge; user delegated backlog execution and requested merge after two green CI verifications.
