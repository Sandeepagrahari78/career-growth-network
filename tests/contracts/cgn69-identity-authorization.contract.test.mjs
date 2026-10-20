import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = JSON.parse(
  readFileSync(
    "packages/contracts/schemas/identity-authorization-context.v1.schema.json",
    "utf8",
  ),
);
const contract = readFileSync(
  "packages/contracts/src/identity/identity-authorization-context.v1.ts",
  "utf8",
);
const authContract = readFileSync(
  "services/identity/src/identity-auth-contract.mjs",
  "utf8",
);
const authServer = readFileSync(
  "services/identity/src/http-auth-server.mjs",
  "utf8",
);
const authService = readFileSync(
  "services/identity/src/oidc-auth-service.mjs",
  "utf8",
);
const migration = readFileSync(
  "services/identity/migrations/003_identity_account_roles.up.sql",
  "utf8",
);
const rollback = readFileSync(
  "services/identity/migrations/003_identity_account_roles.down.sql",
  "utf8",
);

test("authorization context contract is versioned and allow-lists four app roles", () => {
  assert.equal(
    schema.properties.contract.const,
    "cgn.identity.authorization-context.v1",
  );
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.roles.items.enum, [
    "student",
    "expert",
    "recruiter",
    "admin",
  ]);
  assert.match(contract, /IDENTITY_AUTHORIZATION_CONTEXT_API_V1/);
  assert.match(authContract, /cgn\.identity\.authorization-context\.v1/);
});

test("authorization context route reads server session and never accepts role claims", () => {
  assert.match(
    authServer,
    /getAuthorizationContext\(\s*cookies\.get\(names\.session\),?\s*\)/,
  );
  assert.match(authServer, /IDENTITY_AUTHORIZATION_CONTEXT_API_V1/);
  assert.doesNotMatch(authServer, /searchParams\.get\(["']role["']\)/);
  assert.match(authService, /this\.roleRepository\.listRoleAssignments/);
  assert.doesNotMatch(authService, /claims\.roles|claims\.role\b/);
});

test("Identity role state is constrained, audited and rollbackable", () => {
  assert.match(migration, /CREATE TABLE identity\.account_roles/);
  assert.match(migration, /CREATE TABLE identity\.account_role_changes/);
  assert.match(
    migration,
    /role_key IN \('student', 'expert', 'recruiter', 'admin'\)/,
  );
  assert.match(migration, /status IN \('active', 'inactive'\)/);
  assert.match(
    migration,
    /REVOKE ALL ON TABLE identity\.account_roles FROM PUBLIC/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON TABLE identity\.account_role_changes FROM PUBLIC/,
  );
  assert.match(rollback, /DROP TABLE IF EXISTS identity\.account_role_changes/);
  assert.match(rollback, /DROP TABLE IF EXISTS identity\.account_roles/);
});
