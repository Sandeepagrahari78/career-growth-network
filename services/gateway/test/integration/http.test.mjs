import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import test from "node:test";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../dist/app.module.js";
import { loadAppConfig } from "../../dist/config/app-config.js";
import { ApiExceptionFilter } from "../../dist/http/api-exception.filter.js";
import { requestCorrelationMiddleware } from "../../dist/observability/request-correlation.middleware.js";
import { StructuredLogger } from "../../dist/observability/structured-logger.js";
import { createGatewayProxyMiddleware } from "../../dist/proxy/gateway-proxy.middleware.js";
import {
  GATEWAY_AUTH_CONTEXT_HEADER_V1,
  GATEWAY_AUTH_CONTEXT_FORWARDING_CONTRACT_V1,
  IDENTITY_AUTHORIZATION_CONTEXT_API_V1,
} from "../../dist/gateway-auth-context-contract.js";

const validContext = {
  contract: "cgn.identity.authorization-context.v1",
  accountId: "c2c7c1f0-f2ec-43bb-9ea1-04d32409f362",
  evaluatedAt: "2026-10-21T10:00:00.000Z",
  roles: ["student"],
};
const validSession = "a".repeat(43);

async function startServer(handler) {
  const server = createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    server,
    baseUrl: "http://127.0.0.1:" + address.port,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function startApp(config, t) {
  const logger = new StructuredLogger();
  const app = await NestFactory.create(AppModule, {
    logger: false,
    rawBody: true,
    bodyParser: false,
    abortOnError: false,
  });
  app.useBodyParser("raw", { type: "*/*", limit: "100kb" });
  app.use(requestCorrelationMiddleware(logger));
  app.use("/v1", createGatewayProxyMiddleware(config));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(0, "127.0.0.1");
  const address = app.getHttpServer().address();
  assert.ok(address && typeof address !== "string");
  t.after(async () => app.close());
  return "http://127.0.0.1:" + address.port;
}

async function startIdentity(t, handler) {
  const server = await startServer(handler);
  t.after(server.close);
  return server;
}

test("health, readiness and unknown configured routes follow service conventions", async (t) => {
  let identityCalls = 0;
  const identity = await startIdentity(t, (_request, response) => {
    identityCalls += 1;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(validContext));
  });
  const config = loadAppConfig({
    NODE_ENV: "test",
    IDENTITY_BASE_URL: identity.baseUrl,
    CGN_GATEWAY_UPSTREAMS: JSON.stringify({ career: "http://127.0.0.1:1" }),
  });
  const baseUrl = await startApp(config, t);

  const health = await fetch(baseUrl + "/health");
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });
  const ready = await fetch(baseUrl + "/ready");
  assert.equal(ready.status, 200);

  const missing = await fetch(baseUrl + "/v1/not-configured/private");
  assert.equal(missing.status, 404);
  const requestId = missing.headers.get("x-request-id");
  assert.deepEqual(await missing.json(), {
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found.",
      requestId,
    },
  });
  assert.equal(identityCalls, 0);
});

test("missing or invalid session is rejected before forwarding", async (t) => {
  let identityCalls = 0;
  let downstreamCalls = 0;
  const identity = await startIdentity(t, (_request, response) => {
    identityCalls += 1;
    response.writeHead(401, { "content-type": "application/json" });
    response.end("{}");
  });
  const downstream = await startServer((_request, response) => {
    downstreamCalls += 1;
    response.end("unexpected");
  });
  t.after(downstream.close);
  const config = loadAppConfig({
    IDENTITY_BASE_URL: identity.baseUrl,
    CGN_GATEWAY_UPSTREAMS: JSON.stringify({ career: downstream.baseUrl }),
  });
  const baseUrl = await startApp(config, t);

  const missing = await fetch(baseUrl + "/v1/career/goals");
  assert.equal(missing.status, 401);
  assert.equal(identityCalls, 0);
  const invalid = await fetch(baseUrl + "/v1/career/goals", {
    headers: { cookie: "cgn_identity_session=" + "b".repeat(43) },
  });
  assert.equal(invalid.status, 401);
  assert.equal(identityCalls, 1);
  assert.equal(downstreamCalls, 0);
});

