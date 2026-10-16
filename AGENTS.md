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
- Agents may commit to their feature branches after review of scope, but GitHub Actions does not create commits; technical review by Sandeep precedes merging main. No automatic production deploy.

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
