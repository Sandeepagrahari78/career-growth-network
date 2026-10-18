import test from "node:test";
import assert from "node:assert/strict";
import {
  createCurrentStatusGate,
  CurrentStatusGateError,
} from "../../apps/mobile/src/foundation/status-gate.mjs";

function deferred() {
  let resolve;
  const promise = new Promise((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

test("requires real session and persistence adapters", () => {
  assert.throws(() => createCurrentStatusGate(), TypeError);
  assert.equal(CurrentStatusGateError.name, "CurrentStatusGateError");
});

test("signed-out student cannot submit or be forwarded to Home", async () => {
  let writes = 0;
  const gate = createCurrentStatusGate({
    isAuthenticated: async () => false,
    persistStatusChoice: async () => {
      writes++;
      return true;
    },
  });
  await assert.rejects(gate.submit("11th"), { code: "AUTH_REQUIRED" });
  assert.equal(writes, 0);
});

test("unsupported choice never reaches the persistence adapter", async () => {
  let writes = 0;
  const gate = createCurrentStatusGate({
    isAuthenticated: async () => true,
    persistStatusChoice: async () => {
      writes++;
      return true;
    },
  });
  await assert.rejects(gate.submit("MBA"), { code: "INVALID_STATUS_CHOICE" });
  assert.equal(writes, 0);
});

test("Home opens only after a confirmed authorized server save", async () => {
  const calls = [];
  const gate = createCurrentStatusGate({
    isAuthenticated: async () => {
      calls.push("auth");
      return true;
    },
    persistStatusChoice: async (choice) => {
      calls.push(choice);
      return true;
    },
  });
  assert.equal(await gate.submit("NEET Prep"), "/home");
  assert.deepEqual(calls, ["auth", "NEET Prep", "auth"]);
});

test("unknown, null or false save responses never count as persisted", async () => {
  for (const answer of [undefined, null, false, { ok: true }]) {
    const gate = createCurrentStatusGate({
      isAuthenticated: () => true,
      persistStatusChoice: () => answer,
    });
    await assert.rejects(gate.submit("B.Tech"), {
      code: "SAVE_NOT_CONFIRMED",
    });
  }
});

test("network errors propagate without claiming success; a retry may succeed", async () => {
  let n = 0;
  const gate = createCurrentStatusGate({
    isAuthenticated: () => true,
    persistStatusChoice: () => {
      n++;
      if (n === 1) throw new Error("network unavailable");
      return true;
    },
  });
  await assert.rejects(gate.submit("12th"), /network unavailable/);
  assert.equal(await gate.submit("12th"), "/home");
});

test("duplicate taps do not cause duplicate simultaneous writes", async () => {
  const hold = deferred();
  let writes = 0;
  const gate = createCurrentStatusGate({
    isAuthenticated: () => true,
    persistStatusChoice: async () => {
      writes++;
      return hold.promise;
    },
  });
  const first = gate.submit("B.Sc");
  await assert.rejects(gate.submit("B.Sc"), { code: "SAVE_IN_PROGRESS" });
  hold.resolve(true);
  assert.equal(await first, "/home");
  assert.equal(writes, 1);
});

test("session revoked during server persistence must not open Home", async () => {
  const hold = deferred();
  const enteredPersistence = deferred();
  let authenticated = true;
  const gate = createCurrentStatusGate({
    isAuthenticated: () => authenticated,
    persistStatusChoice: () => {
      enteredPersistence.resolve();
      return hold.promise;
    },
  });
  const saved = gate.submit("JEE Prep");
  await enteredPersistence.promise;
  authenticated = false;
  hold.resolve(true);
  await assert.rejects(saved, { code: "AUTH_REQUIRED" });
});
