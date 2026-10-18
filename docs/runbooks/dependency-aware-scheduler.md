# Dependency-aware Jira task scheduler

## What it does

The read-only scheduler reads all CGN Jira issues and current open GitHub PRs, follows Jira's directed **Blocks / is blocked by** links, and prints separate queues for Sandeep, Prachi and Tanvi. It uses the Jira execution sequence in ticket descriptions when present, then Jira Rank as a stable tie-break. Suggested priority is always displayed separately from actual Rank.

It preserves `In Progress` tickets and draft PRs as `CURRENT`. Open review PRs and Jira `In Review` tickets stay under `WAITING_FOR_REVIEW`. A task becomes ready only after its linked predecessors are Done and required merged PR, changed handoff, PR CI, Main CI and exact-SHA staging evidence are verified. Missing, partial or conflicting inputs fail closed. The scheduler never writes to Jira or GitHub, changes Rank/owners/status, launches agents, sends notifications, merges PRs, or interrupts current work.

## VS Code setup and one-command run (Windows PowerShell)

Use a Jira API token with read access to the CGN project and a GitHub token with read access to pull requests, Actions, and PR file lists. Set these only in the current terminal session; do not save them in source, `.env` files, or VS Code settings:

```powershell
$env:CGN_JIRA_EMAIL = "your Jira account email"
$env:CGN_JIRA_API_TOKEN = "paste your Jira read token here"
$env:GITHUB_TOKEN = "paste your GitHub read-only token here"
```

Then run this single command whenever you want a fresh recommendation:

```powershell
corepack pnpm recommend:next
```

For machine-readable JSON instead of the table:

```powershell
corepack pnpm recommend:next:json
```

Use `--help` to see CLI options. `--json` returns `generatedAt`, Jira freshness time, three owner lanes, current/upcoming/blocked/review tickets, dependency chains, exact reasons, Rank, execution sequence, and diagnostics.

## Offline snapshot mode

Unit/contract tests and fixture review do not need credentials. Supply an already exported snapshot:

```powershell
corepack pnpm recommend:next --input .\path\to\jira-snapshot.json
```

The snapshot shape is `{ "issues": [...], "total": N, "complete": true, "fetchedAt": "...", "completionEvidence": {...}, "pullRequests": [...] }`. For completed predecessors, `completionEvidence["CGN-123"]` must have `verified: true` plus `merged PR`, `handoff`, `PR CI`, `Main CI`, and `staging` set to `true`. Missing evidence remains a blocker.

## Scheduling rules

- Jira remains authoritative for owners, status, Rank, issue type and explicit dependency links. Ticket number order is never used as execution order.
- Direct and transitive upstream keys, owners, statuses and blocker reasons are shown.
- One owner's current ticket is never displaced. A cross-team upstream ticket can become that owner's next recommendation while another owner continues independent ready work.
- Rank only breaks ties after dependency and cross-team lookahead decisions; Jira Rank is never changed.
- Epics, subtasks, duplicates, Done items and unassigned items are not scheduled. Diagnostics show missing owners, unknown owners, duplicates, cycles and partial results.
- A missing issue target, cycle, malformed Rank, stale/partial snapshot or unverified completion evidence is not silently treated as ready.

## Output example

```text
CGN dependency scheduler | snapshot: 2026-10-18T...
Suggested priority is separate from actual Jira Rank. Read-only; no Jira/GitHub changes are made.

Sandeep Agrahari
  CURRENT            CGN-... [seq 012] IN_PROGRESS — existing work
  NEXT_READY         CGN-... [seq 018] UPSTREAM_ENABLER — unlocks a cross-team dependency
  BLOCKED            CGN-... [seq 020] BLOCKED — predecessor CGN-... is In Progress (assigned to Tanvi Ambre), not Done.
```

The sample is illustrative; each invocation uses a newly fetched Jira snapshot.

## Troubleshooting and rollback

- Missing Jira credentials: set `CGN_JIRA_EMAIL` and `CGN_JIRA_API_TOKEN` in the current terminal, then rerun.
- Missing GitHub token: open PR state and completion evidence cannot be verified. Configure `GITHUB_TOKEN` or `GH_TOKEN`; the schedule will not claim unverified dependency completion.
- HTTP 401/403: check token expiry and read scopes without sharing the token. The CLI prints only the HTTP status.
- Pagination or total mismatch: rerun after Jira stops changing. Partial snapshots do not produce ready recommendations.
- No ready ticket: read each lane's `WAITING` and `BLOCKED` reasons and work on the listed upstream ticket in its assigned lane.
- To roll back this local tool, revert the CGN-300 PR. It has no remote write path, persistent service, database, or generated state to undo.

## Future extensions

Jira comments/notifications, automatic refresh triggers, board Rank edits and agent launch remain separate features requiring their own approval and implementation. They are not enabled here.
