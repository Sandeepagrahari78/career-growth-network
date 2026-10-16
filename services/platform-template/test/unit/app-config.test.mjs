import assert from "node:assert/strict";
import test from "node:test";
import {
  ConfigurationError,
  loadAppConfig,
} from "../../dist/config/app-config.js";

test("configuration supplies a local development default", () => {
  assert.deepEqual(loadAppConfig({}), {
    port: 3000,
    environment: "development",
  });
});

test("configuration accepts a valid port and environment", () => {
  assert.deepEqual(loadAppConfig({ PORT: "4312", NODE_ENV: "test" }), {
    port: 4312,
    environment: "test",
  });
});

test("configuration rejects malformed, privileged, and out-of-range ports", () => {
  for (const PORT of ["0", "65536", "3.5", "3000x", ""]) {
    assert.throws(() => loadAppConfig({ PORT }), ConfigurationError);
  }
});

test("configuration rejects unsupported runtime environments", () => {
  assert.throws(
    () => loadAppConfig({ NODE_ENV: "production-like" }),
    ConfigurationError,
  );
});
