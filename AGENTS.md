# CGN Agent Operating Contract

Every coding agent MUST read this file before changing code.

## What CGN is
CGN is a Career Growth Social Network. It is not primarily a course platform, generic dashboard, job portal, or AI chatbot.

Core product loop:
Career Goal -> Diagnostic -> 180-Day Career Plan -> Daily Mission -> Proof/Validation -> Growth Identity -> Share/Feed/Stories -> Connect/Communities/Messaging -> Experts -> Opportunities -> Next Best Action.

Signed-in Home is social-first. My Career is execution-first. AI is an internal intelligence layer.

## Source ownership
- Product scope / acceptance criteria: Jira ticket.
- UI journey / screen intent: approved Figma flow.
- API and event shapes: packages/contracts.
- Architecture decisions: docs/adr.
- Current merged implementation state: docs/engineering-memory/05-current-state.md.
- Cross-agent handoff: docs/handoffs.

If two sources conflict, STOP. Do not guess. Report the exact conflict.

## Non-negotiable engineering rules
1. No direct cross-service database access.
2. Cross-domain communication uses versioned APIs/events/shared contracts.
3. One source of truth per domain.
4. Privacy, consent, block and report semantics must remain consistent across all surfaces.
5. Do not invent features or silently alter product behavior.
6. Do not activate paid infrastructure without explicit approval.
7. Avoid process-local state that blocks horizontal scaling toward the first 5,000-user beta population.
8. Every meaningful state change must be observable through logs/analytics/audit where applicable.
9. Update Engineering Memory whenever a merged change modifies contracts, ownership, architecture, data flow, deployment behavior, or known risks.

## Before coding
Run:

```bash
pnpm agent:context --ticket CGN-XXX --domain <domain>
```

Read the generated context bundle before implementation.

## Before handoff / PR
Create or update a handoff note with:
- ticket
- branch
- what changed
- contracts changed
- events produced/consumed
- migrations/config changes
- tests run
- known limitations
- next agent instructions
- rollback notes

Then run:

```bash
pnpm memory:check
```

## Multi-agent preflight (CGN-285)
- Every agent must start from a fresh copy of `main` on a unique `CGN-NNN-description` feature branch or separate worktree. Never assume a previous agent's chat/branch is merged truth.
- Verify Jira ticket status/owner/blockers live before code changes. The default `pnpm agent:context --ticket CGN-NNN --domain <domain>` is offline; optional `--jira-live` reads Jira with local environment credentials, **never** using an embedded token. Optionally supply a dated `docs/work-items/CGN-NNN.md` export for offline agents.
- Read [visual project flow](docs/architecture/PROJECT_FLOW.md), [module paths](docs/architecture/MODULE_DEPENDENCIES.md), [team workflow](docs/architecture/AGENT_WORKFLOW.md) and only relevant predecessor handoffs/merged code.
- The [three-person synthetic handoff proof](docs/architecture/TEAM_ONBOARDING_DEMO.md) is not evidence of real feature implementation or live Jira status.
- Show an exact-file impact plan + tests first; use the ticket-defined owning module. A conceptual diagram never authorizes creating API routes or database schemas.
- Source/infra changes require a changed ticket-matched `docs/handoffs/CGN-NNN.md` with evidence and a meaningful next-agent trail. CI checks it on PRs.
- Once ticket scope is authorized, agents must finish delivery: inspect the diff, stage only ticket files, commit, push the feature branch, open/update the PR, inspect Linux PR CI, and fix failures caused by their change. Do not stop after local validation or ask again for routine commit/push/PR permission. Never include local `.cgn/` caches, tokens or unrelated user changes. If authentication or an enforced approval blocks delivery, report the exact blocker and preserve the work.
- GitHub Actions validates pushed code and syncs Jira; it does not author commits or retrieve uncommitted laptop files. Sandeep technical review still precedes merge to main. No automatic production deploy. See [delivery automation](docs/runbooks/agent-delivery-automation.md).
- Sandeep's reviewed merge is the approval signal for automated Jira Done; no separate acceptance comment is required. Before merging, the owner verifies Jira/business acceptance and any ticket-specific checks beyond the standard staging smoke. Automation requires successful latest PR CI, Main CI and exact-candidate Staging Validation, changed handoff and completed Jira blockers/subtasks. Agents must not invent human review or merge without explicit authorization.

## CGN-286 platform file-scope gate (monorepo)

- **Web:** Jira CGN-86/87 etc. → `apps/web/` using Next.js/React; **Android:** Jira CGN-128/129 etc. → `apps/mobile/` using Expo/React Native. Both use approved backend APIs and shared contracts. No iOS release currently.
- Before proposing app files, read **live Jira ticket** and `config/ci/ticket-platform-scopes.v1.json`. The registry is an offline reviewed Jira-to-platform cache, not live Jira; an unknown ticket must be registered with Sandeep review.
- PR CI runs `scripts/ci/verify-platform-scope.mjs`. Editing `apps/mobile/` from a web-only ticket or `apps/web/` from a mobile-only ticket fails the gate. Both-platform edits need explicit reviewed Jira scope and registry entry.
- This is a file-path check. It does **not** validate UI framework dependencies or prevent direct pushes to unprotected main; all authorizations/security review still apply.
- Google Play public launch requirements and cost approvals: [Android release checklist](docs/runbooks/android-play-release-checklist.md), tracked by CGN-287. Do not register/pay/publish under this CI task.

## Approved CGN V2 product direction — CGN-288, CGN-289

