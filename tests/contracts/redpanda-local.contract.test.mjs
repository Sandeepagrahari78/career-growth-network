import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  composeArgs,
  createSmokeEvent,
} from "../../scripts/infra/redpanda-local.mjs";

const compose = await readFile(
  new URL("../../infra/docker/docker-compose.redpanda.yml", import.meta.url),
  "utf8",
);
const script = await readFile(
  new URL("../../scripts/infra/redpanda-local.mjs", import.meta.url),
  "utf8",
);

test("local Redpanda image is pinned and listeners bind only to loopback", () => {
  assert.match(compose, /image: redpandadata\/redpanda:v24\.2\.10/);
  assert.match(compose, /127\.0\.0\.1:19092:19092/);
  assert.match(compose, /127\.0\.0\.1:19644:9644/);
  assert.match(compose, /cgn-redpanda-data:\/var\/lib\/redpanda\/data/);
  assert.doesNotMatch(compose, /\n\s+- "(?:19092|19644):/);
});

test("smoke event uses the existing versioned domain event fixture", () => {
  const event = createSmokeEvent();
  assert.match(event.eventId, /^cgn-local-smoke-/);
  assert.equal(event.eventType, "career.activity.recorded");
  assert.equal(event.eventVersion, 1);
  assert.equal(event.producer, "career");
  assert.deepEqual(event.payload, { activityId: "activity-123" });
});

test("compose lifecycle is scoped and removes volumes only for explicit reset", () => {
  assert.deepEqual(composeArgs(["down"]), [
    "compose",
    "-f",
    "infra/docker/docker-compose.redpanda.yml",
    "down",
  ]);
  assert.deepEqual(composeArgs(["down", "--volumes"]), [
    "compose",
    "-f",
    "infra/docker/docker-compose.redpanda.yml",
    "down",
    "--volumes",
  ]);
  assert.match(script, /case "reset":\s+down\(\{ purge: true \}\)/);
  assert.doesNotMatch(script, /volume prune|--remove-orphans/);
});

test("restart smoke proves a versioned event survives broker restart", () => {
  assert.match(script, /"restart", "redpanda"/);
  assert.match(script, /"topic",\s*"consume"/);
  assert.match(script, /assert\.equal\(record\.eventId, expected\.eventId\)/);
  assert.match(script, /assert\.equal\(record\.eventVersion, 1\)/);
});
