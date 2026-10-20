import assert from "node:assert/strict";
import test from "node:test";
import { AiOrchestrator } from "../../dist/ai-orchestrator.js";

test("runs through the versioned provider contract with an injected fake", async () => {
  let calls = 0;
  const orchestrator = new AiOrchestrator({
    async generate({ prompt }, { signal }) {
      calls += 1;
      assert.equal(signal.aborted, false);
      return { text: `fake response for ${prompt}` };
    },
  });

  const result = await orchestrator.generate({ prompt: "career planning" });

  assert.equal(calls, 1);
  assert.deepEqual(result, { text: "fake response for career planning" });
});
