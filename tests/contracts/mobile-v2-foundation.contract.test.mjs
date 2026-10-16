import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  CGN_TABS,
  STATUS_CHOICES,
  getTabRoute,
  resolveEntryRoute,
} from "../../apps/mobile/src/foundation/navigation.mjs";
import {
  CgnApiError,
  createCgnApiClient,
} from "../../apps/mobile/src/foundation/api-client.mjs";

test("five tabs match approved mobile navigation", () => {
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

test("authorization and status decide the first screen", () => {
  assert.equal(resolveEntryRoute({ session: "signed_out" }), "/login");
  const pending = resolveEntryRoute({ session: "authenticated" });
  assert.equal(pending, "/current-status");
  const home = resolveEntryRoute({
    session: "authenticated",
    currentStatus: "B.Tech",
  });
  assert.equal(home, "/home");
});

test("cross-origin and unauthenticated requests fail closed", async () => {
  const config = {
    baseUrl: "https://api.cgn.example",
    getAccessToken: () => null,
  };
  assert.throws(
    () => createCgnApiClient({
      ...config,
      baseUrl: "http://example.com",
    }),
    TypeError,
  );
  const client = createCgnApiClient({
    ...config,
    fetchImpl: () => assert.fail("request must not leave the device"),
  });
  await assert.rejects(client.request("//evil.test/"), TypeError);
  await assert.rejects(client.request("/unsafe%2fpath"), TypeError);
  await assert.rejects(client.request("/safe"), {
    name: "CgnApiError",
    code: "AUTH_REQUIRED",
  });
});

test("real loopback request sends authorized JSON", async (t) => {
  const server = createServer(async (req, res) => {
    assert.equal(req.headers.authorization, "Bearer test-token");
    assert.equal(req.method, "POST");
    assert.equal(req.url, "/v1/test-only");
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    assert.deepEqual(body, { ok: true });
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
  const response = await client.request("/v1/test-only", {
    method: "POST",
    body: { ok: true },
  });
  assert.deepEqual(response, { stored: true });
});

test("denied or invalid API responses never appear successful", async () => {
  const config = {
    baseUrl: "https://api.cgn.example",
    getAccessToken: () => "test-token",
  };
  const denied = createCgnApiClient({
    ...config,
    fetchImpl: async () => ({ ok: false, status: 403 }),
  });
  await assert.rejects(denied.request("/v1/private"), {
    name: "CgnApiError",
    status: 403,
  });
  const invalid = createCgnApiClient({
    ...config,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: () => {
        throw new SyntaxError("invalid");
      },
    }),
  });
  await assert.rejects(invalid.request("/v1/test"), {
    name: "CgnApiError",
    code: "INVALID_JSON",
  });
  assert.equal(CgnApiError.name, "CgnApiError");
});
