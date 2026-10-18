# Local Redpanda event bus

CGN's local, single-node Kafka-compatible broker is pinned to Redpanda
`v24.2.10`. Docker Compose exposes Kafka at `localhost:19092` and the admin API
at `localhost:19644`, bound to loopback only. Broker data is kept in the
Compose-managed `cgn-redpanda-data` volume.

## Start and verify

Run these commands from the repository root after Docker is running:

```bash
pnpm redpanda:up
pnpm redpanda:verify
pnpm redpanda:restart-smoke
```

`restart-smoke` publishes a fresh event based on the existing
`domain.event.envelope.v1` fixture to the infrastructure-only topic
`cgn.contract-smoke.v1`, restarts the broker, then consumes the exact event ID
to prove recovery from the persistent data volume. It does not register a
product event type or topic contract.

## Topic naming and delivery policy

Product topics must be approved by the owning service and registered in shared
contracts before producers or consumers use them. Use a stable domain name plus
a schema/API major version, for example `<domain>.<event-name>.v1`. Do not put
deployment environments or personal data in topic names.

For a product topic `<topic>`, reserve `<topic>.retry` and `<topic>.dlq` for
retry and dead-letter handling. Consumers should retry only transient failures
with bounded exponential backoff and a maximum attempt count. After that limit,
publish the original versioned envelope and failure metadata to the DLQ, retain
the source event ID for deduplication, and alert/inspect before replay. Do not
silently discard malformed or permanently failing events. Actual retry counts,
retention, and replay authorization must be set by the owning service ticket;
this local broker ticket does not create those consumer policies or topics.

## Stop and remove local data

```bash
pnpm redpanda:down
```

This stops the broker and preserves its volume. To deliberately remove only the
volume owned by this Compose project:

```bash
pnpm redpanda:reset
```

The reset command runs `docker compose down --volumes` against the dedicated
`infra/docker/docker-compose.redpanda.yml` project. It does not prune Docker
volumes or affect the shared integration stack.