test("verified context replaces spoofed headers and only the allowlisted request data is forwarded", async (t) => {
  let identityCookie;
  const identity = await startIdentity(t, (request, response) => {
    if (request.url !== IDENTITY_AUTHORIZATION_CONTEXT_API_V1) {
      response.writeHead(404).end();
      return;
    }
    identityCookie = request.headers.cookie;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(validContext));
  });
  let downstreamRequest;
  const downstream = await startServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    downstreamRequest = {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: Buffer.concat(chunks).toString("utf8"),
    };
    response.writeHead(201, { "content-type": "application/json" });
    response.end(JSON.stringify({ accepted: true }));
  });
  t.after(downstream.close);
  const config = loadAppConfig({
    IDENTITY_BASE_URL: identity.baseUrl,
    CGN_GATEWAY_UPSTREAMS: JSON.stringify({ career: downstream.baseUrl }),
  });
  const baseUrl = await startApp(config, t);

  const response = await fetch(baseUrl + "/v1/career/goals?view=active", {
    method: "POST",
    headers: {
      cookie: "theme=dark; cgn_identity_session=" + validSession,
      "content-type": "application/json",
      "x-request-id": "cgn-gateway-test-1",
      "x-cgn-auth-context-v1": "spoofed-context",
      "x-user-id": "spoofed-account",
      authorization: "Bearer spoofed-token",
    },
    body: JSON.stringify({ goal: "career" }),
  });

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("x-request-id"), "cgn-gateway-test-1");
  assert.deepEqual(await response.json(), { accepted: true });
  assert.equal(
    identityCookie,
    "cgn_identity_session=" + validSession,
    "only the Identity session cookie is sent to Identity",
  );
  assert.equal(downstreamRequest.method, "POST");
  assert.equal(downstreamRequest.url, "/v1/career/goals?view=active");
  assert.equal(downstreamRequest.body, JSON.stringify({ goal: "career" }));
  assert.equal(downstreamRequest.headers.cookie, undefined);
  assert.equal(downstreamRequest.headers.authorization, undefined);
  assert.equal(downstreamRequest.headers["x-user-id"], undefined);
  assert.equal(downstreamRequest.headers["x-request-id"], "cgn-gateway-test-1");
  assert.deepEqual(
    JSON.parse(downstreamRequest.headers[GATEWAY_AUTH_CONTEXT_HEADER_V1]),
    {
      contract: GATEWAY_AUTH_CONTEXT_FORWARDING_CONTRACT_V1,
      identityAuthorizationContext: validContext,
    },
  );
});

test("Identity and downstream failures return safe errors without private upstream details", async (t) => {
  const failingIdentity = await startIdentity(t, (_request, response) => {
    response.writeHead(500, { "content-type": "text/plain" });
    response.end("secret credential details");
  });
  const identityConfig = loadAppConfig({
    IDENTITY_BASE_URL: failingIdentity.baseUrl,
    CGN_GATEWAY_UPSTREAMS: JSON.stringify({ career: "http://127.0.0.1:1" }),
  });
  const identityGateway = await startApp(identityConfig, t);
  const cookie = { cookie: "cgn_identity_session=" + validSession };
  const identityFailure = await fetch(identityGateway + "/v1/career/goals", {
    headers: cookie,
  });
  assert.equal(identityFailure.status, 503);
  assert.doesNotMatch(await identityFailure.text(), /secret credential/);

  const validIdentity = await startIdentity(t, (_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(validContext));
  });
  const downstreamConfig = loadAppConfig({
    IDENTITY_BASE_URL: validIdentity.baseUrl,
    CGN_GATEWAY_UPSTREAMS: JSON.stringify({ career: "http://127.0.0.1:1" }),
  });
  const downstreamGateway = await startApp(downstreamConfig, t);
  const downstreamFailure = await fetch(
    downstreamGateway + "/v1/career/goals",
    { headers: cookie },
  );
  assert.equal(downstreamFailure.status, 502);
  assert.doesNotMatch(
    await downstreamFailure.text(),
    /ECONNREFUSED|127\.0\.0\.1/,
  );
});

test("malformed Identity response is not forwarded", async (t) => {
  let downstreamCalls = 0;
  const identity = await startIdentity(t, (_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ...validContext, session: "leak" }));
  });
  const downstream = await startServer((_request, response) => {
    downstreamCalls += 1;
    response.end("unexpected");
  });
  t.after(downstream.close);
  const config = loadAppConfig({
    IDENTITY_BASE_URL: identity.baseUrl,
    CGN_GATEWAY_UPSTREAMS: JSON.stringify({ career: downstream.baseUrl }),
  });
  const baseUrl = await startApp(config, t);

  const response = await fetch(baseUrl + "/v1/career/goals", {
    headers: { cookie: "cgn_identity_session=" + validSession },
  });
  assert.equal(response.status, 503);
  assert.equal(downstreamCalls, 0);
});
