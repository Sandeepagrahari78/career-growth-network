# Observability SDK

`@cgn/observability` provides tracing for Node services that use the shared
platform template. It uses OpenTelemetry SDK 2.x, W3C Trace Context, and the
asynchronous Node context manager.

## Configuration

- `OTEL_SERVICE_NAME` sets the resource service name. It defaults to
  `cgn-service` and accepts letters, digits, dots, underscores and hyphens.
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` enables the OTLP/HTTP protobuf exporter.
  For a local collector, set an endpoint such as
  `http://localhost:4318/v1/traces`. Leave it unset to create in-process spans
  without exporting them.
- Endpoints must use HTTP or HTTPS and must not include credentials, query
  parameters or fragments. Do not put secrets in the endpoint.

The SDK uses a batch span processor so exporting happens outside the request
path. Export and flush errors are swallowed by the package; telemetry failure
does not fail application requests or shutdown. Nest shutdown hooks flush and
stop the provider.

## Propagation and privacy

HTTP server spans extract only `traceparent` and `tracestate`. Kafka adapters
can use `withTraceContext` to extract those headers and `injectTraceContext` to
create headers for a downstream message. `runWithKafkaSpan` and
`runWithDatabaseSpan` provide bounded spans for existing adapters. Database
span operation names use a fixed allowlist. Kafka span names contain only the
producer/consumer direction; unexpected runtime values become `kafka.unknown`
with an internal span kind so the supplied value is not recorded.

Spans do not include URLs, query strings, request or event bodies, credentials,
database statements, user identifiers or arbitrary application attributes.
The package does not enable baggage or automatic database/Kafka instrumentation.
Service-owned adapters should add the helpers when their runtime paths exist;
this package does not create a new database or event contract.

## Local checks

Run `pnpm --filter @cgn/observability test:unit`, then the repository
`pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`, `pnpm build`,
`pnpm ci:boundaries` and `pnpm memory:check` checks before a PR. A live
collector and staging endpoint are not required for unit validation.
