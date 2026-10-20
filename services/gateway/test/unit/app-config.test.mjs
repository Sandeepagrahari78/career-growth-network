import assert from "node:assert/strict";
import test from "node:test";
import {
  ConfigurationError,
  loadAppConfig,
} from "../../dist/config/app-config.js";

test("configuration requires an owning Identity origin and defaults to no consumer routes", () => {
  assert.deepEqual(loadAppConfig({ IDENTITY_BASE_URL: "http://identity.test" }), {
    port: 3000,
    environment: "development",
    identityBaseUrl: "http://identity.test",
    identitySessionCookieName: "cgn_identity_session",
    upstreams: {},
  });
});

test("configuration parses a bounded upstream allowlist", () => {
  assert.deepEqual(
    loadAppConfig({
      PORT: "4312",
      NODE_ENV: "test",
      IDENTITY_BASE_URL: "http://identity.test:3000",
      CGN_IDENTITY_SESSION_COOKIE_NAME: "__Host-cgn_identity_session",
      CGN_GATEWAY_UPSTREAMS: JSON.stringify({ career: "http://career.test:3001" }),
    }),
    {
      port: 4312,
      environment: "test",
      identityBaseUrl: "http://identity.test:3000",
      identitySessionCookieName: "__Host-cgn_identity_session",
      upstreams: { career: "http://career.test:3001" },
    },
  );
});

test("configuration rejects invalid ports, environments and cookie names", () => {
  for (const PORT of ["0", "65536", "3.5", "3000x", ""]) {
    assert.throws(() => loadAppConfig({ PORT }), ConfigurationError);
  }
  assert.throws(
    () => loadAppConfig({ NODE_ENV: "production-like" }),
    ConfigurationError,
  );
  assert.throws(
    () => loadAppConfig({ CGN_IDENTITY_SESSION_COOKIE_NAME: "session" }),
    ConfigurationError,
  );
});

test("configuration rejects URL credentials, paths and malformed upstream maps", () => {
  for (const IDENTITY_BASE_URL of [
    "",
    "https://user:secret@identity.test",
    "https://identity.test/private",
    "file:///tmp/identity",
  ]) {
    assert.throws(
      () => loadAppConfig({ IDENTITY_BASE_URL }),
      ConfigurationError,
    );
  }
  for (const CGN_GATEWAY_UPSTREAMS of [
    "not-json",
    "[]",
    JSON.stringify({ "bad/name": "http://service.test" }),
    JSON.stringify({ service: "http://user:pass@service.test" }),
  ]) {
    assert.throws(
      () =>
        loadAppConfig({
          IDENTITY_BASE_URL: "http://identity.test",
          CGN_GATEWAY_UPSTREAMS,
        }),
      ConfigurationError,
    );
  }
});
