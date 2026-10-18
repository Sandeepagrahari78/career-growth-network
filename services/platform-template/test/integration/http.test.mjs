import assert from "node:assert/strict";
import test from "node:test";
import {
  Controller,
  ForbiddenException,
  Get,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  UnauthorizedException,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../dist/app.module.js";
import { ApiExceptionFilter } from "../../dist/http/api-exception.filter.js";
import { requestCorrelationMiddleware } from "../../dist/observability/request-correlation.middleware.js";
import { StructuredLogger } from "../../dist/observability/structured-logger.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const contractFixture = require("../../../../packages/contracts/fixtures/http/error-envelope.v1.json");

class ErrorFixtureController {
  validation() {
    return "not reached";
  }

  unauthenticated() {
    throw new UnauthorizedException("authorization header must stay private");
  }

  forbidden() {
    throw new ForbiddenException("private policy detail must stay private");
  }

  notFound() {
    throw new NotFoundException("private resource detail must stay private");
  }

  unexpected() {
    throw new Error("private stack secret must stay private");
  }
}

Controller("_contract-fixtures")(ErrorFixtureController);
for (const [method, path] of [
  ["validation", "validation/:id"],
  ["unauthenticated", "unauthenticated"],
  ["forbidden", "forbidden"],
  ["notFound", "not-found"],
  ["unexpected", "unexpected"],
]) {
  Get(path)(
    ErrorFixtureController.prototype,
    method,
    Object.getOwnPropertyDescriptor(ErrorFixtureController.prototype, method),
  );
}
Param("id", new ParseIntPipe())(
  ErrorFixtureController.prototype,
  "validation",
  0,
);

class ErrorFixtureModule {}
Module({ controllers: [ErrorFixtureController] })(ErrorFixtureModule);

async function startApp(module = AppModule) {
  const logger = new StructuredLogger();
  const app = await NestFactory.create(module, {
    logger: false,
    abortOnError: false,
  });
  app.use(requestCorrelationMiddleware(logger));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(0, "127.0.0.1");

  const address = app.getHttpServer().address();
  assert.ok(address && typeof address !== "string");
  return { app, baseUrl: `http://127.0.0.1:${address.port}` };
}

test("HTTP health, readiness, request correlation, and unknown routes", async (t) => {
  const { app, baseUrl } = await startApp();
  t.after(async () => app.close());

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
  const requestId = missing.headers.get("x-request-id");
  assert.match(requestId ?? "", /^[0-9a-f-]{36}$/);
  const missingBody = await missing.json();
  assert.deepEqual(missingBody, {
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found.",
      requestId,
    },
  });
});

test("malformed caller request IDs are replaced before returning to the caller", async (t) => {
  const { app, baseUrl } = await startApp();
  t.after(async () => app.close());

  const response = await fetch(`${baseUrl}/health`, {
    headers: { "x-request-id": "bad/id" },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/);
});

test("HTTP errors match shared fixtures and do not expose framework or exception details", async (t) => {
  const { app, baseUrl } = await startApp(ErrorFixtureModule);
  t.after(async () => app.close());

  const paths = {
    validation: "/_contract-fixtures/validation/not-an-integer",
    unauthenticated: "/_contract-fixtures/unauthenticated",
    forbidden: "/_contract-fixtures/forbidden",
    "not-found": "/_contract-fixtures/not-found",
    unexpected: "/_contract-fixtures/unexpected",
  };

  for (const fixture of contractFixture.responses) {
    const response = await fetch(`${baseUrl}${paths[fixture.case]}`, {
      headers: { "x-request-id": "cgn-contract-test" },
    });
    assert.equal(response.status, fixture.status, fixture.case);
    assert.equal(response.headers.get("x-request-id"), "cgn-contract-test");
    const body = await response.json();
    assert.deepEqual(body, { error: fixture.error }, fixture.case);
    assert.doesNotMatch(
      JSON.stringify(body),
      /private|secret|stack|authorization/i,
    );
    assert.equal("stack" in body, false);
    assert.equal("statusCode" in body, false);
  }
});
