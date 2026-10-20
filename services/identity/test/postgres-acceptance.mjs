import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const composePrefix = [
  "compose",
  "-f",
  "infra/docker/docker-compose.postgres.yml",
  "exec",
  "-T",
  "postgres",
  "psql",
  "-X",
  "-v",
  "ON_ERROR_STOP=1",
  "-U",
  "cgn_admin",
  "-d",
  "cgn_identity",
  "-Atq",
];
const owner = 'SET ROLE "cgn_identity_owner";\n';
const reset = "\nRESET ROLE;\n";

function migrate(direction) {
  execFileSync(
    process.execPath,
    [
      "scripts/infra/postgres-local.mjs",
      "migrate",
      "identity",
      `services/identity/migrations/001_identity_accounts.${direction}.sql`,
    ],
    { cwd: repoRoot, stdio: "inherit" },
  );
}

function runSql(sql) {
  return execFileSync("docker", composePrefix, {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
    input: sql,
  }).trim();
}

function runSqlExpectingFailure(sql, expectedError, message) {
  const result = spawnSync("docker", composePrefix, {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
    input: sql,
  });
  assert.ifError(result.error);
  assert.notEqual(result.status, 0, message);
  assert.match(result.stderr, expectedError, message);
}

let migrationApplied = false;
try {
  migrate("up");
  migrationApplied = true;

  runSql(
    owner +
      `INSERT INTO identity.accounts (id) VALUES
        ('10000000-0000-4000-8000-000000000001'),
        ('10000000-0000-4000-8000-000000000002');
       INSERT INTO identity.provider_subjects (issuer, subject, account_id)
       VALUES ('https://issuer.example.test', 'opaque-subject',
         '10000000-0000-4000-8000-000000000001');` +
      reset,
  );

  const accountOwner = runSql(
    "SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid = 'identity.accounts'::regclass;",
  );
  assert.equal(accountOwner, "cgn_identity_owner");

  const unauthorizedTableAccess = runSql(
    "SELECT has_table_privilege('cgn_career_owner', 'identity.accounts', 'SELECT');",
  );
  assert.equal(unauthorizedTableAccess, "f");

  runSqlExpectingFailure(
    owner +
      `INSERT INTO identity.provider_subjects (issuer, subject, account_id)
       VALUES ('https://issuer.example.test', 'opaque-subject',
         '10000000-0000-4000-8000-000000000002');` +
      reset,
    /duplicate key value violates unique constraint/i,
    "A duplicate issuer and subject pair unexpectedly succeeded.",
  );

  runSqlExpectingFailure(
    owner +
      `INSERT INTO identity.provider_subjects (issuer, subject, account_id)
       VALUES ('https://issuer.example.test', 'orphan',
         '10000000-0000-4000-8000-000000000099');` +
      reset,
    /violates foreign key constraint/i,
    "A provider mapping without an Identity account unexpectedly succeeded.",
  );

  migrate("down");
  migrationApplied = false;
  assert.equal(runSql("SELECT to_regnamespace('identity') IS NULL;"), "t");
  console.log(
    "Identity PostgreSQL acceptance passed: owner boundary, unique provider subject, FK and migration rollback.",
  );
} finally {
  if (migrationApplied) {
    try {
      migrate("down");
    } catch {
      // Preserve the original acceptance failure; CI tears down the database.
    }
  }
}
