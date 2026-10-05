# CGN Rollback Runbook

Rollback must restore a known-good immutable SHA, not patch production manually.

1. Detect failure through health/smoke/telemetry.
2. Stop promotion of the bad SHA.
3. Identify the last known-good release SHA.
4. If no destructive migration occurred, redeploy the known-good artifact.
5. If a risky migration occurred, follow its documented recovery/restore plan before changing application state.
6. Run health and critical smoke checks.
7. Record incident timing, affected journey, failing service/dependency, mitigation and follow-up Jira ticket.

No irreversible production migration is allowed without a recovery plan.
