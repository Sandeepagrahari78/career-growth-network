# CGN Fast Delivery V2 — solo agent pre-push protocol (CGN-301)

This workflow reduces failed CI attempts and repeated context reads **without relaxing any
review, authorization, privacy, dependency or quality gates**. It does not promise a
10-minute Jira completion time. The full PR CI, latest main CI, exact-candidate staging
and Jira Delivery Sync remain authoritative.

## One-time setup

- Use Node 22, pinned pnpm 11.25.0, Git, and the existing CGN worktree.
- Authenticate Codex/Jira via the existing MCP or the read-only, opt-in
  `pnpm agent:context --ticket CGN-NNN --domain <domain> --jira-live`
  only when the local Jira credentials are configured.
- Update the merge base before opening the ticket worktree: `git fetch origin main`.
  Do not reset/clean another person's workspace.
- This helper is a local CLI, **not** a hosted Jira monitor, unattended agent, or auto-merge engine.

## For every new Jira ticket

1. **Live Jira first.** Check current owner, status, actual issue type, blockers and
   exact acceptance criteria through the authenticated Jira MCP. Stop if blocked
   or the ticket is an Epic. Source-of-truth rules in AGENTS.md still apply.
2. **Reuse current context.** Read AGENTS.md and the ticket's generated
   `pnpm agent:context --ticket CGN-NNN --domain <domain>` output.
   Re-read only contracts, ADRs and predecessor handoffs affected since main.
   Never treat stale local exports as live Jira.
3. **Code once, test with the feature.** Scope to the owning service and its
   versioned contracts, include negative tests, privacy handling, handoff and
   rollback. Run small targeted tests while coding.
4. **Commit locally on an isolated `CGN-NNN-description` branch.**
   Review `git status` and `git diff`; stage only ticket-owned files.
5. **Run pre-push validation:**

   ```powershell
   pnpm ticket:check --ticket CGN-XXX
   ```

   The CLI requires a clean committed feature branch, a trusted
   `origin/main` remote and committed change set. It runs branch, memory,
   ticket handoff, platform-scope and workspace-boundary gates using the
   computed merge-base. For service changes it runs changed-file format/lint
   and package build/typecheck/unit/integration/contract scripts when available;
   for cross-cutting files or unknown packages it falls back to full
   `pnpm ci:quick`. A local green status never replaces full GitHub CI.

   Optionally include live Jira read-only snapshot if local Jira credentials
   are already available:

   ```powershell
   pnpm ticket:check --ticket CGN-XXX --jira-live
   ```

   For changed services with `test:docker`, after starting Docker Desktop,
   run Docker readiness locally before push:

   ```powershell
   pnpm ticket:check --ticket CGN-XXX --docker
   ```

   Docker failures are real failures, not skips; inspect the container's
   startup logs, readiness/port binding and exit code, then repair the cause.
   Docker validation in required GitHub PR CI still runs even if local
   Docker is unavailable. The tool does not copy secret logs into metrics.
6. **Push once and use one PR per Jira task.** Let full GitHub PR CI run
   affected Docker, security, integration and performance gates. Fix actual
   failures in the existing branch. Do not weaken checks or stack
   documentation-only commits just to repeat an unchanged test.
7. **Sandeep reviews and authorizes the merge.** After reviewed merge,
   verify Main CI, same-candidate staging validation and automatic Jira
   Delivery Sync; do not manually claim Done based on local checks.

## Metrics and feedback

The CLI writes local JSON per execution to
`.cgn/ticket-metrics/CGN-NNN-<timestamp>-<pid>.json`.
Only command name, local duration, outcome, ticket, branch and baseline are
recorded; no passwords, token values, raw logs or source files are exported.
These files are git-ignored. They are **local check timings only**, not a
measurement of Codex coding time, CI queue time, review wait or Jira lifecycle.
Measure those other intervals separately from agent logs and GitHub Actions
before optimizing the CI architecture further.

Use failures to identify the repeated root cause:
- Formatting/lint/typecheck: fix before push.
- Docker connection refused: inspect server startup/readiness and container
  logs, not just retry the network request.
- PostgreSQL race: distinguish temporary readiness errors from actual SQL
  errors; never blanket-retry migrations.
- CI scanner failure: do not mark successful, disable scanning or bypass gates.
- Jira blocked dependency: choose the next eligible ticket; do not fabricate
  a missing API or mark incomplete work Done.

## Scope and limitations

This initial V2 improvement adds deterministic pre-push validation,
fail-closed fallback, timing evidence and the operating procedure. It
**does not** change CI policy, auto-merge settings, PR ownership, staging
coverage, external Jira access, or existing multi-agent branch protections.
There is no benchmark demonstrating a measured 50% time saving yet.
Every sensitive change still requires Sandeep review.

Rollback: revert CGN-301's tooling PR and remove the `ticket:check`
package script. No application schemas, credentials or product data change.
