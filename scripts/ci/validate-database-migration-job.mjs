import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const contract = JSON.parse(
  readFileSync("config/deployment/database-migration-job.v1.json", "utf8"),
);
const databases = JSON.parse(
  readFileSync(contract.databaseContract, "utf8"),
);
const postgresRunner = readFileSync(
  "scripts/infra/postgres-local.mjs",
  "utf8",
);
const migrationRunner = readFileSync(contract.runner, "utf8");
const releaseWorkflow = readFileSync(contract.deploymentWorkflow, "utf8");
const validationWorkflow = readFileSync(contract.validationWorkflow, "utf8");

assert.equal(contract.schema, "cgn.database-migration-job.v1");
assert.equal(contract.ticket, "CGN-94");
assert.equal(existsSync(contract.databaseContract), true);
assert.equal(existsSync(contract.runner), true);
assert.equal(existsSync(contract.deploymentWorkflow), true);
assert.equal(existsSync(contract.validationWorkflow), true);
assert.equal(existsSync(contract.smoke.sqlFile), true);

const smokeService = databases.services.find(
  (entry) => entry.service === contract.smoke.service,
);
assert.ok(smokeService, "Smoke migration service must exist in DB contract");

assert.equal(contract.execution.oneServicePerJob, true);
assert.equal(contract.execution.ownerRoleOnly, true);
assert.equal(contract.execution.onErrorStop, true);
assert.equal(contract.execution.automaticRetry, false);
assert.equal(contract.execution.preMigrationBackupRequired, true);
assert.equal(contract.execution.backupRestoreProofRequired, true);
assert.equal(contract.execution.evidenceRequired, true);

assert.match(postgresRunner, /SET ROLE/);
assert.match(postgresRunner, /ON_ERROR_STOP=1/);
assert.match(postgresRunner, /Migration SQL path must stay inside the repository/);
assert.match(migrationRunner, /cgn\.database\.migration\.started/);
assert.match(migrationRunner, /cgn\.database\.migration\.completed/);
assert.match(migrationRunner, /secretValuesIncluded:\s*false/);
assert.match(migrationRunner, /realProductionDatabaseChanged:\s*false/);

assert.match(releaseWorkflow, /^  migration-job:/m);
assert.match(releaseWorkflow, /needs:\s*authorize/);
assert.match(releaseWorkflow, /Pre-migration backup/);
assert.match(releaseWorkflow, /run-database-migration-job\.mjs/);
assert.match(releaseWorkflow, /backup-restore-smoke/);
assert.match(releaseWorkflow, /needs:\s*\[authorize, migration-job\]/);
assert.match(validationWorkflow, /Database migration job validation/);
assert.match(validationWorkflow, /run-database-migration-job\.mjs/);

assert.equal(contract.safety.noCrossServiceDatabaseAccess, true);
assert.equal(contract.safety.noCommittedCredential, true);
assert.equal(contract.safety.noRawBackupArtifactUpload, true);
assert.equal(contract.safety.noDirectProductionDatabaseEdit, true);
assert.equal(contract.safety.noAutomaticProductionDeployment, true);
assert.equal(contract.observability.structuredLogs, true);
assert.equal(contract.observability.secretValuesInEvidence, false);

console.log("CGN-94 database migration job contract is valid.");
