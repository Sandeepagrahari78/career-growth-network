# Career Growth Network — CGN

CGN is a Career Growth **Social Network** under active development. The goal → diagnostic → 180-day plan → missions → evidence → Growth Identity → Feed/Community → Experts/Opportunities loop is the **approved product direction**, not proof that each service is already running.

## Start here — visual guide

- [CGN product flow, architecture and CI/CD diagrams](docs/architecture/PROJECT_FLOW.md)
- [Module and file ownership / dependencies](docs/architecture/MODULE_DEPENDENCIES.md)
- [Sandeep, Prachi, Tanvi multi-agent workflow](docs/architecture/AGENT_WORKFLOW.md)
- [Module guides and current implementation status](docs/modules/README.md)
- [Agent operating rules](AGENTS.md)
- [Merged implementation state](docs/engineering-memory/05-current-state.md)
- [Architecture and contract registry](docs/engineering-memory/03-contract-registry.md)
- [CI/CD runbook](docs/runbooks/ci-cd-pipeline.md)
- [Jira project](https://sandeepagrahari1.atlassian.net/jira/software/projects/CGN/boards)

## Repo structure

- `apps/web` and `apps/mobile`: client workspaces; many product screens are not built yet.
- `services/`: bounded-context workspaces; `health-demo` is the runnable smoke service, not the product backend.
- `packages/contracts/`: versioned shared architecture/integration contracts.
- `infra/`: local-first Kubernetes/Helm/PostgreSQL/Terraform/GitOps configs.
- `docs/engineering-memory/`: project decisions, scope, state and risks.
- `docs/handoffs/`: per-implemented-ticket cross-agent handoff.
- `scripts/agent-context.mjs`: offline context pack generator.
- `.github/workflows/`: PR gates, main revalidation, ephemeral staging and dry-run release controls.

## Develop one Jira ticket

1. Confirm ticket scope/owner/linked dependencies **in Jira**; update your local checkout from latest `main`.
2. Create `CGN-NNN-specific-scope` feature branch. Never push directly to main.
3. If your agent lacks live Jira access, copy/export the current ticket text into `docs/work-items/CGN-NNN.md` (include export date and Jira URL).
4. Generate offline context pack:

```bash
pnpm install --frozen-lockfile
pnpm agent:context --ticket CGN-220 --domain admin
```

5. Read `AGENTS.md`, generated `.cgn/context-CGN-220.md`, linked Jira ticket, module source, contracts and previous relevant handoffs. **The script does not fetch Jira live**.
6. Propose exact changed files and tests, implement only owning scope; update `docs/handoffs/CGN-NNN.md` using [handoff template](docs/handoffs/TEMPLATE.md).
7. Verify locally when tools are available:

```bash
pnpm ci:quick
pnpm memory:check
```

8. Push branch → PR → affected-path checks + ticket handoff gate → owner technical review → merge main → post-merge Main CI/staging.

To demonstrate that Engineering Memory survives independent agents:

```bash
pnpm demo:sync
```

## Non-negotiable boundaries

Jira is planning truth. Latest merged `main` is implementation truth. Contracts/ADRs are integration truth; Figma is approved UX truth. No cross-service DB access, no default disclosure of private data, no fabricated routes or events, and no paid infrastructure without approval.

**Current stage:** infrastructure and health-demo CI baseline are validated; production remains dry-run only, persistent live staging is not proven, and 5,000-user product workload is untested until real features exist. A green CI run is **not** a production launch.

Repository is private on GitHub Free, where desired branch protection is not enforced. Sandeep's PR-based approval and post-merge audit are compensating process controls, not a technical block on direct pushes.
