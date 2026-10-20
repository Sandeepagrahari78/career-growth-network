# CGN module/file ownership index

This is a *navigation guide*. Authoritative ownership rules: `packages/contracts/architecture/bounded-contexts.v1.json`, `docs/engineering-memory/02-domain-ownership.md`. Jira is the task/dependency truth.

| Boundary | Repository path | Owns conceptually | Current verified state / warning |
|---|---|---|---|
| Identity & consent | `services/identity/` | accounts, auth, roles, consent | Package skeleton; product APIs pending Jira |
| Career Intelligence | `services/career/` | career goal, tracks, diagnostic | Package skeleton; product APIs pending Jira |
| Roadmap | `services/roadmap/` | plan and daily missions | Package skeleton; product APIs pending Jira |
| Evidence | `services/evidence/` | proof, provenance, validation | Package skeleton; product APIs pending Jira |
| AI orchestration | `services/ai/` | internal provider orchestration | CGN-122 establishes the runtime boundary and fake-provider flow; no vendor credentials, route, persistence or product-domain truth |
| Growth | `services/growth/` | readiness and Growth Identity | Package skeleton; product APIs pending Jira |
| Feed | `services/feed/` | social feed/stories projections | Package skeleton; product APIs pending Jira |
| Network | `services/network/` | social connections and block truth | Package skeleton; product APIs pending Jira |
| Communities | `services/community/` | membership, discussions | Package skeleton; product APIs pending Jira |
| Messaging | `services/messaging/` | message state, *not* block policy | Package skeleton; product APIs pending Jira |
| Gateway | `services/gateway/` | API composition, not business truth | Package skeleton; product APIs pending Jira |
| Web/mobile | `apps/web/`, `apps/mobile/` | frontend shells | Workspace skeletons, not completed UI |
| Opportunities / Admin | Jira owning tickets; no service path approved from this map | catalog, matching and privacy-safe projections | **Planned**; do not invent path/API on CGN-220 |
| Shared contracts | `packages/contracts/` | boundary/versioned API-event contracts | Architecture contracts and shared schema package exist |
| Infrastructure | `infra/`, `config/`, `scripts/infra/` | local-first Kubernetes, Helm, Terraform, PostgreSQL | Validated foundations, not public production |
| CI/memory | `.github/workflows/`, `scripts/ci/`, `docs/handoffs/` | validation and agent continuity | PR and Main CI implemented |
| Runnable demo | `services/health-demo/` | /health, /ready smoke app | Tested demo **not** product backend |

## Change procedure

1. Read the Jira ticket, its parent and **explicit** blocks/is-blocked-by links; do not infer that `CGN-219` must precede `CGN-220` merely because of ticket numbers.
2. Inspect these folders and related source/contracts **on latest main**; check `git log` and `docs/handoffs/` for merged predecessors.
3. Declare proposed *exact files* in PR/implementation plan before editing. Don't grant an agent broad access to unrelated owners.
4. For new paths, APIs, events or database tables, require ticket-specific scope and versioned contract where integration crosses services.
5. Update module documentation / diagram **only when implementation actually changes**. Tests and actual code, not diagrams, prove completion.

## Example CGN-220 (Tanvi)

CGN-220 is **opportunity management and publish workflow** in Jira (To Do at authoring). It is not a completed app; current Admin/Opportunity runtime implementation is not verified. Tanvi's agent should inspect Jira scope, relevant approved contracts and existing code, then request Sandeep review for any backend authorization or data-contract change before inventing new service files.

See [team instructions](AGENT_WORKFLOW.md) and [module notes](../modules/README.md).

## Platform-specific PR enforcement (CGN-286)

`apps/web/` belongs to **web/Next.js** tickets; `apps/mobile/` belongs to **Android/Expo React Native** tickets. Source-of-truth for per-ticket allowed platform files is the *reviewed Jira-derived* `config/ci/ticket-platform-scopes.v1.json`, used by `scripts/ci/verify-platform-scope.mjs` in PR CI. It is a file-scope guardrail, not a real-time Jira permission checker. See [web/Android workflow](WEB_ANDROID_AGENT_OWNERSHIP.md) and [Google Play readiness](../runbooks/android-play-release-checklist.md).
