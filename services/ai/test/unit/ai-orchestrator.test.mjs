import assert from "node:assert/strict";
import test from "node:test";
import {
  AiOrchestrationError,
  AiPromptResolutionError,
  AiOrchestrator,
  resolveAiPrompt,
} from "../../dist/ai-orchestrator.js";

const versionOne = {
  promptId: "career.plan",
  promptVersion: 1,
  template: "Plan for {{goal}} using {{context}}",
  variables: ["goal", "context"],
  modelConfig: {
    model: "approved-model-alias",
    temperature: 0.2,
    maxOutputTokens: 1200,
  },
  responseSchema: {
    type: "object",
    properties: { plan: { type: "string" } },
    required: ["plan"],
    additionalProperties: false,
  },
  provenance: { source: "repository", revision: "CGN-123-fixture-1" },
};

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

test("resolves the exact prompt version with reproducible metadata", () => {
  const newerVersion = {
    ...versionOne,
    promptVersion: 2,
    template: "Updated plan for {{goal}} using {{context}}",
    provenance: { source: "repository", revision: "CGN-123-fixture-2" },
  };
  const request = resolveAiPrompt(
    [newerVersion, versionOne],
    "career.plan",
    1,
    { goal: "career growth", context: "private context" },
  );

  assert.deepEqual(request, {
    prompt: "Plan for career growth using private context",
    promptMetadata: {
      promptId: "career.plan",
      promptVersion: 1,
      modelConfig: {
        model: "approved-model-alias",
        temperature: 0.2,
        maxOutputTokens: 1200,
      },
      responseSchema: versionOne.responseSchema,
      provenance: { source: "repository", revision: "CGN-123-fixture-1" },
    },
  });
});

test("does not fall back when an exact prompt version is unavailable", () => {
  assert.throws(
    () =>
      resolveAiPrompt([versionOne], "career.plan", 2, {
        goal: "career growth",
        context: "private context",
      }),
    (error) => {
      assert.ok(error instanceof AiPromptResolutionError);
      assert.equal(error.code, "AI_PROMPT_VERSION_NOT_FOUND");
      return true;
    },
  );
});

test("rejects ambiguous prompt versions and invalid model/schema metadata", () => {
  const cyclicSchema = {};
  cyclicSchema.self = cyclicSchema;
  const invalidDefinitions = [
    [versionOne, { ...versionOne }],
    [{ ...versionOne, modelConfig: { model: " " } }],
    [{ ...versionOne, modelConfig: { model: "model", apiKey: "private" } }],
    [{ ...versionOne, modelConfig: { model: "model", temperature: 2.1 } }],
    [{ ...versionOne, modelConfig: { model: "model", maxOutputTokens: 0 } }],
    [{ ...versionOne, responseSchema: [] }],
    [{ ...versionOne, responseSchema: cyclicSchema }],
    [{ ...versionOne, provenance: { source: "repository", revision: " " } }],
    [{ ...versionOne, template: "Plan for {{unknown}}" }],
  ];

  for (const definitions of invalidDefinitions) {
    assert.throws(
      () =>
        resolveAiPrompt(definitions, "career.plan", 1, {
          goal: "career growth",
          context: "private context",
        }),
      (error) => error.code === "AI_PROMPT_CONFIGURATION_INVALID",
    );
  }
});

test("rejects missing and undeclared prompt variables without echoing values", () => {
  const privateInput = "fixture-private-value-123";
  for (const variables of [
    { goal: privateInput },
    { goal: "career", context: privateInput, extra: privateInput },
    { goal: 42, context: privateInput },
  ]) {
    assert.throws(
      () => resolveAiPrompt([versionOne], "career.plan", 1, variables),
      (error) => {
        assert.ok(error instanceof AiPromptResolutionError);
        assert.equal(error.code, "AI_PROMPT_VARIABLES_INVALID");
        assert.equal(error.message.includes(privateInput), false);
        return true;
      },
    );
  }
});

test("keeps resolved prompt variables out of orchestration telemetry", async () => {
  const privateInput = "fixture-private-value-456";
  const records = [];
  const request = resolveAiPrompt([versionOne], "career.plan", 1, {
    goal: "career growth",
    context: privateInput,
  });
  const orchestrator = new AiOrchestrator(
    {
      async generate(generationRequest) {
        assert.equal(generationRequest.prompt.includes(privateInput), true);
        assert.deepEqual(
          generationRequest.promptMetadata,
          request.promptMetadata,
        );
        return { text: "fixture result" };
      },
    },
    { record: (entry) => records.push(entry) },
  );

  await orchestrator.generate(request);
  assert.equal(JSON.stringify(records).includes(privateInput), false);
  assert.equal(JSON.stringify(records).includes("Plan for"), false);
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
