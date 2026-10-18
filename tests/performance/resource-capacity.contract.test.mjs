import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  parseCpuMillicores,
  parseMemoryMiB,
  parseResourcePair,
  resourceBudget,
} from "./run-resource-capacity.mjs";

const schema = JSON.parse(
  readFileSync("infra/helm/cgn-service/values.schema.json", "utf8"),
);

test("health-demo staging resource profile is complete and ordered", () => {
  assert.deepEqual(parseResourcePair("requests"), {
    cpu: "50m",
    memory: "64Mi",
  });
  assert.deepEqual(parseResourcePair("limits"), {
    cpu: "500m",
    memory: "256Mi",
  });
  assert.equal(parseCpuMillicores("50m"), 50);
  assert.equal(parseMemoryMiB("64Mi"), 64);
  assert.ok(resourceBudget.cpuRequestMillicores < resourceBudget.cpuLimitMillicores);
  assert.ok(resourceBudget.memoryRequestMiB < resourceBudget.memoryLimitMiB);
});

test("Helm resource profile requires CPU and memory requests and limits as pairs", () => {
  const pairSchema = schema.definitions.cpuMemoryPair;
  assert.deepEqual(pairSchema.required, ["cpu", "memory"]);
  assert.deepEqual(Object.keys(schema.properties.resources.properties), [
    "requests",
    "limits",
  ]);
  assert.equal(schema.properties.resources.allOf.length, 2);
  assert.equal(schema.properties.resources.allOf[0].then.required[0], "limits");
  assert.equal(schema.properties.resources.allOf[1].then.required[0], "requests");
});
