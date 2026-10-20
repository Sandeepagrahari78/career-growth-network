import assert from "node:assert/strict";
import test from "node:test";
import { loadAppConfig } from "../../dist/config/app-config.js";
import {
  createGatewayAuthContextForwardingV1,
  isIdentityAuthorizationContext,
  resolveIdentityAuthorizationContext,
} from "../../dist/auth/identity-authorization-context.js";
import {
  GATEWAY_AUTH_CONTEXT_FORWARDING_CONTRACT_V1,
  IDENTITY_AUTHORIZATION_CONTEXT_CONTRACT_V1,
} from "../../dist/gateway-auth-context-contract.js";

const validContext = {
  contract: IDENTITY_AUTHORIZATION_CONTEXT_CONTRACT_V1,
  accountId: "c2c7c1f0-f2ec-43bb-9ea1-04d32409f362",
  evaluatedAt: "2026-10-21T10:00:00.000Z",
  roles: ["student"],
};

test("Identity context validation rejects malformed or extended payloads", () => {
  assert.equal(isIdentityAuthorizationContext(validContext), true);
  assert.equal(
    isIdentityAuthorizationContext({ ...validContext, session: "secret" }),
    false,
  );
  assert.equal(
    isIdentityAuthorizationContext({ ...validContext, roles: ["root"] }),
    false,
  );
  assert.equal(
    isIdentityAuthorizationContext({ ...validContext, roles: ["student", "student"] }),
    false,
  );
  assert.equal(
    isIdentityAuthorizationContext({ ...validContext, accountId: "not-a-uuid" }),
    false,
  );
  assert.equal(
    isIdentityAuthorizationContext({
      ...validContext,
      evaluatedAt: "2026-10-21T10:00:00",
    }),
    false,
  );
});

test("forwarding envelope is versioned and contains only the Identity payload", () => {
  assert.deepEqual(createGatewayAuthContextForwardingV1(validContext), {
    contract: GATEWAY_AUTH_CONTEXT_FORWARDING_CONTRACT_V1,
    identityAuthorizationContext: validContext,
  });
});

test("context resolver sends only the selected session cookie to Identity", async () => {
  const config = loadAppConfig({
    IDENTITY_BASE_URL: "http://identity.test",
  });
  let requestSeen;
  const result = await resolveIdentityAuthorizationContext(
    "theme=dark; cgn_identity_session=" + "a".repeat(43) + "; tracking=ignored",
    config,
    async (input, init) => {
      requestSeen = { url: String(input), init };
      return new Response(JSON.stringify(validContext), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  );
  assert.equal(result.kind, "authenticated");
  assert.equal(
    requestSeen.url,
    "http://identity.test/v1/identity/auth/authorization-context",
  );
  assert.equal(requestSeen.init.method, "GET");
  assert.deepEqual(requestSeen.init.headers, {
    cookie: "cgn_identity_session=" + "a".repeat(43),
  });
});

test("missing, duplicate and invalid session cookies fail closed without calling Identity", async () => {
  const config = loadAppConfig({ IDENTITY_BASE_URL: "http://identity.test" });
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return new Response(JSON.stringify(validContext));
  };
  for (const cookie of [
    undefined,
    "cgn_identity_session=short",
    "cgn_identity_session=" + "a".repeat(43) + "; cgn_identity_session=" + "b".repeat(43),
  ]) {
    const result = await resolveIdentityAuthorizationContext(cookie, config, fetcher);
    assert.equal(result.kind, "unauthenticated");
  }
  assert.equal(calls, 0);
});

test("Identity errors and malformed response are not treated as authenticated", async () => {
  const config = loadAppConfig({ IDENTITY_BASE_URL: "http://identity.test" });
  const cookie = "cgn_identity_session=" + "a".repeat(43);
  const unauthorized = await resolveIdentityAuthorizationContext(
    cookie,
    config,
    async () => new Response("{}", { status: 401 }),
  );
  assert.deepEqual(unauthorized, { kind: "unauthenticated" });

  const unavailable = await resolveIdentityAuthorizationContext(
    cookie,
    config,
    async () => new Response("private upstream error", { status: 500 }),
  );
  assert.deepEqual(unavailable, { kind: "unavailable" });

  const malformed = await resolveIdentityAuthorizationContext(
    cookie,
    config,
    async () => new Response(JSON.stringify({ ...validContext, trusted: true })),
  );
  assert.deepEqual(malformed, { kind: "unavailable" });
});
