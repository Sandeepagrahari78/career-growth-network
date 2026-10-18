# Service ownership template

Copy this page into the owning module guide and replace every bracketed value.
Keep each statement marked **Implemented**, **Approved**, **Planned**, or
**Not validated** so the guide does not imply that proposed behavior already
exists.

## Service identity and owners

- Service / module: `[name and repository path]`
- Product/domain owner: `[team or Jira owner]`
- Technical owner and escalation route: `[role, channel or incident queue]`
- Runtime state: `[Implemented / Approved / Planned / Not validated]`

## Responsibility and data boundary

- Owns: `[one authoritative data and behavior responsibility]`
- Does not own: `[neighboring responsibilities that remain elsewhere]`
- Data store and access boundary: `[service-owned store, or none]`
- Privacy / consent / authorization rules: `[owning contract and enforcement point]`

## Dependencies and contracts

| Direction | Service or package | Contract and version | Purpose | State |
|---|---|---|---|---|
| Provides / consumes | `[name]` | `[contract identifier and version]` | `[why needed]` | `[state]` |

Only list explicit dependencies. Link the owning contract, ADR, and Jira ticket;
do not treat a planned flow or an unmerged branch as an implemented interface.

## Health and operations

- Liveness / health endpoint: `[path, or none]`
- Readiness endpoint and conditions: `[path and conditions, or none]`
- Important alerts and dashboards: `[links or none]`
- Operational status: `[evidence and last verified date]`

## Telemetry and audit

- Structured log events and safe fields: `[event names and allow-list]`
- Metrics / traces / audit records: `[names, owner, or none]`
- Sensitive values excluded: `[payloads, credentials, personal data, etc.]`

## Database, migrations, backup and rollback

- Schema / migration owner and location: `[service-owned path, or none]`
- Migration command and target selection: `[exact command and safety boundary]`
- Backup / restore procedure and evidence: `[runbook, or not applicable]`
- Rollback procedure and compatibility limits: `[exact steps]`

## Local development and verification

- Prerequisites: `[versions and local services]`
- Build / typecheck: `[exact repository command]`
- Unit / integration / acceptance tests: `[exact repository commands]`
- Links to source, test and runbook: `[repository-relative links]`

## Unimplemented or unverified work

- Planned behavior: `[Jira keys and concise scope]`
- Known limitations: `[what has not been tested or deployed]`
- Last verified against `main`: `[commit SHA and date]`

