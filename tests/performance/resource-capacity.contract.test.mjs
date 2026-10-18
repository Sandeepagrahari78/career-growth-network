import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  parseCpuMillicores,
  parseDockerStatsLine,
  parseMemoryMiB,
  parseResourcePair,
  resourceBudget,
  getMetricRate,
  getMetricValues,
  getRequestCount,
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
  assert.ok(
    resourceBudget.cpuRequestMillicores < resourceBudget.cpuLimitMillicores,
  );
  assert.ok(resourceBudget.memoryRequestMiB < resourceBudget.memoryLimitMiB);
});

test("Docker stats parser handles ANSI cursor and erase sequences", () => {
  const sample = parseDockerStatsLine(
    "\u001b[H0.17%|13.4MiB / 256MiB\n\u001b[H",
  );
  assert.ok(sample);
  assert.ok(Math.abs(sample.cpuMillicores - 1.7) < 0.001);
  assert.equal(sample.memoryMiB, 13.4);
});

test("k6 request count falls back to iterations for compatible summaries", () => {
  assert.equal(
    getRequestCount({ metrics: { iterations: { values: { count: 750 } } } }),
    750,
  );
  assert.equal(
    getRequestCount({
      metrics: {
        http_reqs: { values: { count: 751 } },
        iterations: { values: { count: 750 } },
      },
    }),
    751,
  );
});

test("k6 metric values accept wrapped and direct summary layouts", () => {
  assert.deepEqual(
    getMetricValues(
      { metrics: { http_req_failed: { values: { rate: 0.002 } } } },
      "http_req_failed",
    ),
    { rate: 0.002 },
  );
  assert.deepEqual(
    getMetricValues(
      { metrics: { http_req_failed: { rate: 0 } } },
      "http_req_failed",
    ),
    { rate: 0 },
  );
});

test("k6 rate metrics derive error rate from pass/fail counts", () => {
  assert.equal(
    getMetricRate(
      { metrics: { http_req_failed: { fails: 0, passes: 750 } } },
      "http_req_failed",
    ),
    0,
  );
  assert.equal(
    getMetricRate(
      {
        metrics: {
          http_req_failed: { values: { fails: 2, passes: 748 } },
        },
      },
      "http_req_failed",
    ),
    2 / 750,
  );
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
  assert.equal(
    schema.properties.resources.allOf[1].then.required[0],
    "requests",
  );
});
