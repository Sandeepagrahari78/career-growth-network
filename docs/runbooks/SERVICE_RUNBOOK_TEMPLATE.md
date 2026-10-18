# Service runbook template

Copy this file for an owning service and replace every bracketed value. State
whether each action is **Implemented**, **Approved**, **Planned**, or **Not
validated**. Never copy placeholder commands into an incident procedure.

## Service and escalation

- Service / Jira owner: `[service and owner]`
- Technical escalation: `[on-call route or responsible role]`
- User impact and data sensitivity: `[known impact and classification]`
- Related ownership guide and contracts: `[repository links with versions]`

## Health checks and first response

1. Check `[health and readiness endpoint / monitoring link]`.
2. Check `[approved logs, metrics and relevant dashboard]`; avoid collecting
   request bodies, credentials, tokens or private user content.
3. Compare the observed failure with `[known incidents or dependency status]`.
4. Record the time window, safe request/correlation IDs, affected operation and
   observed status without copying sensitive data.

## Dependencies and recovery

- Upstream dependencies: `[explicit links and contract versions]`
- Downstream impact: `[consumers and safe degradation behavior]`
- Retry policy and idempotency: `[bounded policy, or not implemented]`
- Recovery action: `[reversible command and expected result]`
- Escalation / incident handoff: `[owner and required evidence]`

## Data and migrations

- Service-owned database: `[name, or none]`
- Migration status and exact command: `[migration and target checks]`
- Backup / restore: `[approved procedure, evidence, or not applicable]`
- Rollback: `[exact reversible steps and compatibility constraints]`

## Local verification commands

Record commands copied from the service's current package scripts and README:

```text
[build command]
[unit/integration test command]
[local acceptance command, if one exists]
```

For each command, state prerequisites, expected result, cleanup behavior, and
whether it was verified on `main`. Do not claim a local command validates
production or a deployment environment it does not reach.

## Incident closure

- Recovery verified by: `[health, behavior, data integrity evidence]`
- Follow-up Jira ticket(s): `[keys or none]`
- Evidence location and safe identifiers: `[link or location]`
- Last verified against `main`: `[commit SHA and date]`

