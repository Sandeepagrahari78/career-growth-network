# Integration tests

Integration suites run against ephemeral dependencies from `infra/docker/docker-compose.test.yml`.

Initial dependency targets:

- PostgreSQL
- Valkey
- Redpanda
- S3-compatible object storage

Mocks should be reserved for third-party boundaries that cannot be started reliably in CI.
