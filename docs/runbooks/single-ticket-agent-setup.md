# One-ticket local agent setup (CGN-299)

## What is installed by this PR

`scripts/ci/agent-deliver.mjs` checks local tools/authentication, creates an isolated ticket worktree from current `origin/main`, and starts the existing Codex CLI with a delivery prompt through stdin. It does not install software, provision credentials, disable approvals, or replace required technical review. It is a local launcher, not a hosted/background service or deterministic autonomous merge engine. Its tests use mocks; a real Windows authenticated run is still required.

Owner input after setup:

```powershell
node scripts/ci/agent-deliver.mjs CGN-35
```

Choose an actually ready child task. CGN-34 is already completed; do not rerun its implementation. CGN-24 is an Epic; the agent must identify child tasks, not invent one large implementation. Existing requirements for Sandeep technical review remain applicable. Automatic merge for every ticket is not enabled by this launcher; a separately reviewed merge policy and readiness contracts are needed before removing that stop.

## Step 1 — preserve the Windows working copy

Open VS Code in `C:\Users\Sandeep\career-growth-network`. Have the existing local coding agent inspect `git status --short`, current branch and remotes. Preserve all user modifications and local `.cgn/` files. Do not use reset/clean or overwrite credentials. This PR's setup files can be inspected in a separate worktree before merging. After review/merge, use current main containing the setup script; never treat an older checkout as installed setup.

## Step 2 — tools and sign-in (one time)

In the VS Code PowerShell terminal:

```powershell
node --version
git --version
gh --version
codex --version
```

Use the existing project's Node/pnpm versions. If `gh` is missing, install GitHub CLI from its official Windows installer, reopen the terminal, then:

```powershell
gh auth login --hostname github.com --web
gh auth setup-git
```

If Codex CLI is missing or its help lacks `--approve-for-me`, install/update the official package:

```powershell
npm install -g @openai/codex
codex login
```

Choose the owner's existing ChatGPT account in the browser. `codex login status` checks the local CLI session; do not assume the VS Code extension or this chat shares it. This setup does not create an API billing account or promise unlimited runs. Existing plan quotas and account/tool restrictions still apply.

## Step 3 — connect Jira to the local agent

First inspect existing server names:

```powershell
codex mcp list
```

If an enabled server already uses `https://mcp.atlassian.com/v2/mcp`, reuse its name and authenticate it. Otherwise add it once:

```powershell
codex mcp add jira --url https://mcp.atlassian.com/v2/mcp
codex mcp login jira
```

Browser OAuth must be completed by the owner for the approved Jira site. If the existing server has a different name, substitute that name in `codex mcp login`. Do not duplicate the pending CGN-298 project configuration or paste tokens into chat. Configuration detection is not proof of live Jira permission; the started agent must read the chosen Jira issue before editing.

## Step 4 — connection preflight

From the repository containing this PR's script:

```powershell
node scripts/ci/agent-deliver.mjs --check
```

This performs read-only checks for repository identity, GitHub access, Codex login, supported flags and configured Atlassian MCP. It does not start a model task, change Jira, fetch code or create a worktree. Fix the exact reported failure. Do not enable sandbox bypass to work around an approval rejection.

## Step 5 — first real ticket

```powershell
node scripts/ci/agent-deliver.mjs CGN-35
```

The launcher fetches main and creates `.local/agent-delivery/CGN-35` on `CGN-35-agent-delivery`. The original worktree is left intact. The agent verifies scope/design/contracts/dependencies, writes its exact file/test plan, updates Jira, codes/tests, commits/pushes and follows PR CI with a maximum of three repair attempts in its instructions. It records a blocker instead of fabricating missing API/design contracts. Its final message is `.local/agent-delivery/CGN-35/.local/agent-result.md`.

Keep the laptop awake with network access while it runs. If an enforced approval, missing required human review or quota stops execution, the final report must say so. The launcher does not prove that an agent obeyed all requested steps; PR/Jira/CI evidence remains authoritative. A zero process exit code is not ticket completion.

To continue an interrupted ticket without discarding its existing work:

```powershell
node scripts/ci/agent-deliver.mjs CGN-35 --resume
```

Resume starts a new agent turn in the same ticket worktree, using persisted code/Jira/handoff evidence. It does not blindly reuse an unrelated last chat. Concurrent runs of the same worktree are blocked by `.local/agent-delivery.lock`. After a hard kill, inspect its PID and ensure no agent is still running before removing only that stale lock. Never delete the ticket worktree to retry.

## Step 6 — GitHub-to-Jira sync is separate

The local agent uses Jira OAuth. GitHub Actions needs the separate `CGN_JIRA_EMAIL` and `CGN_JIRA_API_TOKEN` repository secrets from [delivery automation](agent-delivery-automation.md). Neither authentication is copied into the other system. Configure those secrets in GitHub's UI; do not put them into this launcher. The status-sync workflow must be merged and verified before calling it active.

For tickets with required human review, the agent should deliver a review-ready PR and one precise decision request. A generic desire for speed is not evidence that review occurred. The owner-reviewed merge is the approval signal; latest PR/Main CI and exact-candidate staging must succeed before automatic Done. No extra acceptance comment is needed. Remaining true-autopilot work includes executable ticket-readiness specifications, a reviewed automated-review/merge policy and integration tests for the whole live lifecycle.

## Verified reference

Official CLI reference, checked 2026-10-17: https://learn.chatgpt.com/docs/cli/reference
Non-interactive operation: https://learn.chatgpt.com/docs/non-interactive-mode
Uses `codex exec --approve-for-me` with workspace-write/automatic approval review, never `--yolo`. The installed CLI help is checked before starting. No specific model is forced.
