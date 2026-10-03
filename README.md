# CGN Shared Engineering Memory & Agent Synchronization Layer

This starter implements steps 1-8 of the agreed pre-pipeline plan:

1. Monorepo foundation
2. Shared Engineering Memory
3. Shared contracts skeleton
4. Agent-context command
5. Dummy Module A
6. Handoff
7. Dummy Module B / second-agent simulation
8. Proof that critical context survives agent change

CI/CD is intentionally the next layer, not mixed into this starter.

## Run the synchronization proof

```bash
pnpm install
pnpm demo:sync
```

Expected result ends with:

```text
SUCCESS: context survived Agent A -> handoff -> Agent B.
```

## Start any real Jira ticket

Optionally export/copy the ticket into `docs/work-items/CGN-123.md`, then run:

```bash
pnpm agent:context --ticket CGN-123 --domain evidence
```

The generated `.cgn/context-CGN-123.md` is the minimum context a new coding agent must read before changing code.

## Log merged engineering state

```bash
pnpm memory:log --ticket CGN-123 --summary "Implemented ..." --modules "services/evidence" --contracts "career.activity.v1" --risks "none"
```

## Before PR/handoff

Create `docs/handoffs/CGN-123.md` from the template and run:

```bash
pnpm memory:check
```

## Important
This layer reduces context drift; it does not replace Jira, contracts, tests, code review or CI/CD. The next step is to connect this memory layer to the PR pipeline so a code change cannot silently bypass synchronization requirements.
