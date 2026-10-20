import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const accountSchema = JSON.parse(
  readFileSync(
    "packages/contracts/schemas/identity-account.v1.schema.json",
    "utf8",
  ),
);
const providerSchema = JSON.parse(
  readFileSync(
    "packages/contracts/schemas/identity-provider-subject.v1.schema.json",
    "utf8",
  ),
);
const contractTypes = readFileSync(
  "packages/contracts/src/identity/identity-account.v1.ts",
  "utf8",
);
const repository = readFileSync(
  "services/identity/src/account-repository.mjs",
  "utf8",
);
const migration = readFileSync(
  "services/identity/migrations/001_identity_accounts.up.sql",
  "utf8",
);
const rollbackMigration = readFileSync(
  "services/identity/migrations/001_identity_accounts.down.sql",
  "utf8",
);
const changeDetector = readFileSync("scripts/ci/detect-changes.mjs", "utf8");
const prWorkflow = readFileSync(".github/workflows/pr-ci.yml", "utf8");

test("Identity v1 schemas have distinct versioned account and provider mapping shapes", () => {
  assert.equal(
    accountSchema.properties.contract.const,
    "cgn.identity.account.v1",
  );
  assert.deepEqual(accountSchema.required, [
    "contract",
    "accountId",
    "createdAt",
  ]);
  assert.equal(accountSchema.additionalProperties, false);
  assert.equal(
    providerSchema.properties.contract.const,
    "cgn.identity.provider-subject.v1",
  );
  assert.deepEqual(providerSchema.required, [
    "contract",
    "issuer",
    "subject",
    "accountId",
    "linkedAt",
  ]);
  assert.equal(providerSchema.additionalProperties, false);
  assert.match(contractTypes, /IdentityAccountV1/);
  assert.match(contractTypes, /IdentityProviderSubjectV1/);
});

test("Identity persistence does not duplicate provider credentials or Career state", () => {
  assert.match(repository, /randomUUID\(\)/);
  assert.match(repository, /VALUES \(\$1, \$2, \$3\)/);
  assert.match(repository, /WHERE p\.issuer = \$1 AND p\.subject = \$2/);
  assert.doesNotMatch(
    migration,
    /password|access_token|refresh_token|email|goal|career_stage/i,
  );
  assert.doesNotMatch(
    repository,
    /password|access_token|refresh_token|email|goal|career_stage/i,
  );
  assert.match(migration, /PRIMARY KEY \(issuer, subject\)/);
  assert.match(
    migration,
    /REFERENCES identity\.accounts \(id\) ON DELETE CASCADE/,
  );
  assert.match(migration, /^BEGIN;/);
  assert.match(migration, /COMMIT;\s*$/);
  assert.match(rollbackMigration, /DROP SCHEMA IF EXISTS identity CASCADE/);
});

test("Identity migrations select the PostgreSQL CI acceptance gate", () => {
  assert.match(changeDetector, /services\/identity\/migrations\//);
  assert.match(
    changeDetector,
    /services\/identity\/test\/postgres-acceptance\.mjs/,
  );
  assert.match(
    prWorkflow,
    /Verify Identity schema, uniqueness, access boundary and rollback[\s\S]*?node services\/identity\/test\/postgres-acceptance\.mjs/,
  );
});
