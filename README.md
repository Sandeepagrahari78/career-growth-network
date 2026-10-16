# Career Growth Network — CGN

CGN is a Career Growth **Social Network** under active development. On 2026-10-16 the team approved a wider **Student Ecosystem V2 product direction**: a continuous journey after Class 10 through exam preparation, college and career, combining social life, peer support, individual goals and meaningful growth. The existing diagnostic → plan → missions → evidence → Growth Identity → social/experts/opportunities loop remains foundational. **Neither the V2 features nor all prior product services are necessarily implemented**; design and contract changes need separate approval.

## Start here — visual guide

- [Approved V2 product vision / PRD](docs/product/CGN_V2_PRODUCT_VISION.md)
- [31-Epic feature audit and gap matrix](docs/product/CGN_V2_FEATURE_GAP_AUDIT.md)
- [V2 architecture/contract impact review (pending technical decisions)](docs/product/CGN_V2_ARCHITECTURE_REVIEW.md)
- [V2 design-system, screen inventory and Google Stitch handoff (draft frames, not approved Figma)](docs/design/CGN_V2_DESIGN_HANDOFF.md)

- [CGN product flow, architecture and CI/CD diagrams](docs/architecture/PROJECT_FLOW.md)
- [Module and file ownership / dependencies](docs/architecture/MODULE_DEPENDENCIES.md)
- [Sandeep, Prachi, Tanvi multi-agent workflow](docs/architecture/AGENT_WORKFLOW.md)
- [Three-member demo and optional live Jira context onboarding](docs/architecture/TEAM_ONBOARDING_DEMO.md)
- [Web vs Android coding-agent file ownership / PR gate](docs/architecture/WEB_ANDROID_AGENT_OWNERSHIP.md)
- [Android Google Play release checklist (CGN-287)](docs/runbooks/android-play-release-checklist.md)
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

5. (Optional) With locally configured Jira READ credentials (`CGN_JIRA_EMAIL` and `CGN_JIRA_API_TOKEN`), use `pnpm agent:context --ticket CGN-220 --domain admin --jira-live`. It fails closed without credentials and only reads from the approved Jira site.
6. Read `AGENTS.md`, generated `.cgn/context-CGN-220.md`, linked Jira ticket, module source, contracts and previous relevant handoffs. **The default command does not fetch Jira live; optional `--jira-live` requires local Jira credentials**.
7. Propose exact changed files and tests, implement only owning scope; update `docs/handoffs/CGN-NNN.md` using [handoff template](docs/handoffs/TEMPLATE.md).
8. Verify locally when tools are available:

```bash
pnpm ci:quick
pnpm memory:check
```

9. Push branch → PR → affected-path checks + ticket handoff gate → owner technical review → merge main → post-merge Main CI/staging.

To demonstrate that Engineering Memory survives a two-agent simulation:

```bash
pnpm demo:sync
```

To verify the additional **three-person synthetic handoff simulation**:

```bash
pnpm demo:three-agents
```

This is a deterministic simulation, not three live autonomous coding agents. See [onboarding demo](docs/architecture/TEAM_ONBOARDING_DEMO.md).

## Non-negotiable boundaries

Jira is planning truth. Latest merged `main` is implementation truth. Contracts/ADRs are integration truth; Figma is approved UX truth. No cross-service DB access, no default disclosure of private data, no fabricated routes or events, and no paid infrastructure without approval.

**Current stage:** infrastructure and health-demo CI baseline are validated; production remains dry-run only, persistent live staging is not proven, and 5,000-user product workload is untested until real features exist. A green CI run is **not** a production launch.

Repository is private on GitHub Free, where desired branch protection is not enforced. Sandeep's PR-based approval and post-merge audit are compensating process controls, not a technical block on direct pushes.

## CGN V2 — Student Ecosystem direction (product planning, 2026-10)

The team-approved **direction** expands CGN from a mainly college-career growth network into an evolving education, competitive-exam preparation, social and career-growth ecosystem. This is **product planning**, not evidence of new deployed product features, active exam catalogs or approved privacy contracts. Existing code, Jira scope, Figma authority and versioned contracts remain binding until their respective change tickets and approvals.

- [CGN V2 Product Vision / PRD](docs/product/CGN_STUDENT_ECOSYSTEM_V2_PRD.md)
- [31 existing Epic feature-gap audit](docs/product/CGN_V2_FEATURE_GAP_MATRIX.md)
- [Student Journey architecture and safety contract RFC questions](docs/product/CGN_V2_ARCHITECTURE_DECISION_BRIEF.md)
- [Google Stitch → Figma UX screen inventory and master design prompt](docs/product/CGN_V2_DESIGN_HANDOFF.md)
- [V2 execution sequence and Jira workstreams](docs/product/CGN_V2_EXECUTION_ROADMAP.md)

**Next:** [CGN-293](https://sandeepagrahari1.atlassian.net/browse/CGN-293) (architecture), [CGN-294](https://sandeepagrahari1.atlassian.net/browse/CGN-294) (UX) and [CGN-295](https://sandeepagrahari1.atlassian.net/browse/CGN-295) (pilot research). No app implementation until relevant contracts, age protections, approved Figma frames and per-ticket acceptance are ready.
