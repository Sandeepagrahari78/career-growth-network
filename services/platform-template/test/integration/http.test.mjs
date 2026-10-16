import assert from "node:assert/strict";
import test from "node:test";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../dist/app.module.js";
import { requestCorrelationMiddleware } from "../../dist/observability/request-correlation.middleware.js";
import { StructuredLogger } from "../../dist/observability/structured-logger.js";

test("HTTP health, readiness, request correlation, and unknown routes", async (t) => {
  const logger = new StructuredLogger();
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  app.use(requestCorrelationMiddleware(logger));
  app.enableShutdownHooks();
  await app.listen(0, "127.0.0.1");
  t.after(async () => app.close());

  const address = app.getHttpServer().address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const health = await fetch(`${baseUrl}/health`, {
    headers: { "x-request-id": "cgn-test-123" },
  });
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("x-request-id"), "cgn-test-123");
  assert.deepEqual(await health.json(), { status: "ok" });

  const readiness = await fetch(`${baseUrl}/ready`);
  assert.equal(readiness.status, 200);
  assert.match(readiness.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/);
  assert.deepEqual(await readiness.json(), { status: "ready" });

  const missing = await fetch(`${baseUrl}/not-a-business-route`);
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/);
  const missingBody = await missing.json();
  assert.equal(missingBody.statusCode, 404);
  assert.equal("stack" in missingBody, false);
});

test("malformed caller request IDs are replaced before returning to the caller", async (t) => {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(requestCorrelationMiddleware(new StructuredLogger()));
  await app.listen(0, "127.0.0.1");
  t.after(async () => app.close());

  const address = app.getHttpServer().address();
  assert.ok(address && typeof address !== "string");
  const response = await fetch(`http://127.0.0.1:${address.port}/health`, {
    headers: { "x-request-id": "bad/id" },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/);
});