- The product now targets a **continuous student journey** after Class 10 through exam preparation, college, skills and professional growth, **without replacing** the original social-growth model. Read [V2 PRD](docs/product/CGN_V2_PRODUCT_VISION.md) and [V2 feature gap audit](docs/product/CGN_V2_FEATURE_GAP_AUDIT.md).
- Preserve the **social-first Home**, execution-first Journey workspace and an account that may change/hold goals. Never create another disconnected exam social graph, skill-progress truth or duplicated Identity database.
- This is team-approved **product direction**, **not** a license to implement speculative schemas or UX. Before a V2 implementation PR, [CGN-290](https://sandeepagrahari1.atlassian.net/browse/CGN-290) must approve affected owning contracts/ADR, and [CGN-291](https://sandeepagrahari1.atlassian.net/browse/CGN-291) must provide real reviewed Figma frame refs; see [V2 design handoff](docs/design/CGN_V2_DESIGN_HANDOFF.md).
- Treat stage-aware exam catalog, syllabus and study evidence as *planned*, not existing services/endpoints. Existing `career.activity.v1` is not authority for fabricated study events. Do not invent a `services/preparation` service before an ADR.
- For minors, do not expose marks, personal timetable or study hours by default; no automatic 30-peer contacts, forced leaderboards, unverified mentor access, inappropriate adult messaging or social-pressure notifications. Enforce privacy at owning services and consumer projections.
- Retain web/Android ticket-path gate and no-iOS release scope. Approved designs belong in Figma after review; code truth remains latest main. Missing approval or cross-source conflicts stop implementation.


## CGN-297 — Six approved primary UI visual references

- Product owner approved **six exact generated CGN V2 Android UI screenshots** as the fixed visual direction on 2026-10-16. See [approved six-screen intent](docs/design/CGN_V2_FINAL_SIX_APPROVED_UI.md) and [machine-readable UI visual spec](packages/contracts/ui/cgn-v2-six-screen.v1.json).
- **Six primary screens only:** current-status selection after email/Google sign-in, then social Home, Explore, Journey, Chats and Profile with five persistent bottom tabs. Avoid inserting compulsory interests/goal/peer wizard before Home. Stages and individual exam goals must still be modeled distinctly at backend contract level.
- The historical 92-screen Figma native prototype is **supporting** detail, NOT authority to override any conflicting one of the new six approved visual screens; Prachi must align and approve a versioned Figma frame before coding.
- **Asset gate updated (2026-10-16):** all six exact approved original PNG files ARE present on merged GitHub `main` under `docs/design/approved-six-v1/images/`. Their SHA-256 checksums and verified Git blob IDs are in `docs/design/CGN_V2_FINAL_SIX_APPROVED_UI.md` and `packages/contracts/ui/cgn-v2-six-screen.v1.json`; `tests/contracts/cgn-v2-six-screen-assets.contract.test.mjs` verifies integrity. **Do not repeat the older upload-pending state**, substitute images, or confuse this visual-intent contract with an approved API/event/DB schema. Approved final Figma review is still separate.
- This is a visual intent contract **not** a REST/DB/event contract. Respect existing owning-service contracts, CGN-290 approval, consent, moderated adult/minor mentorship and backend authorization. Names, company logos, badges, metrics and fake chat entries in examples are not production assertions.

## Codex + Jira setup & approved-six preflight — CGN-298

- Read [Codex/Jira Windows onboarding runbook](docs/runbooks/CODEX_JIRA_SIX_SCREEN_SETUP.md) before starting VS Code agent work; a safe project-scoped **non-secret** Atlassian MCP URL is in `.codex/config.toml`. Every developer must complete their **own OAuth login** to Jira. MCP configured is not the same as MCP authorized or Jira content loaded.
- Read the exact six original PNG files and their visual spec on up-to-date merged `main` before UI design work. For these six primary screens, product-owner-approved screenshot layout takes visual precedence over conflicting early Figma 92-screen prototype drafts. Prachi still reviews final editable Figma version; no automatic pixel-accuracy claims.
- Keep **CGN-290 / PR #34** API/domain/safety RFC and **CGN-128 / PR #35** Expo navigation/client foundation in view. Check their **live** merge status before coding. Do not duplicate unmerged work or implement hypothetical endpoints.
- The Codex agent must first present a ticket-to-screen-to-contract impact table, exact touched files, blockers, testing plan and dependency status; honor existing ticket authorization and proceed through implementation, tests, commit, push and PR once scope is clear; request clarification only for unresolved scope or required approvals. Respect existing three-agent branch/handoff/CI rules and minors privacy constraints.


## Fast Delivery V2 — CGN-301 pre-push quality loop

- Every scoped CGN coding ticket uses the existing live Jira/contract/dependency preflight; read only the current source-of-truth handoffs and architecture context. Do not change ticket ownership, bypass blockers or perform repeated full repo reads without a changed main/contract reason.
- After implementing acceptance/tests and writing the handoff, commit scoped files locally, then run `pnpm ticket:check --ticket CGN-NNN` before pushing. It verifies branch, handoff, Engineering Memory, platform scope, boundaries and affected tests; critical/unknown work falls back to full `ci:quick`. For applicable service Docker smoke and an available daemon, run with `--docker` before push; use `--jira-live` only with existing approved local Jira credentials.
- This CLI is local preflight, NOT a replacement for GitHub PR CI, source security, required service Docker/integration gates, human architectural/privacy review, merged Main CI, exact-candidate staging or automatic Jira Done. A green CLI never authorizes merge.
- Keep one existing PR per ticket, fix real failed test causes, capture timing evidence in ignored `.cgn/ticket-metrics/`, and do not disclose secrets. See `docs/runbooks/fast-delivery-v2.md` for the full SOP, limitations and rollback.
