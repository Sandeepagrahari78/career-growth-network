import assert from "node:assert/strict";
import test from "node:test";
import { AiOrchestrator, resolveAiPrompt } from "../../dist/ai-orchestrator.js";

test("runs through the versioned provider contract with an injected fake", async () => {
  let calls = 0;
  const definition = {
    promptId: "career.plan",
    promptVersion: 7,
    template: "Build a plan for {{goal}}",
    variables: ["goal"],
    modelConfig: { model: "test-model", temperature: 0.1 },
    responseSchema: { type: "object", required: ["plan"] },
    provenance: { source: "fixture", revision: "integration-7" },
  };
  const request = resolveAiPrompt([definition], "career.plan", 7, {
    goal: "career planning",
  });
  const orchestrator = new AiOrchestrator({
    async generate({ prompt, promptMetadata }, { signal }) {
      calls += 1;
      assert.equal(signal.aborted, false);
      assert.equal(prompt, "Build a plan for career planning");
      assert.equal(promptMetadata.promptVersion, 7);
      assert.equal(promptMetadata.modelConfig.model, "test-model");
      assert.deepEqual(
        promptMetadata.responseSchema,
        definition.responseSchema,
      );
      assert.deepEqual(promptMetadata.provenance, definition.provenance);
      return { text: "deterministic fixture response" };
    },
  });

  const result = await orchestrator.generate(request);

  assert.equal(calls, 1);
  assert.deepEqual(result, { text: "deterministic fixture response" });
});
