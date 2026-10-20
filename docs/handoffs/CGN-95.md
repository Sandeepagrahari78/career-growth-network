# CGN-95 handoff — OpenTelemetry SDK package

- **Ticket:** CGN-95
- **Branch:** `CGN-95-opentelemetry-sdk`
- **Base:** `4e97805c89121f5ba3e7c39a4e8937666309a50d`
- **PR:** [#63](https://github.com/Sandeepagrahari78/career-growth-network/pull/63)
- **Status:** implementation is ready for owner review; required handoff headings
  are being aligned after the initial CI gate failure.

## What changed

- Added the shared `@cgn/observability` package with OpenTelemetry SDK setup,
  OTLP/HTTP environment configuration, W3C trace propagation, HTTP spans and
  bounded database/Kafka span helpers.
- Wired tracing into platform-template startup, HTTP request middleware, safe
  request logs and Nest shutdown lifecycle.
- Added privacy/failure tests, the observability runbook and workspace quality
  script integration.

## Files/modules changed

- `packages/observability/`: package manifest, TypeScript config, SDK runtime and
  propagation/exporter failure unit test.
- `services/platform-template/`: dependency/build wiring, bootstrap, request
  middleware, structured request logging, shutdown provider and HTTP test.
- Root `package.json` and `pnpm-lock.yaml`: quality scripts and pinned SDK graph.
- `docs/runbooks/observability.md`, this handoff and
  `docs/engineering-memory/05-current-state.md`.

## Contracts changed

- No API or event contract changed. Workspace boundaries discover the new
  package automatically under `packages/*`; it has no service dependency.
- No contract versions or ownership rules were changed.

## Events produced / consumed

- This package does not produce or consume domain events. Kafka adapters can
  pass W3C trace headers with `injectTraceContext` and `withTraceContext`, and
  create producer/consumer spans with `runWithKafkaSpan`.

## Database / migration / config changes

- No database migration or infrastructure configuration was added.
- Optional runtime settings are `OTEL_SERVICE_NAME` and
  `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`. With no endpoint, spans stay in-process
  and are not exported.
- No collector, paid infrastructure, database driver or Kafka driver was added.

## Tests run

- Passed full `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`,
  `pnpm test:integration`, `pnpm build`, and `pnpm ci:boundaries` on the Windows
  feature checkout; scoped Prettier check also passed.
- The new package test checks an incoming W3C trace across an HTTP server span
  and child database/Kafka spans, rejects endpoint credentials/query strings,
  and confirms exporter failure does not fail request work. The failure emits a
  sanitized event.
- The PostgreSQL outbox integration test was skipped because the local Docker
  daemon is unavailable; CGN-95 does not modify the outbox.
- Full Windows `format:check`, `ci:quick` and 3 contract tests hit existing
  line-ending-sensitive checks because tracked Helm files are CRLF in this
  checkout while those validators search for LF. The changed-file formatter
  passed; Linux PR CI is authoritative for these repository-wide checks.
- Initial PR CI run `39356907144` stopped at the handoff gate because this file
  lacked the required exact section headings. Other quality jobs were skipped.
  Rerun status will be added after this correction is pushed.
- `pnpm memory:check` passed after staging the handoff and Engineering Memory
  update.

## Known limitations / risks

- Database and Kafka instrumentation is exposed as reusable helpers; service
  adapters and live runtime drivers are not added by this ticket.
- Export is disabled unless `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` is set.
- The HTTP span omits URLs and request data to avoid recording identifiers or
  secrets. No live collector or staging endpoint was available for this change.

## Exact next step for next agent

Run the handoff gate and full PR CI on the corrected candidate. Sandeep reviews
the architecture/security impact before merge. After merge, confirm main CI,
update this handoff and Engineering Memory with merge evidence, then re-query
live Jira rank and blockers before starting the next ready ticket.

## Rollback note

Revert the CGN-95 PR. The platform template then drops the observability package
dependency and tracing bootstrap/middleware wiring; no persisted data needs
rollback.

## Engineering Memory updated

`docs/engineering-memory/05-current-state.md` contains a CGN-95 candidate section
that records the implementation boundary and its not-yet-merged status.
