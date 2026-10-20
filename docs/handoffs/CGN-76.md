# Handoff - CGN-76 AI Engineer Track Catalog

- Ticket: [CGN-76 - Model AI Engineer launch track prerequisites and target skills](https://sandeepagrahari1.atlassian.net/browse/CGN-76)
- Branch: `CGN-76-ai-engineer-track-4e97805`
- Base: `main` at `4e97805c89121f5ba3e7c39a4e8937666309a50d`
- Owner: Tanvi Ambre; Sandeep is the required technical reviewer for contract and data-model changes.
- Status: candidate content proposal; content review is pending.

## What changed

Adds a versioned Career-owned track catalog contract and the proposed AI Engineer
track. The track references immutable `cgn.skill-catalog.v1` IDs, distinguishes
required and optional skills, records prerequisite edges, and pins official
documentation sources by title, publisher, URL and version. This proposal does
not claim accreditation or universal role coverage.

## Files/modules changed

- `packages/contracts/src/career/career-track-catalog.v1.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/schemas/career-track-catalog.v1.schema.json`
- `services/career/catalog/skills.v1.json`
- `services/career/catalog/tracks.v1.json`
- `services/career/catalog/validate-track-catalog.mjs`
- `services/career/catalog/README.md`
- `services/career/README.md`
- `tests/contracts/cgn76-ai-engineer-track.contract.test.mjs`
- `docs/engineering-memory/03-contract-registry.md`
- `docs/handoffs/CGN-76.md`

## Contracts changed

Adds `cgn.career-track-catalog.v1`. It describes Career-owned versioned static
catalog content; it does not define an endpoint, event, database schema or
consumer authorization behavior. The catalog pins its dependency on
`cgn.skill-catalog.v1` by catalog version.

## Events produced / consumed

None.

## Database / migration / config changes

No database migration or runtime configuration is introduced. Static JSON
catalog content is the only product data added. No API route, event, paid
service or external registration is introduced.

## Tests run

Passed:

- `node --check services/career/catalog/validate-track-catalog.mjs`
- `node services/career/catalog/validate-track-catalog.mjs` - 1 track valid.
- `node --test tests/contracts/cgn75-skill-taxonomy.contract.test.mjs tests/contracts/cgn76-ai-engineer-track.contract.test.mjs` - 11/11.
- TypeScript 5.9.3 strict check of `packages/contracts/src/index.ts` - passed.
- Pinned Prettier 3.6.2 on changed files - passed.
- `git diff --check` - passed.
- `pnpm memory:check` and `pnpm ci:verify-branch` - passed.

The full local `pnpm test:contracts` run reported 170/173 passing. The three
failures are existing Windows line-ending-sensitive checks in CGN-60 autoscaling,
CGN-45 probes and CGN-61 workload identity. Exact-head Linux PR CI remains
required to verify the full suite. Integration, database, API, privacy and E2E
tests do not apply because this ticket adds static catalog content and a
deterministic validator only.

## Known limitations / risks

- The AI Engineer content is a proposal sourced from official project
  documentation, not a complete or accredited curriculum.
- Jira requires content review before the catalog is accepted. Keep CGN-76 in
  review until the content owner approves the target skills and prerequisites.
- No API, diagnostics, scoring, exam preparation, study plan, runtime or
  deployment behavior is included.

## Exact next step for next agent

Have the career content owner review the skill set and prerequisite graph. After
that review and Sandeep's contract review, merge only with green exact-head CI,
then update Engineering Memory with the merge SHA and recheck CGN-77/78 against
the resulting canonical IDs.

## Rollback note

Revert this PR. The change is static contract/catalog content only; no runtime
data or external state is modified.

## Engineering Memory updated

The canonical contract registry is updated in this PR. The merged current-state
page (`docs/engineering-memory/05-current-state.md`) remains unchanged until
merge because it records merged implementation state. After merge, update it
with the catalog ownership, version, and merge SHA, then rerun
`pnpm memory:check`.
