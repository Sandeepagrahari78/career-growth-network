import assert from "node:assert/strict";
import test from "node:test";
import { ReadinessService } from "../../dist/health/readiness.service.js";
import { StructuredLogger } from "../../dist/observability/structured-logger.js";

test("readiness stays closed until Nest application bootstrap completes", () => {
  const readiness = new ReadinessService();
  assert.equal(readiness.isReady(), false);
  readiness.onApplicationBootstrap();
  assert.equal(readiness.isReady(), true);
});

test("structured logger redacts unsafe messages and emits no request URL", () => {
  const originalWrite = process.stdout.write;
  const output = [];
  process.stdout.write = (chunk) => {
    output.push(String(chunk));
    return true;
  };
  try {
    const logger = new StructuredLogger();
    logger.log("Bearer secret-token", "unsafe context with spaces");
    logger.error("database password=secret");
    logger.request({
      requestId: "safe-correlation-id",
      method: "GET",
      statusCode: 404,
      durationMs: 3,
    });
  } finally {
    process.stdout.write = originalWrite;
  }

  const records = output.map((line) => JSON.parse(line));
  const serialized = JSON.stringify(records);
  assert.equal(serialized.includes("secret-token"), false);
  assert.equal(serialized.includes("password=secret"), false);
  assert.equal(serialized.includes("unsafe context with spaces"), false);
  assert.equal(serialized.includes("url"), false);
  assert.equal(records[0].message, "runtime_event");
  assert.equal(records[1].message, "framework_error");
});
