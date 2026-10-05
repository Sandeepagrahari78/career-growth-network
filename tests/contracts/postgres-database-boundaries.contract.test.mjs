import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getServiceConfig,
  loadDatabaseConfig,
  validateDatabaseConfig,
} from "../../scripts/infra/postgres-local.mjs";

const config = loadDatabaseConfig();
const compose = readFileSync(
  "infra/docker/docker-compose.postgres.yml",
  "utf8",
);
const initSql = readFileSync(
  "infra/postgres/init/001-service-databases.sql",
  "utf8",
);

const expectedServices = [
  "career",
  "community",
  "evidence",
  "feed",
  "growth",
  "identity",
  "messaging",
  "network",
  "roadmap",
];

test("PostgreSQL database ownership contract is internally consistent", () => {
  assert.equal(validateDatabaseConfig(config), true);
  assert.deepEqual(
    config.services.map((service) => service.service).sort(),
    expectedServices,
  );
});

test("Compose keeps PostgreSQL loopback-only and secret-free", () => {
  assert.match(compose, /postgres:16-alpine/);
  assert.match(compose, /127\.0\.0\.1:\$\{CGN_POSTGRES_PORT:-5432\}:5432/);
  assert.match(compose, /POSTGRES_PASSWORD: \$\{CGN_POSTGRES_PASSWORD:-\}/);
  assert.doesNotMatch(compose, /0\.0\.0\.0/);
});

test("Every service database is owned by a distinct NOLOGIN role", () => {
  for (const service of config.services) {
    assert.match(
      initSql,
      new RegExp(`CREATE ROLE ${service.ownerRole} NOLOGIN;`),
    );
    assert.match(
      initSql,
      new RegExp(
        `CREATE DATABASE ${service.database} OWNER ${service.ownerRole};`,
      ),
    );
    assert.match(
      initSql,
      new RegExp(
        `REVOKE CONNECT, TEMPORARY ON DATABASE ${service.database} FROM PUBLIC;`,
      ),
    );
  }
});

test("migration routing rejects unknown service ownership", () => {
  assert.throws(
    () => getServiceConfig("unknown-service"),
    /Unknown CGN database service/,
  );
});
