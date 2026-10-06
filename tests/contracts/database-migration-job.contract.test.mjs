import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = JSON.parse(
  readFileSync("config/deployment/database-migration-job.v1.json", "utf8"),
);

test("CGN-94 migration job contract preserves database boundaries", () => {
  assert.equal(contract.execution.oneServicePerJob, true);
  assert.equal(contract.execution.ownerRoleOnly, true);
  assert.equal(contract.execution.automaticRetry, false);
  assert.equal(contract.safety.noCrossServiceDatabaseAccess, true);
  assert.equal(contract.safety.noCommittedCredential, true);
  assert.equal(contract.safety.noRawBackupArtifactUpload, true);
  assert.equal(contract.safety.noDirectProductionDatabaseEdit, true);
});

test("static database migration job validator passes", () => {
  const output = execFileSync(
    "node",
    ["scripts/ci/validate-database-migration-job.mjs"],
    {
      encoding: "utf8",
    },
  );

  assert.match(output, /CGN-94 database migration job contract is valid/);
});

test("migration job rejects an invalid release SHA before touching a database", () => {
  assert.throws(() =>
    execFileSync(
      "node",
      [
        "scripts/infra/run-database-migration-job.mjs",
        "--service",
        "identity",
        "--sql-file",
        "tests/fixtures/postgres/migration-smoke.sql",
        "--release-sha",
        "not-a-sha",
      ],
      { stdio: "pipe" },
    ),
  );
});
