# Product analytics event dictionary

`events.v1.json` defines versioned product-funnel event names, owning producer,
consent class, retention owner, an explicit payload allow-list and synthetic
examples. It is a dictionary only; it does not create an SDK, producer, API,
storage, consent service or retention duration.

All entries use the `product_analytics_opt_in` consent class. Identity remains
the source of truth for consent; a future producer must honor the current
Identity authorization before emitting. The `analytics` context owns retention
policy, whose duration is intentionally not set by this ticket.

Samples use only synthetic subject/event identifiers and approved surface names.
Event payloads exclude user text, message/story/evidence bodies, credentials,
tokens, contact details and marks. Use the shared `domain.event.envelope.v1`
envelope when producers are implemented. These entries do not assert an
existing event bus or runtime instrumentation.

The event name and producer are stable across minor dictionary additions. A
breaking payload or meaning change requires a new event name major version and
an owner-led migration. Additive optional properties may stay in the same major
event version after contract review.
