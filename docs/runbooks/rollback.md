# CGN Rollback Runbook

Ticket: **CGN-227**

Rollback restores a known-good immutable SHA. Never patch production manually.

## Current dry-run rehearsal

1. Identify the last known-good SHA from main history.
2. Open **Rollback Production Dry Run**.
3. Supply:
   - `target_sha=<known-good main SHA>`
   - `confirmation=ROLLBACK-PRODUCTION`
4. Only `Sandeepagrahari78` is authorized.
5. The workflow verifies the SHA is part of main history.
6. It rebuilds the current placeholder artifact for that SHA, rescans it and
   validates health/readiness/E2E.
7. It uploads a rollback-evidence artifact.

No real production rollback occurs today because no production target is
enabled.

## Real-production rule

Once immutable images are stored in the approved registry, rollback must
**promote the previously scanned known-good artifact**, not rebuild from source.

If a release included a destructive database migration, follow its documented
recovery/restore plan before changing application state.

After rollback:

- run health/readiness and critical journey smoke;
- verify telemetry/error rate;
- record incident timing, affected journey and failing service;
- create a Jira follow-up;
- preserve rollback evidence.

No irreversible production migration is allowed without a recovery plan.
