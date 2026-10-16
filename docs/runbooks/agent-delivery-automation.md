# Agent delivery and automatic Jira updates

For local Windows tool/login checks and starting a ticket agent, use [single-ticket setup](single-ticket-agent-setup.md). The launcher and the Actions status sync are separate components; neither is claimed activated until its live test succeeds.

Ticket: CGN-299. Activation requires this PR to merge, repository secrets and a verified live round trip. A branch containing this workflow is not an active installation.

## Everyday workflow

1. The coding agent reads the live Jira ticket and latest main, implements approved scope, tests, writes the ticket handoff, commits only ticket files, pushes its `CGN-NNN-description` branch and opens a PR. It continues through Linux CI and fixes its failures without asking again about routine delivery.
2. After this workflow is merged, a ticket branch creation or push moves Jira to **In Progress**, including pushes to branches created before activation. Before merge, push events safely skip because only trusted `main` code is checked out. A ready PR moves Jira to **In Review**. Draft PRs remain In Progress. The sync never moves a ticket backwards.
3. Sandeep performs the technical review before merging. The agent must not merge on a green build alone.
4. After merge, Sandeep checks the ticket acceptance criteria, successful Main CI and required staging evidence for that merged candidate. In a PR comment, Sandeep records the evidence links and this exact line, replacing the placeholder with the full 40-character merge SHA:

   ```text
   CGN-ACCEPTED: <full-merge-commit-sha>
   ```

5. The comment triggers automatic reconciliation. **Done** requires a same-repository ticket PR merged to main by Sandeep, successful latest PR CI for the PR head, successful latest Main CI for the merge SHA, a changed ticket handoff, the owner's post-merge acceptance comment, and completed linked blockers/subtasks in Jira. A later Main CI completion also retries reconciliation.

The acceptance comment is the human sign-off, including staging and business acceptance; automation cannot infer those from unit tests. This supports owner-authored PRs where GitHub cannot accept a self-approval. Coding agents must never create the acceptance marker, even when authenticated under the owner's account. The GitHub account alone cannot distinguish a human from their delegated agent; this is a team policy boundary. The workflow does not enforce branch protection or merge rules and never deploys to production.

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
- Jira blocked-by links use the site's English `is blocked by` relationship. All listed subtasks must also be Done. Additional business dependencies not represented by those links must be checked in owner acceptance.
- If CI/acceptance is missing or a blocker is incomplete, Jira stays unchanged and logs explain why. Closing an unmerged PR does not mark Done. Reopening a Jira Done issue or reverting a release requires an explicit human decision.
- Use **Actions → Jira Delivery Sync → Run workflow**, select `main`, and enter the PR number to retry after secrets, a Jira blocker, or a transient API failure is fixed. GitHub concurrency can replace a pending event during bursts; this reconciliation action reads current state instead of replaying stale payloads.
- Workflows run trusted `main` code only, use read-only GitHub permissions, install no project dependencies and consume no PR artifacts. PR metadata is never inserted into shell commands. Repository collaborators who can edit workflows still require trust; this is not isolation from a compromised maintainer.
- One delivery PR should close one scoped task. Split partially delivered scope into child tasks before acceptance; do not use the marker to close an unfinished Epic.

## Existing CGN-34 work on Windows

The laptop's local agent must commit/push its already implemented changes and open the PR. GitHub cannot upload an uncommitted Windows working tree. Ask that agent to continue delivery, exclude `.cgn/` Docker/tool caches, watch Linux PR CI and fix only ticket-related failures. Preserve the CGN-34 local staging evidence and handoff. Sandeep review, merge, Main CI and final acceptance remain necessary before Done.

## Rollback

Disable **Jira Delivery Sync** in Actions and revoke/remove its Jira token. Revert the workflow/script PR if required. Existing Jira history is retained; correct an incorrect status manually with evidence. No application schema or product runtime changes are involved.
