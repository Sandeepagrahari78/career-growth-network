# CGN three-person / multi-coding-agent workflow

## Three sources of authority

- **Jira:** planned scope, owner, status, explicit links/dependencies and acceptance criteria.
- **GitHub latest main:** code that actually merged. A branch, old conversation, or draft PR is **not** implementation truth.
- **Versioned contracts / ADR / Figma:** integration shapes, architecture decisions and approved UI. Source conflicts **stop work** and require human resolution.

## Human responsibility (ticket assignment wins)

| Member | Usual focus | Approval expectations |
|---|---|---|
| Sandeep | backend, architecture, infrastructure, privacy/security, data, AI/scoring | Final technical review for cross-domain/production-sensitive work |
| Prachi | assigned web/mobile UI and UX | Follow Jira and approved Figma; negotiate contract changes with owning service |
| Tanvi | assigned community, expert, admin, QA and moderation | Follow Jira boundaries; sensitive data/authorization changes require Sandeep |

AI agents act *for* the ticket owner, not as independent owners of architecture. Separate agents should use separate clones/worktrees or feature branches; never develop in the same working tree concurrently.

## Repeatable steps for each Jira ticket

1. Confirm exact ticket key, owner, parent, acceptance criteria and upstream blockers **from Jira**. Do not substitute numbered-order guesses.
2. Fetch/pull `main` and create `CGN-NNN-specific-scope`; never start from an outdated agent branch.
3. Copy a current ticket export to `docs/work-items/CGN-NNN.md` if the agent has no live Jira connector. Mark export date and current Jira link; regenerate when Jira changes. **Never commit secrets**.
4. Run `pnpm agent:context --ticket CGN-NNN --domain admin` (choose relevant domain); open the generated `.cgn/context-CGN-NNN.md`. This local context pack includes checked-in rules/architecture, ticket export when supplied, and named predecessor handoffs. By default it is **not** a live Jira fetch. Optional `--jira-live` uses read-only Jira REST when `CGN_JIRA_EMAIL` and `CGN_JIRA_API_TOKEN` are securely supplied.
5. Read relevant source code, package boundaries, contract ownership, existing tests and `git log`; submit a small exact-file impact plan. Stop when dependencies/contract details are missing.
6. Implement only approved files, update source/test/contract/module docs together. Never directly read another service DB.
7. Update `docs/handoffs/CGN-NNN.md` using [template](../handoffs/TEMPLATE.md): changed files, behavior, contracts/events, tests and results, risks, next agent instruction, rollback.
8. Push branch and open PR. Run CI; on failure fix and push new commit. **A green PR does not automatically merge itself.**
9. Sandeep reviews integration/security/architecture-impacting changes; merge through PR into main; verify post-merge Main CI and staging. Update Jira to Done only after acceptance evidence.
10. The next agent starts at step 1 against **new** main and predecessor handoffs, not prior chat memory.

## CGN-220 concrete example

Tanvi first opens [CGN-220](https://sandeepagrahari1.atlassian.net/browse/CGN-220) and checks its links. She creates `CGN-220-opportunity-publishing`, exports approved Jira text to `docs/work-items/CGN-220.md` if offline, then runs:

```bash
pnpm agent:context --ticket CGN-220 --domain admin
```

The agent must describe what already exists, what is missing, exact proposed files and which neighboring tickets/contracts are needed; *do not implement a new Admin service only because its name appears on a diagram*.

## Three-member proof and CLI onboarding

Run `pnpm demo:three-agents` after `pnpm install` to verify a deterministic Sandeep → Prachi → Tanvi handoff simulation. This is not a three-model execution or evidence of a completed business feature. Full instructions: [TEAM_ONBOARDING_DEMO.md](TEAM_ONBOARDING_DEMO.md).

## Rules for handoff automation

- PR CI verifies `docs/handoffs/CGN-NNN.md` is **changed** for changed product code (`apps/`, `services/`, `packages/`) or infrastructure (`infra/`). Docs-only PRs are exempt.
- Handoff must include required sections and the exact ticket key, with meaningful nonempty content. A handoff is an audit artifact, not evidence that all tests succeeded; actual Actions run is authoritative.
- This gate protects PRs, not direct main pushes; on current private GitHub Free account branch protection isn't enforced. Team policy: never push directly to main.
- No real-production deploy, cloud expenses or committed Jira tokens.

## Before an agent edits web or Android files

Read [platform ownership rules](WEB_ANDROID_AGENT_OWNERSHIP.md) and the ticket entry in `config/ci/ticket-platform-scopes.v1.json`. Mobile-only tickets must not edit `apps/web/`; web-only tickets must not edit `apps/mobile/`. For an unregistered ticket, verify the live Jira scope and get Sandeep approval to register it. The PR CI file-scope gate enforces this against changed files. A single monorepo preserves the shared contract layer; this path check alone does not validate actual Play Store deployment.
