# Agent delivery and automatic Jira updates

For local Windows tool/login checks and starting a ticket agent, use [single-ticket setup](single-ticket-agent-setup.md). The launcher and the Actions status sync are separate components; neither is claimed activated until its live test succeeds.

Ticket: CGN-299. Activation requires this PR to merge, repository secrets and a verified live round trip. A branch containing this workflow is not an active installation.

## Everyday workflow

1. The coding agent reads the live Jira ticket and latest main, implements approved scope, tests, writes the ticket handoff, commits only ticket files, pushes its `CGN-NNN-description` branch and opens a PR. It continues through Linux CI and fixes its failures without asking again about routine delivery.
2. After this workflow is merged, a ticket branch creation or push moves Jira to **In Progress**, including pushes to branches created before activation. Before merge, push events safely skip because only trusted `main` code is checked out. A ready PR moves Jira to **In Review**. Draft PRs remain In Progress. The sync never moves a ticket backwards.
3. Sandeep performs the technical review before merging. The agent must not merge on a green build alone.
4. Owner-reviewed merge is the approval signal. Before merging, Sandeep checks Jira/business acceptance and any ticket-specific checks beyond the standard smoke. No separate post-merge comment is required.
5. Main CI and Staging Validation completion trigger reconciliation. **Done** requires a same-repository ticket PR merged to main by Sandeep, successful latest PR CI for the PR head, successful latest Main CI for the merge SHA, successful latest Staging Validation for that exact candidate, a nonexpired matching staging evidence artifact, changed ticket handoff and completed linked blockers/subtasks.

Staging run titles carry the tested SHA because a workflow_run's default-branch SHA can differ from its candidate. The sync reads only run/artifact metadata, never downloads artifacts. Old staging runs without candidate titles do not qualify; rerun Staging Validation from the appropriate current main candidate when necessary. Failed, skipped, queued or in-progress latest runs cannot be masked by older green runs. Staging here tests the ephemeral health-demo, not every product feature; owner review remains responsible for ticket-specific business acceptance. The account merge signal cannot distinguish a human from an agent using the same credentials. Agents must not merge without explicit authorization. No automated merge or production deployment is introduced.

## One-time activation by repository owner

After technical review, merge this PR. In repository **Settings → Secrets and variables → Actions**, add:

| Repository secret | Value |
| --- | --- |
| `CGN_JIRA_EMAIL` | Email of the Jira account with browse and transition permission in CGN |
| `CGN_JIRA_API_TOKEN` | That account's Jira API token compatible with site REST Basic authentication |

Do not paste tokens into chat, PR comments, `.env` commits or handoffs. ChatGPT's connected Jira OAuth session is not a GitHub Actions secret. The existing Jira site is fixed in code; no arbitrary host receives credentials. Scoped gateway-only tokens need a separately reviewed authentication change; do not change hosts ad hoc.

Create a real scoped ticket branch and PR, verify In Progress/In Review in Jira and the **Jira Delivery Sync** logs. Verify Done only on a real reviewed merge that satisfies acceptance. Do not mark CGN-299 itself Done merely because its mocked tests pass. Its activation round trip remains an acceptance item.

## Retry and failure behavior

- Missing secrets, permissions, unavailable Jira transitions, unrecognized status names, timeouts and HTTP errors fail visibly without marking Done. Errors do not log credentials or response bodies. Requests time out after 20 seconds and never follow redirects with credentials.
- Jira transitions are discovered live by destination status, never hardcoded numeric IDs. Duplicate deliveries skip transitions already reached. Supported statuses are To Do, In Progress, In Review and Done.
- Jira blocked-by links use the site's English `is blocked by` relationship. All listed subtasks must also be Done. Additional business dependencies not represented by those links must be checked by the owner before merge.
- If CI/staging evidence is missing or a blocker is incomplete, Jira stays unchanged and logs explain why. Closing an unmerged PR does not mark Done. Reopening a Jira Done issue or reverting a release requires an explicit human decision.
- Use **Actions → Jira Delivery Sync → Run workflow**, select `main`, and enter the PR number to retry after secrets, a Jira blocker, or a transient API failure is fixed. GitHub concurrency can replace a pending event during bursts; this reconciliation action reads current state instead of replaying stale payloads.
- Workflows run trusted `main` code only, use read-only GitHub permissions, install no project dependencies and consume no PR artifacts. PR metadata is never inserted into shell commands. Repository collaborators who can edit workflows still require trust; this is not isolation from a compromised maintainer.
- One delivery PR should close one scoped task. Split partially delivered scope into child tasks before acceptance; do not merge incomplete work to close an unfinished Epic.

## Activation evidence

PR #37 merged at `5c803011e9ea30c4cacd82b704d4e3b9859c8c1e`. Main CI run 38970986386, staging 38971322220 and sync 38971322332 passed; sync left Jira unchanged under the previous comment policy. Local OAuth/doctor and secret names were verified by the local agent. The follow-up policy must merge and complete a real automatic Jira transition before claiming activation complete. CGN-34 is already Done; do not repeat its implementation.

## Rollback

Disable **Jira Delivery Sync** in Actions and revoke/remove its Jira token. Revert the workflow/script PR if required. Existing Jira history is retained; correct an incorrect status manually with evidence. No application schema or product runtime changes are involved.
