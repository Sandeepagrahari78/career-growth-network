# Handoff - CGN-75

- Ticket: CGN-75 - Define canonical skill ID taxonomy and versioning rules
- Branch: `CGN-75-skill-taxonomy`
- Base branch: `main` at `1fcab5b27da8332c0b6236ed0a6f587aa98a993e`
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
- `docs/engineering-memory/05-current-state.md` (this follow-up)

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

Passed:

- `node --check services/career/catalog/validate-skill-catalog.mjs`
- `node --test tests/contracts/cgn75-skill-taxonomy.contract.test.mjs` — 5/5
- `git diff --check`
- Pinned Prettier 3.6.2 check on the contract test.
- `node scripts/memory-check.mjs` — passed.
- Final-head PR CI run `39173846216` passed twice after two fixes: pinned-format
  correction and CRLF-safe catalog assertion. An earlier rerun hit a transient
  PostgreSQL integration socket failure; subsequent full runs passed.
- Final-head Local Helm run `39173845995` passed twice.
- Post-merge Main CI `39174420420`, Docker Images `39174420408`, Local Helm
  `39174420423`, exact-SHA Staging Validation `39174551457`, and Jira Delivery
  Sync `39174600303` all passed for merge SHA `6432d003bdd898422aca02f525e11e42c7ec9900`.
- Live Jira status verified `Done` after delivery sync.

The broad local Windows contract-suite invocation reported 157/161 passing;
four pre-existing platform-sensitive checks expect LF-only YAML fixtures.
Linux PR CI ran the complete contract suite successfully.

## Known limitations / risks

No skill rows are seeded. CGN-76/77/78 content owners must submit reviewed
track content and use stable IDs; do not derive identity from mutable display
text. No runtime career service exists in this workspace yet. No endpoint,
instrumentation, event producer, database, or deployment behavior was added.

## Exact next step for next agent

After merge, implement CGN-131 in original rank order if its live Jira
prerequisites remain satisfied; verify links and owner review again first.

## Rollback note

Revert the CGN-75 PR. No runtime, database, or external state is modified.

## Engineering Memory updated

- [x] `03-contract-registry.md`
- [ ] `04-decisions.md` / ADR if needed
- [x] `05-current-state.md`
- [ ] `06-known-risks.md` if needed

## Owner review and PR references

- Implementation PR: https://github.com/Sandeepagrahari78/career-growth-network/pull/57
- Candidate commit: `89984a2fe465f6f5b5438eec70fc5e46b8c7bef4`
- Merge SHA: `6432d003bdd898422aca02f525e11e42c7ec9900`
- Jira live dependency/status verification (2026-10-19): CGN-75 was To Do before implementation; assignee Tanvi Ambre; hard prerequisite CGN-32 Done. Live links show CGN-75 blocks CGN-76 and CGN-144, so they are downstream. Jira is now Done.
- Source and tests inspected on latest main SHA: `9b85fdac44328ba67e56cfe1797d63a9cffe29b1`; generated context bundle read before implementation.
- Review/merge: Sandeep's explicit execution authorization; PR #57 merged after two green exact-head PR CI runs and two green Local Helm runs.
