# Handoff - CGN-90

- Ticket: CGN-90 — Create resource request limit policy and capacity dashboard
- Branch: CGN-90-kubernetes-capacity-dashboard
- Base branch: `main` at `f5a7679fdcc0c98db9113e01b0dddd4487bc5600`
- Agent/person: Codex implementation under Sandeep review; Jira owner Tanvi
- Date: 2026-10-19

## What changed

Added a reusable Helm schema policy requiring CPU and memory requests and limits
as a complete pair when a service supplies a resource profile. Added explicit
health-demo staging values matching the existing health-demo production
profile. The PR performance job measures a short 25 RPS baseline with a 100-VU
pool configured and repeats it under disposable CPU and memory pressure, then writes a usage/headroom dashboard
to the GitHub Actions step summary.

This exercise is intentionally limited to the health-demo image. It does not
simulate 5,000 registered accounts or claim product capacity; CGN-284 owns the
full synthetic-user load/soak suite.

## Files/modules changed

- `infra/helm/cgn-service/values.schema.json`
- `infra/helm/values/health-demo-staging.yaml`
- `tests/performance/resource-capacity.js`
- `tests/performance/resource-capacity.contract.test.mjs`
- `tests/performance/resource-pressure.mjs`
- `tests/performance/run-resource-capacity.mjs`
- `.github/workflows/pr-ci.yml`
- `docs/runbooks/autoscaling-disruption.md`
- `docs/engineering-memory/05-current-state.md`
- `docs/handoffs/CGN-90.md`

## Contracts changed

No product API, event or database contract changed. The reusable chart's
existing resource-values schema now validates complete CPU/memory pairs.
Existing `cgn.capacity.v1` latency and scale thresholds remain unchanged.

## Events produced / consumed

None.

## Database / migration / config changes

No database migration, cloud service or paid resource. Health-demo staging
resource values are `requests: cpu 50m, memory 64Mi` and `limits: cpu 500m,
memory 256Mi`; CI applies those limits to the disposable performance container.

## Tests run

- Passed: `node --check` for all three new performance scripts.
- Passed: `node --test tests/performance/resource-capacity.contract.test.mjs` (2/2).
- Passed: JSON parse for `infra/helm/cgn-service/values.schema.json`.
- Passed: `node scripts/ci/validate-helm-base.mjs`.
- Passed: `node scripts/memory-check.mjs`.
- Passed: `git diff --check`.
- Pending: Linux PR quality/security, k6 resource pressure dashboard and Local
  Helm validation. Local Docker runtime is not available in this environment.
- A local run of `node scripts/ci/validate-autoscaling-disruption.mjs` failed
  its existing LF-only string assertion against the CRLF checkout of unchanged
  `infra/helm/cgn-service/values.yaml`; Linux CI runs against LF checkout.
- `pnpm memory:check` could not start because `pnpm` is unavailable in this
  checkout; the equivalent Node entry point passed.
- The mandated `corepack pnpm agent:context --ticket CGN-90 --domain infra`
  invocation failed because its child command could not find the `pnpm` binary;
  fallback `node scripts/agent-context.mjs --ticket CGN-90 --domain infra`
  generated the context bundle, which was read before implementation.

## Known limitations / risks

- Usage/headroom describe only the health-demo endpoint and the shortened CI
  profile on an ephemeral GitHub runner.
- The pressure exercise is not a sustained five-minute HPA trigger test.
- Do not reuse these resource values for other services without measured
  workload evidence; full 5K capacity remains CGN-284 scope.

## Exact next step for next agent

Inspect the actual PR performance dashboard and Local Helm results. Sandeep
reviews the resource policy and evidence before merging; after merge verify Main
CI and exact-candidate Staging Validation before moving to the next Jira ticket.

## Rollback note

Revert the CGN-90 PR. Restore the previous health-demo staging `resources: {}`
value if rolling back only the staging profile; chart rendering remains
compatible with services that omit resources entirely.

## Engineering Memory updated

- [x] 05-current-state.md
- [x] 06-known-risks.md

## Owner review and PR references

- GitHub PR URL: https://github.com/Sandeepagrahari78/career-growth-network/pull/53
- Commit / merge SHA: initial implementation `58e154f93b67c0a877adc671908e36763b960d38`; merge pending.
- Jira live dependency/status verification: CGN-90 To Do, assigned Tanvi; hard
  prerequisite CGN-44 Done; ticket permits AI implementation with Sandeep review.
- Source and tests inspected on latest main: yes, main at
  `f5a7679fdcc0c98db9113e01b0dddd4487bc5600`.
- Required Sandeep review (if sensitive): pending; Jira labels this ticket for
  Sandeep review and the resource policy affects deployment configuration.
