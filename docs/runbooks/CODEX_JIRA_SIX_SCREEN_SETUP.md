# CGN Coding Agent: Jira + Six Approved Screens — Windows VS Code / Codex

**Jira:** [CGN-298](https://sandeepagrahari1.atlassian.net/browse/CGN-298)  
**Status:** Project config proposed via GitHub PR; each person's VS Code/Codex must reload and authorize Jira themselves. This runbook does not imply that anyone has completed OAuth, granted write permission or performed a local build.
**Last audited:** 2026-10-18.

## Why this is necessary

The Codex editor can read the local repository, but it does **not** inherit the separate ChatGPT/Jira connector. The VS Code screenshot showed `MCPs 0` before setup. The official Atlassian remote MCP uses `https://mcp.atlassian.com/v2/mcp` and OAuth. Project-scoped non-secret configuration is in [`.codex/config.toml`](../../.codex/config.toml), requiring a *trusted project* and Codex reload. The user's Jira permissions still control reads/writes; MCP configuration is not automatic authorization.

References: [Official Atlassian MCP](https://atlassian.github.io/atlassian-mcp-server/), [Codex MCP](https://developers.openai.com/codex/mcp).

## Step 1 — sync the existing repository safely

In VS Code, open the existing `career-growth-network` folder (do not clone into a second repository or delete existing branches). Windows **Command Prompt**:

```bat
git status
git remote -v
git fetch origin
git log -1 --oneline
```

**Stop if there are uncommitted changes** — ask owner how to commit/stash them. On an unchanged clean `main` checkout only:

```bat
git switch main
git pull --ff-only origin main
```

To use this config **before its review PR is merged**, a reviewer may inspect it on the PR branch; do not switch away from ongoing code without checking worktrees. Another non-conflicting option is personal user-level Codex setup in Step 2 (immediate, no repo modification).

## Step 2 — add Jira to *local* Codex (one-time per developer)

**Check existing setup first:** inspect MCP settings or run `codex mcp list`. If an existing server such as `jira` already reads CGN issues successfully, reuse it; do not repeat OAuth or create a duplicate connection just to match this guide's `atlassian` alias. This project bootstrap is for developers who lack a working connection. Keep only the intended connection enabled in your local configuration.

**IDE configuration:** use Codex MCP settings/configuration to inspect the server URL and authenticate the selected connection. Exact controls depend on the installed extension version. The project config supplies the same URL once the repository is trusted.

**Codex CLI alternative** (only if `codex` is installed and no working server already exists):

```bat
codex mcp add atlassian --url https://mcp.atlassian.com/v2/mcp
codex mcp login atlassian
codex mcp list
```

If `'codex' is not recognized`, use the **IDE UI path**; do not paste `npm install` or secrets just to force setup. The CLI and IDE share Codex MCP configuration when running on the same host.

After setup, from a NEW local Codex chat:

> Using the Atlassian MCP connection, read CGN-297 and CGN-298 and show their live status and exact summaries. Do not change anything.

Expected success: it returns the current issue statuses *with live Jira tool evidence*, not just cached text from docs. If MCPs still show zero, check project trust, extension restart and OAuth. If Atlassian denies login, ask the Jira administrator to allow this tool/domain; do not generate a personal API token or put it in Git.

## Step 3 — visual specification / implementation hierarchy

The user-approved **six exact original PNGs** already exist in merged `main` under:

`docs/design/approved-six-v1/images/`

Read all six:

1. `cgn_career_status_onboarding.png`
2. `cgn_student_social_feed_mockup.png`
3. `cgn_explore_connect_and_grow.png`
4. `cgn_journey_dashboard_ui.png`
5. `cgn_chats_connect_learn_grow.png`
6. `cgn_profile_aanya_s_growth_journey.png`

Read [`docs/design/CGN_V2_FINAL_SIX_APPROVED_UI.md`](../design/CGN_V2_FINAL_SIX_APPROVED_UI.md) and [`packages/contracts/ui/cgn-v2-six-screen.v1.json`](../../packages/contracts/ui/cgn-v2-six-screen.v1.json). The CI contract asserts original content SHA-256 and Git blob IDs. **Do not re-upload modified images or use generic placeholders.** Existing editable Figma references in the UI contract are still pending Prachi review.

These are **UI visual-intent references**, NOT permission to invent REST APIs, DB schema or service events. Before coding, also read `packages/contracts/architecture/bounded-contexts.v1.json`, contract registry and the actual Jira acceptance criteria.

User-approved launch UX: Email/Google authentication → **one current-status selection** → social-first Home. Returning existing-stage user goes directly Home. Bottom 5 tabs: Home / Explore / Journey / Chats / Profile. Stage (e.g. Class 11) can coexist with a goal (e.g. NEET); do not conflate into one permanent mutually-exclusive role. UI examples show fictional company affiliations, verified badges and chat content; do **not** present these as real credentials/messages or bypass safeguarding.

## Step 4 — choose ticket / ownership / existing work, avoid duplication

- [CGN-297](https://sandeepagrahari1.atlassian.net/browse/CGN-297) tracks the six approved images and design mapping.
- [CGN-290](https://sandeepagrahari1.atlassian.net/browse/CGN-290) is the **live API / data ownership / safety RFC**. [PR #34](https://github.com/Sandeepagrahari78/career-growth-network/pull/34) was open at audit time.
- [CGN-128](https://sandeepagrahari1.atlassian.net/browse/CGN-128) is the **Expo Android navigation/transport foundation**. [PR #35](https://github.com/Sandeepagrahari78/career-growth-network/pull/35) was open at audit time.
- [CGN-291](https://sandeepagrahari1.atlassian.net/browse/CGN-291) / [PR #32](https://github.com/Sandeepagrahari78/career-growth-network/pull/32) track the 92-screen prototype and expert UX; the six approved images take precedence when primary screen appearance conflicts.
- Jira = work and dependency truth. Merged GitHub `main` = implementation truth. Approved Figma version = implementation design after owner review. `packages/contracts` = versioned API/data truth.

**Do not begin coding just because `AGENTS.md` or this runbook exists.** Confirm Jira issue owner/status, accepted scope and blockers. Avoid duplicating ongoing PR #34/#35. Do not merge until required review and applicable CI checks pass.

## Step 5 — run context preflight for the assigned ticket

After creating the agreed feature branch (example for a *real assigned* ticket):

```bat
pnpm agent:context --ticket CGN-128 --domain mobile
```

The command creates an offline context pack. Its **live Jira option** uses separate local credentials only if explicitly configured; Atlassian MCP can instead read live Jira interactively without writing a token to disk. A context pack is not automatically live because Jira MCP is enabled.

For each coding change:

1. Inspect live Jira acceptance and dependencies and pre-existing PRs.
2. Read `AGENTS.md`, correct contract docs, exact six images and owning service.
3. Present impacted files, precise user flow, API dependencies and test plan **before editing**.
4. Do not implement an endpoint if owner/schema is unapproved: use an explicit typed UI mock/adapter ONLY if the ticket permits it.
5. Update `docs/handoffs/CGN-XXX.md` for ticket-specific product-code changes.
6. Run applicable `pnpm` tests, `pnpm memory:check`, `pnpm test:contracts`, CI per repo policy.
7. Commit/push the ticket branch and create/update its PR; inspect Linux PR CI and fix failures caused by the change. Sandeep's reviewed merge is the approval signal. The existing CGN-299 automation moves Jira to Done only after required exact-candidate CI/staging, handoff and dependency checks; no separate acceptance comment or routine manual Done step. See [delivery automation](agent-delivery-automation.md).

## Authorized implementation after preflight

When the user has already assigned a ticket for implementation, reuse that authorization. Present the exact-file/test plan, then implement, test, commit, push and open/update the ticket PR without asking again for routine delivery. Stop only for an actual unresolved contract, missing access or enforced approval. Keep the following optional dry run read-only when the user explicitly requests preflight only.

## Paste this in VS Code Codex for a *read-only* dry run

> You are the CGN project coding agent. **Do not edit, install, commit, merge or push yet.** Read `AGENTS.md`, `docs/runbooks/CODEX_JIRA_SIX_SCREEN_SETUP.md`, the six verified PNGs under `docs/design/approved-six-v1/images/`, `docs/design/CGN_V2_FINAL_SIX_APPROVED_UI.md`, and `packages/contracts/ui/cgn-v2-six-screen.v1.json`. Verify current branch/main SHA, Jira MCP connectivity by fetching CGN-297, CGN-290 and CGN-128 live, and current status of PR #32/#34/#35. Distinguish merged code from unmerged proposals. Return a table: Screen, visual reference, Jira ticket, owning service/contract, existing code status, missing approval, next safe implementation step. Preserve the current monorepo and web/Expo Android apps. Do not invent API schemas, substitute images, skip consent/minor safety, or duplicate active PR work. **Only suggest the first precise ticket-sized task; wait for my authorization before coding.**

## Collaboration/permissions reminders

Sandeep, Prachi and Tanvi should each connect Atlassian MCP using **their own Jira identity** so Jira action logs remain attributable. Do not share OAuth tokens, client secrets or personal API keys. Keep configured MCP tool write approvals enabled and respect existing user authorization; never bypass an enforced approval. GitHub pull requests are review-gated, not proof a user feature is live. No new paid infrastructure, provider registration or store publishing under setup task.
