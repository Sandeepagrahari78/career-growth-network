import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { EvidenceRepository } from "../../dist/evidence-repository.js";

const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const composeFile = resolve(repoRoot, "infra/docker/docker-compose.test.yml");
const migrationFile = resolve(
  repoRoot,
  "services/evidence/migrations/001_evidence_records.sql",
);
const projectName = "cgn141-evidence-" + process.pid;
const compose = ["compose", "-p", projectName, "-f", composeFile];
const dockerAvailable =
  spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;

function runDocker(args, input) {
  return execFileSync("docker", args, {
    cwd: repoRoot,
    encoding: "utf8",
    input,
    stdio:
      input === undefined
        ? ["ignore", "pipe", "pipe"]
        : ["pipe", "pipe", "pipe"],
  });
}

function psql(statement) {
  return runDocker([
    ...compose,
    "exec",
    "-T",
    "postgres",
    "psql",
    "-X",
    "-q",
    "-A",
    "-t",
    "-v",
    "ON_ERROR_STOP=1",
    "-U",
    "cgn",
    "-d",
    "cgn_test",
    "-c",
    statement,
  ]).trim();
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return "'" + String(value).replaceAll("'", "''") + "'";
}

function bind(statement, values = []) {
  let result = statement;
  for (let index = values.length; index >= 1; index -= 1) {
    result = result.replaceAll(
      new RegExp("\\$" + index + "(?!\\d)", "g"),
      sqlLiteral(values[index - 1]),
    );
  }
  return result.replace(/;+\s*$/, "");
}

function makePostgresExecutor() {
  return {
    async query(statement, values = []) {
      const sql = bind(statement, values);
      const output = psql(
        "WITH query_result AS (" +
          sql +
          ") SELECT COALESCE(json_agg(query_result), '[]'::json)::text FROM query_result",
      );
      return { rows: JSON.parse(output || "[]") };
    },
  };
}

test(
  "Evidence schema and repository enforce private owner-scoped records in PostgreSQL",
  { skip: !dockerAvailable && "Docker daemon is unavailable" },
  async (t) => {
    try {
      runDocker([...compose, "up", "-d", "postgres"]);
      let ready = false;
      for (let attempt = 0; attempt < 45; attempt += 1) {
        try {
          runDocker([
            ...compose,
            "exec",
            "-T",
            "postgres",
            "pg_isready",
            "-U",
            "cgn",
            "-d",
            "cgn_test",
          ]);
          ready = true;
          break;
        } catch {
          await delay(1_000);
        }
      }
      assert.ok(ready, "PostgreSQL became ready");
      runDocker(
        [
          ...compose,
          "exec",
          "-T",
          "postgres",
          "psql",
          "-X",
          "-v",
          "ON_ERROR_STOP=1",
          "-U",
          "cgn",
          "-d",
          "cgn_test",
          "-f",
          "-",
        ],
        readFileSync(migrationFile, "utf8"),
      );

      const repository = new EvidenceRepository(makePostgresExecutor());
      const owned = await repository.create({
        ownerId: "identity-subject-a",
        provenanceKind: "manual_claim",
        claimText: "Completed a private project",
        objectKey: "objects/evidence-a",
      });
      const other = await repository.create({
        ownerId: "identity-subject-b",
        provenanceKind: "observed_source",
        sourceReference: "github:repo/project/commit/abc123",
        objectKey: "objects/evidence-b",
      });

      assert.equal(owned.visibility, "private");
      assert.equal(owned.verificationState, "unverified");
      assert.equal(
        (await repository.findOwnedActive("identity-subject-a", owned.evidenceId))
          ?.evidenceId,
        owned.evidenceId,
      );
      assert.equal(
        await repository.findOwnedActive("identity-subject-b", owned.evidenceId),
        null,
      );
      assert.equal(
        (await repository.findOwnedActive("identity-subject-b", other.evidenceId))
          ?.evidenceId,
        other.evidenceId,
      );

      assert.equal(
        await repository.archiveOwnedActive("identity-subject-a", owned.evidenceId),
        true,
      );
      assert.equal(
        await repository.findOwnedActive("identity-subject-a", owned.evidenceId),
        null,
      );
      assert.equal(
        await repository.archiveOwnedActive("identity-subject-b", other.evidenceId),
        true,
      );
      assert.equal(
        await repository.findOwnedActive("identity-subject-b", other.evidenceId),
        null,
      );

      assert.throws(() =>
        psql(
          "INSERT INTO evidence_records " +
            "(evidence_id, owner_id, provenance_kind, claim_text, object_key) " +
            "VALUES ('" +
            "fa95f76e-93e0-4df4-a2ea-3a855bc3482e" +
            "', 'identity-subject-c', 'manual_claim', 'Claim', " +
            "'https://bucket.example/object?token=secret')",
        ),
      );
      assert.throws(() =>
        psql(
          "INSERT INTO evidence_records " +
            "(evidence_id, owner_id, provenance_kind, claim_text, visibility) " +
            "VALUES ('" +
            "6d46787e-0c91-4eb7-88bd-6441c58dd1af" +
            "', 'identity-subject-c', 'manual_claim', 'Claim', 'public')",
        ),
      );
    } finally {
      try {
        runDocker([...compose, "down", "--volumes", "--remove-orphans"]);
      } catch (error) {
        t.diagnostic("PostgreSQL cleanup failed: " + error.message);
      }
    }
  },
);
