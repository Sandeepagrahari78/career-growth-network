import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getServiceConfig, migrate } from "./postgres-local.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);

function argument(flag, fallback = null) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return fallback;
  }
  return args[index + 1] ?? fallback;
}

const serviceName = argument("--service");
const sqlFile = argument("--sql-file");
const releaseSha = argument("--release-sha");
const evidenceFile = argument(
  "--evidence",
  ".local/migrations/database-migration-evidence.json",
);

assert.ok(serviceName, "--service is required");
assert.ok(sqlFile, "--sql-file is required");
assert.match(
  releaseSha ?? "",
  /^[0-9a-f]{40}$/,
  "--release-sha must be an exact lowercase 40-character Git SHA",
);

const service = getServiceConfig(serviceName);

console.log(
  JSON.stringify({
    event: "cgn.database.migration.started",
    service: service.service,
    database: service.database,
    releaseSha,
  }),
);

migrate(service.service, sqlFile);

const evidencePath = resolve(repoRoot, evidenceFile);
mkdirSync(dirname(evidencePath), { recursive: true });

const evidence = {
  schema: "cgn.database-migration-evidence.v1",
  ticket: "CGN-94",
  releaseSha,
  service: service.service,
  database: service.database,
  ownerRole: service.ownerRole,
  sqlFile,
  status: "passed",
  automaticRetry: false,
  crossServiceDatabaseAccess: false,
  secretValuesIncluded: false,
  realProductionDatabaseChanged: false,
};

writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

console.log(
  JSON.stringify({
    event: "cgn.database.migration.completed",
    service: service.service,
    database: service.database,
    releaseSha,
    evidence: evidenceFile,
  }),
);
