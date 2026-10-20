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

function migrate(direction, migration = "001_identity_accounts") {
  execFileSync(
    process.execPath,
    [
      "scripts/infra/postgres-local.mjs",
      "migrate",
      "identity",
      `services/identity/migrations/${migration}.${direction}.sql`,
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

let accountsMigrationApplied = false;
let sessionsMigrationApplied = false;
try {
  migrate("up");
  accountsMigrationApplied = true;
  migrate("up", "002_identity_auth_sessions");
  sessionsMigrationApplied = true;

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

  const authTablesOwner = runSql(
    `SELECT bool_and(pg_get_userbyid(relowner) = 'cgn_identity_owner')
     FROM pg_class
     WHERE oid IN ('identity.oidc_login_transactions'::regclass,
                   'identity.auth_sessions'::regclass);`,
  );
  assert.equal(authTablesOwner, "t");

  const unauthorizedTableAccess = runSql(
    "SELECT has_table_privilege('cgn_career_owner', 'identity.accounts', 'SELECT');",
  );
  assert.equal(unauthorizedTableAccess, "f");

  assert.equal(
    runSql(
      `SELECT has_table_privilege('cgn_career_owner', 'identity.oidc_login_transactions', 'SELECT')
          OR has_table_privilege('cgn_career_owner', 'identity.auth_sessions', 'SELECT');`,
    ),
    "f",
  );

  runSql(
    owner +
      `INSERT INTO identity.auth_sessions
        (session_id_hash, account_id, id_token_ciphertext, authenticated_at, expires_at)
       VALUES (repeat('a', 64), '10000000-0000-4000-8000-000000000001',
         'v1.test-ciphertext', '2026-10-20T10:00:00Z', '2026-10-20T18:00:00Z');` +
      reset,
  );

  runSqlExpectingFailure(
    owner +
      `INSERT INTO identity.auth_sessions
        (session_id_hash, account_id, id_token_ciphertext, authenticated_at, expires_at)
       VALUES (repeat('b', 64), '10000000-0000-4000-8000-000000000099',
         'v1.test-ciphertext', '2026-10-20T10:00:00Z', '2026-10-20T18:00:00Z');` +
      reset,
    /violates foreign key constraint/i,
    "An auth session without an Identity account unexpectedly succeeded.",
  );

  runSqlExpectingFailure(
    owner +
      `INSERT INTO identity.auth_sessions
        (session_id_hash, account_id, id_token_ciphertext, authenticated_at, expires_at)
       VALUES (repeat('c', 64), '10000000-0000-4000-8000-000000000001',
         'v1.test-ciphertext', '2026-10-20T10:00:00Z', '2026-10-20T09:00:00Z');` +
      reset,
    /violates check constraint/i,
    "An auth session expiring before authentication unexpectedly succeeded.",
  );

  runSqlExpectingFailure(
    owner +
      `INSERT INTO identity.oidc_login_transactions
        (state_hash, browser_binding_hash, nonce_ciphertext,
         code_verifier_ciphertext, login_method, expires_at)
       VALUES ('invalid-digest', repeat('d', 64), 'v1.ciphertext',
         'v1.ciphertext', 'email_password', '2026-10-20T10:10:00Z');` +
      reset,
    /violates check constraint/i,
    "A malformed OIDC state digest unexpectedly succeeded.",
  );

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

  migrate("down", "002_identity_auth_sessions");
  sessionsMigrationApplied = false;
  assert.equal(
    runSql(
      "SELECT to_regclass('identity.auth_sessions') IS NULL AND to_regclass('identity.oidc_login_transactions') IS NULL;",
    ),
    "t",
  );
  migrate("down");
  accountsMigrationApplied = false;
  assert.equal(runSql("SELECT to_regnamespace('identity') IS NULL;"), "t");
  console.log(
    "Identity PostgreSQL acceptance passed: account and auth-session ownership, cross-service access, provider mapping, session FK/expiry constraints and migration rollback.",
  );
} finally {
  if (sessionsMigrationApplied) {
    try {
      migrate("down", "002_identity_auth_sessions");
    } catch {
      // Preserve the original acceptance failure; CI tears down the database.
    }
  }
  if (accountsMigrationApplied) {
    try {
      migrate("down");
    } catch {
      // Preserve the original acceptance failure; CI tears down the database.
    }
  }
}
