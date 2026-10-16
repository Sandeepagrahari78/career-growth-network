import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  CGN_TABS,
  STATUS_CHOICES,
  resolveEntryRoute,
  getTabRoute,
} from "../../apps/mobile/src/foundation/navigation.mjs";
import {
  CgnApiError,
  createCgnApiClient,
} from "../../apps/mobile/src/foundation/api-client.mjs";

test("CGN V2 tabs and status choices follow six approved images", () => {
  assert.deepEqual(
    CGN_TABS.map((tab) => tab.label),
    ["Home", "Explore", "Journey", "Chats", "Profile"],
  );
  assert.equal(new Set(CGN_TABS.map((tab) => tab.route)).size, 5);
  assert.equal(getTabRoute("chats"), "/chats");
  assert.throws(() => getTabRoute("unknown"), RangeError);
  assert.deepEqual(STATUS_CHOICES, [
    "11th",
    "12th",
    "B.Tech",
    "B.Sc",
    "NEET Prep",
    "JEE Prep",
    "UPSC Prep",
    "Other",
  ]);
});

test("authorized user sees one current-status step before Home", () => {
  assert.equal(resolveEntryRoute({ session: "signed_out" }), "/login");
  assert.equal(
    resolveEntryRoute({ session: "authenticated" }),
    "/current-status",
  );
  assert.equal(
    resolveEntryRoute({ session: "authenticated", currentStatus: "B.Tech" }),
    "/home",
  );
});

test("API transport rejects insecure URLs and cross-origin endpoints", async () => {
  assert.throws(
    () => createCgnApiClient({
      baseUrl: "http://example.com",
      getAccessToken: () => "test",
    }),
    TypeError,
  );
  const client = createCgnApiClient({
    baseUrl: "https://api.cgn.example",
    getAccessToken: () => "test",
    fetchImpl: () => assert.fail("invalid endpoint must not call fetch"),
  });
  await assert.rejects(client.request("//evil.test/"), TypeError);
  await assert.rejects(client.request("http://evil.test/"), TypeError);
  await assert.rejects(client.request("/v1/bad%2fpath"), TypeError);
});

test("API client never sends unauthenticated traffic", async () => {
  const client = createCgnApiClient({
    baseUrl: "https://api.cgn.example",
    getAccessToken: async () => null,
    fetchImpl: () => assert.fail("no request without a session"),
  });
  await assert.rejects(
    client.request("/v1/contract-defined-path"),
    (error) => error instanceof CgnApiError && error.code === "AUTH_REQUIRED",
  );
});

test("real HTTP loopback integration uses bearer token and JSON", async (t) => {
  const server = createServer(async (req, res) => {
    assert.equal(req.headers.authorization, "Bearer test-token");
    assert.equal(req.method, "POST");
    assert.equal(req.url, "/v1/test-only");
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString()), { ok: true });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ stored: true }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const client = createCgnApiClient({
    baseUrl: "http://127.0.0.1:" + server.address().port,
    getAccessToken: () => "test-token",
    allowInsecureLocal: true,
  });
  assert.deepEqual(
    await client.request("/v1/test-only", {
      method: "POST",
      body: { ok: true },
    }),
    { stored: true },
  );
});

test("HTTP errors and invalid responses cannot appear as success", async () => {
  const base = {
    baseUrl: "https://api.cgn.example",
    getAccessToken: () => "test-token",
  };
  const denied = createCgnApiClient({
    ...base,
    fetchImpl: async () => ({ ok: false, status: 403 }),
  });
  await assert.rejects(
    denied.request("/v1/private"),
    (error) => error instanceof CgnApiError && error.status === 403,
  );
  const badJson = createCgnApiClient({
    ...base,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: () => {
        throw new SyntaxError("invalid");
      },
    }),
  });
  await assert.rejects(
    badJson.request("/v1/test"),
    (error) => error instanceof CgnApiError && error.code === "INVALID_JSON",
  );
});
