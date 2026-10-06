# Integration tests

CGN's integration gate starts the local dependency stack from
`infra/docker/docker-compose.test.yml` and proves that the shared runtime
dependencies are reachable before service-level integration tests execute.

Current foundation checks:

- PostgreSQL readiness
- Valkey PING
- Redpanda cluster health
- S3-compatible object-store health

Run the foundation smoke locally with:

```bash
node scripts/ci/integration-stack-smoke.mjs
```

As real services are implemented, each owning service adds its integration tests
against this stack. The gate must not be weakened simply because a service test
is failing.
