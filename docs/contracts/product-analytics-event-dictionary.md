# Product analytics event dictionary

The canonical machine-readable dictionary is
[`packages/contracts/analytics/events.v1.json`](../../packages/contracts/analytics/events.v1.json).
Its shared TypeScript shape and JSON Schema are
[`product-analytics.v1.ts`](../../packages/contracts/src/analytics/product-analytics.v1.ts)
and
[`product-analytics.v1.schema.json`](../../packages/contracts/schemas/product-analytics.v1.schema.json).

## Consent and retention

Every event is classified `product_analytics_opt_in`. Identity owns consent
truth; a future producer must honor the current Identity authorization before
emitting. This dictionary defines no consent API or runtime check. The Analytics
context owns retention policy. A duration is intentionally omitted pending its
owning privacy-policy decision.

## Payload limits

Each event declares an explicit property allow-list. Current properties record
only the approved source surface. Samples use synthetic event IDs and contain
no subject/account identifier. Event payloads must not contain private text,
message/story/evidence bodies, credentials, tokens, contact details or marks.
Use `domain.event.envelope.v1` when event producers are implemented. This ticket
adds no producer, SDK, API, persistence or instrumentation.

## Versioning

Event names are stable `cgn.analytics.*.v1` identifiers. Additive optional
properties may remain in v1 after contract review; a breaking payload or meaning
change requires a new event version and an owner-led migration. Increment the
dictionary SemVer when entries or compatible metadata change.
