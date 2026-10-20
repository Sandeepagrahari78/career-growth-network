import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";
import { createIdentityAuthRuntime } from "../src/identity-auth-runtime.mjs";

test("composes OIDC, account and durable session repositories behind Identity HTTP", async () => {
  const database = {
    async query() {
      return { rows: [] };
    },
    async withTransaction(callback) {
      return callback({ query: this.query.bind(this) });
    },
  };
  const environment = {
    NODE_ENV: "test",
    CGN_IDENTITY_OIDC_ISSUER: "http://127.0.0.1:18080/realms/cgn-local",
    CGN_IDENTITY_OIDC_CLIENT_ID: "cgn-identity",
    CGN_IDENTITY_OIDC_REDIRECT_URI:
      "http://127.0.0.1:3000/v1/identity/auth/callback",
    CGN_IDENTITY_OIDC_POST_LOGOUT_REDIRECT_URI: "http://127.0.0.1:3000/",
    CGN_IDENTITY_SESSION_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString("base64"),
  };
  const { server } = createIdentityAuthRuntime({
    database,
    environment,
    clientFactory: async () => ({}),
  });

  assert.equal(typeof server.listen, "function");
});
