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
