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
const migrationFiles = [
  resolve(repoRoot, "services/evidence/migrations/001_evidence_records.sql"),
  resolve(
    repoRoot,
    "services/evidence/migrations/002_evidence_record_lifecycle.sql",
  ),
];
const projectName = "cgn143-evidence-" + process.pid;
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
  "Evidence API repository enforces owner, idempotency, concurrency and archive audit in PostgreSQL",
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
      const migrations = migrationFiles
        .map((file) => readFileSync(file, "utf8"))
        .join("\n");
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
        migrations,
      );

      const repository = new EvidenceRepository(makePostgresExecutor());
      const owned = await repository.create({
        ownerId: "identity-subject-a",
        idempotencyKey: "manual-1",
        provenanceKind: "manual_claim",
        claimText: "Completed a private project",
      });
      const replay = await repository.create({
        ownerId: "identity-subject-a",
        idempotencyKey: "manual-1",
        provenanceKind: "manual_claim",
        claimText: "Completed a private project",
      });
      const other = await repository.create({
        ownerId: "identity-subject-b",
        idempotencyKey: "observed-1",
        provenanceKind: "observed_source",
        sourceReference: "github:repo/project/commit/abc123",
      });
      const attached = await repository.create({
        ownerId: "identity-subject-a",
        idempotencyKey: "manual-with-file-1",
        provenanceKind: "manual_claim",
        claimText: "Built a private project",
        objectKey: "quarantine/evidence-a",
        objectProof: {
          objectRevision: "etag:revision-1",
          checksumSha256: "a".repeat(64),
          contentType: "application/pdf",
          sizeBytes: 128,
          validatedAt: new Date().toISOString(),
        },
      });

      assert.equal(owned.visibility, "private");
      assert.equal(owned.verificationState, "unverified");
      assert.equal(replay.evidenceId, owned.evidenceId);
      assert.equal(attached.objectRevision, "etag:revision-1");
      assert.equal(attached.objectChecksumSha256, "a".repeat(64));
      await assert.rejects(
        repository.create({
          ownerId: "identity-subject-a",
          idempotencyKey: "manual-1",
          provenanceKind: "manual_claim",
          claimText: "Different payload",
        }),
        /idempotency key was already used/,
      );
      await assert.rejects(
        repository.create({
          ownerId: "identity-subject-a",
          idempotencyKey: "invalid-object",
          provenanceKind: "manual_claim",
          claimText: "No proof",
          objectKey: "quarantine/unvalidated",
        }),
        /server-side validation proof/,
      );

      assert.equal(
        (
          await repository.findOwnedActive(
            "identity-subject-a",
            owned.evidenceId,
          )
        )?.evidenceId,
        owned.evidenceId,
      );
      assert.equal(
        await repository.findOwnedActive(
          "identity-subject-b",
          owned.evidenceId,
        ),
        null,
      );
      assert.equal(
        (
          await repository.findOwnedActive(
            "identity-subject-b",
            other.evidenceId,
          )
        )?.evidenceId,
        other.evidenceId,
      );

      const updated = await repository.updateManualClaimOwnedActive({
        ownerId: "identity-subject-a",
        evidenceId: owned.evidenceId,
        expectedRevision: 1,
        claimText: "Updated project description",
      });
      assert.equal(updated?.revision, 2);
      assert.equal(updated?.provenanceKind, "manual_claim");
      assert.equal(updated?.claimText, "Updated project description");
      assert.equal(
        await repository.updateManualClaimOwnedActive({
          ownerId: "identity-subject-a",
          evidenceId: owned.evidenceId,
          expectedRevision: 1,
          claimText: "Stale edit",
        }),
        null,
      );
      assert.equal(
        await repository.updateManualClaimOwnedActive({
          ownerId: "identity-subject-b",
          evidenceId: owned.evidenceId,
          expectedRevision: 2,
          claimText: "Cross-owner edit",
        }),
        null,
      );

      const archived = await repository.archiveOwnedActive({
        ownerId: "identity-subject-a",
        evidenceId: owned.evidenceId,
        expectedRevision: 2,
      });
      assert.equal(archived?.revision, 3);
      assert.notEqual(archived?.archivedAt, null);
      assert.equal(
        await repository.findOwnedActive(
          "identity-subject-a",
          owned.evidenceId,
        ),
        null,
      );

      assert.deepEqual(
        psql(
          "SELECT action || ':' || revision FROM evidence_record_audit " +
            "WHERE evidence_id = '" +
            owned.evidenceId +
            "' ORDER BY audit_id",
        ).split(/\r?\n/),
        ["created:1", "updated:2", "archived:3"],
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
      assert.throws(() =>
        psql(
          "INSERT INTO evidence_records " +
            "(evidence_id, owner_id, provenance_kind, claim_text, object_key) " +
            "VALUES ('" +
            "28242969-a2de-47d5-89fc-307c0604cf52" +
            "', 'identity-subject-c', 'manual_claim', 'Claim', " +
            "'//bucket.example/object')",
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
