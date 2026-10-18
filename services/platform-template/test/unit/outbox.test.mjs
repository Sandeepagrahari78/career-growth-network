import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTBOX_MAX_BATCH_SIZE,
  OUTBOX_MAX_ATTEMPTS,
  TransactionalOutbox,
} from "../../dist/outbox/outbox.js";

const event = {
  eventId: "c5c9b49f-7688-441f-8a6f-e45f7666df73",
  eventType: "career.activity.recorded",
  eventVersion: 1,
  occurredAt: "2026-10-18T10:00:00.000Z",
  producer: "career-service",
  payload: { activityId: "activity-1" },
};

function makeRunner(query) {
  return {
    calls: [],
    async transaction(work) {
      return work({
        async query(sql, values = []) {
          return query(sql, values);
        },
      });
    },
  };
}

test("enqueue stores the unchanged event through the caller's transaction", async () => {
  const calls = [];
  const outbox = new TransactionalOutbox({
    transaction: async (work) => work({
      query: async (sql, values) => {
        calls.push({ sql, values });
        return { rows: [] };
      },
    }),
  });

  await outbox.enqueue({
    query: async (sql, values) => {
      calls.push({ sql, values });
      return { rows: [] };
    },
  }, event);

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO cgn_outbox_events/);
  assert.equal(calls[0].values[0], event.eventId);
  assert.deepEqual(calls[0].values[1], event);
});

test("enqueue rejects malformed or unsupported envelopes before writing", async () => {
  let writes = 0;
  const outbox = new TransactionalOutbox({
    transaction: async (work) => work({
      query: async () => {
        writes += 1;
        return { rows: [] };
      },
    }),
  });

  await assert.rejects(
    outbox.enqueue({ query: async () => ({ rows: [] }) }, { ...event, eventVersion: 2 }),
    /valid domain\.event\.envelope\.v1/,
  );
  await assert.rejects(
    outbox.enqueue({ query: async () => ({ rows: [] }) }, { ...event, occurredAt: "yesterday" }),
    /valid date-time/,
  );
  assert.equal(writes, 0);
});

test("claims are bounded and use row locks, leases, and a stable retry limit", async () => {
  const calls = [];
  const runner = makeRunner(async (sql, values) => {
    calls.push({ sql, values });
    return { rows: [{ envelope: event, attempt_count: 2 }] };
  });
  const outbox = new TransactionalOutbox(runner);

  assert.deepEqual(await outbox.claimBatch(1, 2_000), [{ event, attempt: 2 }]);
  assert.match(calls[0].sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(calls[0].sql, /lease_expires_at/);
  assert.deepEqual(calls[0].values, [1, 2_000, OUTBOX_MAX_ATTEMPTS]);
  await assert.rejects(outbox.claimBatch(OUTBOX_MAX_BATCH_SIZE + 1), RangeError);
  await assert.rejects(outbox.claimBatch(1, 15 * 60_000 + 1), RangeError);
});

test("failed publication retries with the same event ID and a bounded safe error", async () => {
  const calls = [];
  const runner = makeRunner(async (sql, values) => {
    calls.push({ sql, values });
    return {
      rows: sql.includes("FOR UPDATE")
        ? [{ envelope: event, attempt_count: 1 }]
        : [{ event_id: event.eventId }],
    };
  });
  const outbox = new TransactionalOutbox(runner, () => new Date("2026-10-18T10:00:00.000Z"));

  const result = await outbox.dispatchBatch({
    publish: async () => {
      const error = new Error("provider details may contain private data");
      error.code = "TEMPORARY_FAILURE";
      throw error;
    },
  }, 1);

  assert.deepEqual(result, { claimed: 1, published: 0, retried: 1, deadLettered: 0 });
  const retryCall = calls.find(({ sql }) => sql.includes("available_at = $2"));
  assert.ok(retryCall);
  assert.equal(retryCall.values[0], event.eventId);
  assert.equal(retryCall.values[2], "TEMPORARY_FAILURE");
  assert.doesNotMatch(JSON.stringify(retryCall.values), /provider details/);
});

test("repeated failures are durably dead-lettered after the bounded attempt count", async () => {
  const calls = [];
  const runner = makeRunner(async (sql, values) => {
    calls.push({ sql, values });
    return { rows: [{ envelope: event, attempt_count: OUTBOX_MAX_ATTEMPTS }] };
  });
  const outbox = new TransactionalOutbox(runner);

  const result = await outbox.dispatchBatch({ publish: async () => { throw new Error("private"); } }, 1);

  assert.deepEqual(result, { claimed: 1, published: 0, retried: 0, deadLettered: 1 });
  const deadLetter = calls.find(({ sql }) => sql.includes("dead_lettered_at = clock_timestamp()"));
  assert.ok(deadLetter);
  assert.equal(deadLetter.values[0], event.eventId);
  assert.equal(deadLetter.values[1], "PUBLISH_FAILED");
});
