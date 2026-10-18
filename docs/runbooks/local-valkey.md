# Local Valkey cache

CGN's local Redis-compatible cache uses the pinned Valkey image
`valkey/valkey:9.1.2`. Docker Compose exposes port `16379` on loopback only and
stores data in the project-scoped `cgn-valkey-data` volume. Append-only
persistence is enabled for local restart/recovery checks; this cache is
disposable and must not become canonical product or identity persistence.

## Start and verify

Run these commands from the repository root with Docker running:

```bash
pnpm valkey:up
pnpm valkey:verify
pnpm valkey:restart-smoke
```

The restart smoke checks authentication configuration, a short-lived key's TTL
expiry, and recovery of a durable smoke key after restarting the Valkey
container. Application clients can connect to `127.0.0.1:16379` using a
Redis-protocol client; keep host and port configuration separate from the
provider choice in application configuration.

## Optional password

Set `CGN_VALKEY_PASSWORD` in the shell before running Compose commands to enable
authentication. Compose passes it to the container as an environment value;
`valkey-cli` uses `REDISCLI_AUTH` instead of a client-side password argument.
The server receives its configured password at startup, so Docker/container
administrators can inspect it. Use only a local, non-production credential.
Do not commit local environment files or put credentials in logs, fixtures or
this runbook. With no password configured, the service still binds only to
loopback.

## Stop and remove local data

```bash
pnpm valkey:down
```

This stops Valkey and preserves its volume. To deliberately remove only the
volume owned by this Compose project:

```bash
pnpm valkey:reset
```

Reset targets `infra/docker/docker-compose.valkey.yml`; it does not prune or
remove unrelated Docker volumes.
