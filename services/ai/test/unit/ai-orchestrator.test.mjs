import assert from "node:assert/strict";
import test from "node:test";
import {
  AiOrchestrationError,
  AiOrchestrator,
} from "../../dist/ai-orchestrator.js";

test("injects the provider and returns its generated result", async () => {
  const records = [];
  const orchestrator = new AiOrchestrator(
    {
      async generate(request, { signal }) {
        assert.equal(request.prompt, "private prompt content");
        assert.equal(signal.aborted, false);
        return { text: "private generated content" };
      },
    },
    { record: (entry) => records.push(entry) },
  );

  assert.deepEqual(
    await orchestrator.generate({ prompt: "private prompt content" }),
    { text: "private generated content" },
  );
  assert.deepEqual(records[0], {
    event: "ai.orchestration.completed",
    outcome: "success",
    durationMs: records[0].durationMs,
  });
});

test("maps provider errors to a safe message and redacts telemetry", async () => {
  const records = [];
  const secret = "prompt-secret-123 token-secret-456";
  const orchestrator = new AiOrchestrator(
    {
      async generate() {
        throw new Error(`provider echoed ${secret}`);
      },
    },
    { record: (entry) => records.push(entry) },
  );

  await assert.rejects(orchestrator.generate({ prompt: secret }), (error) => {
    assert.ok(error instanceof AiOrchestrationError);
    assert.equal(error.code, "AI_PROVIDER_FAILURE");
    assert.equal(error.message.includes(secret), false);
    return true;
  });

  assert.equal(JSON.stringify(records).includes(secret), false);
  assert.equal(records[0].outcome, "provider_failure");
  assert.equal(records[0].errorCode, "AI_PROVIDER_FAILURE");
});

test("times out and aborts the provider signal", async () => {
  let providerSignal;
  const orchestrator = new AiOrchestrator(
    {
      generate(_request, { signal }) {
        providerSignal = signal;
        return new Promise(() => undefined);
      },
    },
    { timeoutMs: 10 },
  );

  await assert.rejects(
    orchestrator.generate({ prompt: "private" }),
    (error) => error.code === "AI_REQUEST_TIMEOUT",
  );
  assert.equal(providerSignal.aborted, true);
});

test("caller cancellation aborts the provider and returns promptly", async () => {
  const caller = new AbortController();
  let providerSignal;
  const orchestrator = new AiOrchestrator(
    {
      generate(_request, { signal }) {
        providerSignal = signal;
        return new Promise(() => undefined);
      },
    },
    { timeoutMs: 1_000 },
  );

  const pending = orchestrator.generate({ prompt: "private" }, caller.signal);
  await new Promise((resolve) => setTimeout(resolve, 0));
  caller.abort();

  await assert.rejects(
    pending,
    (error) => error.code === "AI_REQUEST_CANCELLED",
  );
  assert.equal(providerSignal.aborted, true);
});

test("does not call the provider when the caller is already cancelled", async () => {
  const caller = new AbortController();
  caller.abort();
  let called = false;
  const orchestrator = new AiOrchestrator({
    async generate() {
      called = true;
      return { text: "unexpected" };
    },
  });

  await assert.rejects(
    orchestrator.generate({ prompt: "private" }, caller.signal),
    (error) => error.code === "AI_REQUEST_CANCELLED",
  );
  assert.equal(called, false);
});

test("rejects an invalid timeout configuration", () => {
  assert.throws(
    () =>
      new AiOrchestrator(
        { generate: async () => ({ text: "ok" }) },
        { timeoutMs: 0 },
      ),
    RangeError,
  );
});
