import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("career.activity.v1 keeps canonical integration fields", async () => {
  const raw = await readFile(
    new URL("../../packages/contracts/schemas/career.activity.v1.schema.json", import.meta.url),
    "utf8",
  );
  const schema = JSON.parse(raw);

  assert.equal(schema.title, "CareerActivityV1");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.visibility.enum, ["private", "connections", "public"]);

  for (const field of [
    "activityId",
    "userId",
    "kind",
    "occurredAt",
    "sourceDomain",
    "sourceEntityId",
    "visibility",
    "summary",
  ]) {
    assert.ok(schema.required.includes(field), `Missing required field: ${field}`);
  }
});
