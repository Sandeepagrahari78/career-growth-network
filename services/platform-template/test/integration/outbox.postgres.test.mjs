import assert from "node:assert/strict";
import { execFile, execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { TransactionalOutbox } from "../../dist/outbox/outbox.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const composeFile = resolve(repoRoot, "infra/docker/docker-compose.test.yml");
const migrationFile = resolve(
  repoRoot,
  "services/platform-template/migrations/001_transactional_outbox.sql",
);
const projectName = `cgn37-outbox-${process.pid}`;
const compose = ["compose", "-p", projectName, "-f", composeFile];
const dockerAvailable = spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;
const execFileAsync = promisify(execFile);

function runDocker(args, input) {
  return execFileSync("docker", args, {
    cwd: repoRoot,
    encoding: "utf8",
    input,
    stdio: input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
  });
}

function psql(sql) {
  return runDocker(
    [
      ...compose,
      "exec",
      "-T",
      "postgres",
      "psql",
      "-X",
      "-A",
      "-t",
      "-F",
      "\t",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "cgn",
      "-d",
      "cgn_test",
      "-c",
      sql,
    ],
  ).trim();
}

async function psqlAsync(sql) {
  const { stdout } = await execFileAsync(
    "docker",
    [
      ...compose,
      "exec",
      "-T",
      "postgres",
      "psql",
      "-X",
      "-A",
      "-t",
      "-F",
      "\t",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "cgn",
      "-d",
      "cgn_test",
      "-c",
      sql,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  return stdout.trim();
}

function literal(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `'${text.replaceAll("'", "''")}'${typeof value === "object" ? "::jsonb" : ""}`;
}

function bind(sql, values = []) {
  let result = sql;
  for (let index = values.length; index >= 1; index -= 1) {
    result = result.replaceAll(new RegExp(`\\$${index}(?!\\d)`, "g"), literal(values[index - 1]));
  }
  return result;
}

function makePostgresRunner() {
  return {
    async transaction(work) {
      const client = {
        async query(sql, values = []) {
          const statement = bind(sql, values);
          if (!/\bRETURNING\b/i.test(statement)) {
            psql(statement);
            return { rows: [] };
          }
          const output = await psqlAsync(statement);
          const rows = output
            .split(/\r?\n/)
            .filter(Boolean)
            .map((row) => {
              const [first, second] = row.split("\t");
              if (/RETURNING\s+outbox\.envelope/i.test(statement)) {
                return { envelope: JSON.parse(first), attempt_count: Number(second) };
              }
              return { event_id: first };
            });
          return { rows };
        },
      };
      return work(client);
    },
  };
}

function makeOwningTransaction() {
  const statements = [];
  const client = {
    async query(sql, values = []) {
      statements.push(bind(sql, values));
      return { rows: [] };
    },
  };
  return {
    client,
    async commit() {
      if (statements.length) psql(`BEGIN; ${statements.join("; ")}; COMMIT;`);
    },
    async rollback() {
      if (statements.length) psql(`BEGIN; ${statements.join("; ")}; ROLLBACK;`);
    },
  };
}

const event = (eventId) => ({
  eventId,
  eventType: "career.activity.recorded",
  eventVersion: 1,
  occurredAt: "2026-10-18T10:00:00.000Z",
  producer: "platform-template-test",
  payload: { activityId: `activity-${eventId}` },
});

test(
  "PostgreSQL outbox is atomic, supports two workers, and redelivers the same ID after worker restart",
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
      psql("CREATE TABLE domain_rows (id text PRIMARY KEY)");

      const outbox = new TransactionalOutbox(makePostgresRunner());

      await t.test("domain write and outbox insert commit or roll back together", async () => {
        const committed = makeOwningTransaction();
        await committed.client.query("INSERT INTO domain_rows (id) VALUES ($1)", ["commit-1"]);
        await outbox.enqueue(committed.client, event("commit-event-1"));
        await committed.commit();

        const rolledBack = makeOwningTransaction();
        await rolledBack.client.query("INSERT INTO domain_rows (id) VALUES ($1)", ["rollback-1"]);
        await outbox.enqueue(rolledBack.client, event("rollback-event-1"));
        await rolledBack.rollback();

        assert.equal(psql("SELECT count(*) FROM domain_rows WHERE id IN ('commit-1', 'rollback-1')"), "1");
        assert.equal(psql("SELECT count(*) FROM cgn_outbox_events WHERE event_id IN ('commit-event-1', 'rollback-event-1')"), "1");
      });

      await t.test("two independent workers claim disjoint bounded batches", async () => {
        for (let index = 0; index < 8; index += 1) {
          const transaction = makeOwningTransaction();
          await outbox.enqueue(transaction.client, event(`worker-event-${index}`));
          await transaction.commit();
        }

        const [workerA, workerB] = await Promise.all([
          outbox.claimBatch(4, 5_000),
          new TransactionalOutbox(makePostgresRunner()).claimBatch(4, 5_000),
        ]);
        const idsA = workerA.map(({ event: row }) => row.eventId);
        const idsB = workerB.map(({ event: row }) => row.eventId);

        assert.equal(idsA.length, 4);
        assert.equal(idsB.length, 4);
        assert.equal(new Set([...idsA, ...idsB]).size, 8);
        assert.equal(idsA.filter((id) => idsB.includes(id)).length, 0);
      });

      await t.test("a new worker redelivers the same event after publish-before-ack crash", async () => {
        psql("TRUNCATE cgn_outbox_events");
        const transaction = makeOwningTransaction();
        await outbox.enqueue(transaction.client, event("crash-event-1"));
        await transaction.commit();

        const firstWorker = await outbox.claimBatch(1, 1_000);
        const publishedBeforeCrash = firstWorker.find(({ event: row }) => row.eventId === "crash-event-1");
        assert.ok(publishedBeforeCrash);
        const publishedIds = [publishedBeforeCrash.event.eventId];
        // Simulate process death after the broker accepted the event but before markPublished.
        await delay(1_100);

        const restartedWorker = new TransactionalOutbox(makePostgresRunner());
        const redelivered = await restartedWorker.claimBatch(1, 1_000);
        const sameEvent = redelivered.find(({ event: row }) => row.eventId === "crash-event-1");
        assert.ok(sameEvent);
        publishedIds.push(sameEvent.event.eventId);
        assert.deepEqual(publishedIds, ["crash-event-1", "crash-event-1"]);
        await restartedWorker.markPublished(sameEvent.event.eventId);
        assert.equal((await restartedWorker.claimBatch(100, 1_000)).length, 0);
      });
    } finally {
      try {
        runDocker([...compose, "down", "-v", "--remove-orphans"]);
      } catch {
        // The project name scopes cleanup to this test's container and volume.
      }
    }
  },
);
