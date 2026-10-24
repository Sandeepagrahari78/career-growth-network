import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = JSON.parse(
  readFileSync(
    "packages/contracts/schemas/identity-organization-authorization-context.v1.schema.json",
    "utf8",
  ),
);
const contract = readFileSync(
  "packages/contracts/src/identity/identity-organization-authorization-context.v1.ts",
  "utf8",
);
const runtimeContract = readFileSync(
  "services/identity/src/identity-auth-contract.mjs",
  "utf8",
);
const authService = readFileSync(
  "services/identity/src/oidc-auth-service.mjs",
  "utf8",
);
const authServer = readFileSync(
  "services/identity/src/http-auth-server.mjs",
  "utf8",
);
const migration = readFileSync(
  "services/identity/migrations/004_identity_organization_memberships.up.sql",
  "utf8",
);
const rollback = readFileSync(
  "services/identity/migrations/004_identity_organization_memberships.down.sql",
  "utf8",
);
const registry = readFileSync(
  "docs/engineering-memory/03-contract-registry.md",
  "utf8",
);

test("organization authorization context is versioned, closed and recruiter-only", () => {
  assert.equal(
    schema.properties.contract.const,
    "cgn.identity.organization-authorization-context.v1",
  );
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, [
    "contract",
    "accountId",
    "organizationId",
    "evaluatedAt",
    "membershipStatus",
    "roles",
  ]);
  assert.deepEqual(schema.properties.membershipStatus.enum, [
    "none",
    "pending",
    "approved",
    "revoked",
  ]);
  assert.deepEqual(schema.properties.roles.items, { const: "recruiter" });
  assert.match(contract, /IDENTITY_ORGANIZATION_AUTHORIZATION_CONTEXT_API_V1/);
  assert.match(
    runtimeContract,
    /cgn\.identity\.organization-authorization-context\.v1/,
  );
  assert.match(
    runtimeContract,
    /\/v1\/identity\/auth\/organization-authorization-context/,
  );
});

test("Identity derives organization claims from session, membership and app role", () => {
  assert.match(
    authServer,
    /getOrganizationAuthorizationContext\(\s*cookies\.get\(names\.session\),\s*organizationIds\[0\]/,
  );
  assert.match(
    authService,
    /organizationMembershipRepository\.findMembershipStatus/,
  );
  assert.match(authService, /roleRepository\.listRoleAssignments/);
  assert.doesNotMatch(authServer, /searchParams\.get\(["']role["']\)/);
  assert.match(schema.description, /must not be accepted from a client/);
  assert.match(schema.description, /membership is approved/);
});

test("membership state and audit remain Identity-owned and rollbackable", () => {
  assert.match(migration, /CREATE TABLE identity\.organization_memberships/);
  assert.match(
    migration,
    /CREATE TABLE identity\.organization_membership_changes/,
  );
  assert.match(migration, /status IN \('pending', 'approved', 'revoked'\)/);
  assert.match(
    migration,
    /REVOKE ALL ON TABLE identity\.organization_memberships FROM PUBLIC/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON TABLE identity\.organization_membership_changes FROM PUBLIC/,
  );
  assert.doesNotMatch(migration, /REFERENCES\s+(?!identity\.)/);
  assert.match(
    rollback,
    /DROP TABLE IF EXISTS identity\.organization_membership_changes/,
  );
  assert.match(
    rollback,
    /DROP TABLE IF EXISTS identity\.organization_memberships/,
  );
  assert.match(
    registry,
    /cgn\.identity\.organization-authorization-context\.v1/,
  );
});
