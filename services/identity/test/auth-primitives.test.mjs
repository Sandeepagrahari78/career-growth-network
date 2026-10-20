import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";
import {
  decryptSecret,
  encryptSecret,
  sha256Hex,
} from "../src/auth-crypto.mjs";
import {
  IdentityAuthConfigurationError,
  loadIdentityOidcConfig,
} from "../src/oidc-config.mjs";

function environment(overrides = {}) {
  return {
    NODE_ENV: "test",
    CGN_IDENTITY_OIDC_ISSUER: "http://127.0.0.1:18080/realms/cgn-local",
    CGN_IDENTITY_OIDC_CLIENT_ID: "cgn-identity",
    CGN_IDENTITY_OIDC_REDIRECT_URI:
      "http://127.0.0.1:3000/v1/identity/auth/callback",
    CGN_IDENTITY_OIDC_POST_LOGOUT_REDIRECT_URI: "http://127.0.0.1:3000/",
    CGN_IDENTITY_SESSION_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    ...overrides,
  };
}

test("loads a generic OIDC issuer config without exposing secret values", () => {
  const config = loadIdentityOidcConfig(
    environment({
      CGN_IDENTITY_OIDC_CLIENT_AUTHENTICATION: "none",
    }),
  );
  assert.equal(config.contract, "cgn.identity.oidc-provider-config.v1");
  assert.equal(config.clientAuthentication, "none");
  assert.equal(config.clientSecret, undefined);
  assert.equal(config.googleBrokerAlias, "google");
  assert.equal(config.googleBrokerHintParameter, "kc_idp_hint");
  assert.equal(config.cookieSecure, false);
});

test("requires environment secrets for confidential production clients", () => {
  assert.throws(
    () =>
      loadIdentityOidcConfig(
        environment({
          NODE_ENV: "production",
          CGN_IDENTITY_OIDC_ISSUER: "https://login.example.test/realms/cgn",
          CGN_IDENTITY_OIDC_REDIRECT_URI:
            "https://api.example.test/v1/identity/auth/callback",
          CGN_IDENTITY_OIDC_POST_LOGOUT_REDIRECT_URI:
            "https://app.example.test/",
          CGN_IDENTITY_OIDC_CLIENT_AUTHENTICATION: "client_secret_basic",
        }),
      ),
    IdentityAuthConfigurationError,
  );

  const config = loadIdentityOidcConfig(
    environment({
      NODE_ENV: "production",
      CGN_IDENTITY_OIDC_ISSUER: "https://login.example.test/realms/cgn",
      CGN_IDENTITY_OIDC_REDIRECT_URI:
        "https://api.example.test/v1/identity/auth/callback",
      CGN_IDENTITY_OIDC_POST_LOGOUT_REDIRECT_URI: "https://app.example.test/",
      CGN_IDENTITY_OIDC_CLIENT_AUTHENTICATION: "client_secret_basic",
      CGN_IDENTITY_OIDC_CLIENT_SECRET: "local-test-secret-only",
    }),
  );
  assert.equal(config.clientSecret, "local-test-secret-only");
  assert.equal(config.cookieSecure, true);
});

test("rejects unsafe redirect URIs and weak or malformed encryption keys", () => {
  assert.throws(
    () =>
      loadIdentityOidcConfig(
        environment({
          CGN_IDENTITY_GOOGLE_BROKER_HINT_PARAMETER: "bad hint&redirect_uri",
        }),
      ),
    IdentityAuthConfigurationError,
  );
  assert.throws(
    () =>
      loadIdentityOidcConfig(
        environment({
          CGN_IDENTITY_OIDC_ISSUER: "http://login.example.test/realms/cgn",
        }),
      ),
    IdentityAuthConfigurationError,
  );
  assert.throws(
    () =>
      loadIdentityOidcConfig(
        environment({
          NODE_ENV: "production",
          CGN_IDENTITY_OIDC_ISSUER: "http://127.0.0.1:18080/realms/cgn",
          CGN_IDENTITY_OIDC_REDIRECT_URI:
            "http://127.0.0.1:3000/v1/identity/auth/callback",
          CGN_IDENTITY_OIDC_POST_LOGOUT_REDIRECT_URI: "http://127.0.0.1:3000/",
          CGN_IDENTITY_OIDC_CLIENT_AUTHENTICATION: "client_secret_basic",
          CGN_IDENTITY_OIDC_CLIENT_SECRET: "local-test-secret-only",
        }),
      ),
    IdentityAuthConfigurationError,
  );
  assert.throws(
    () =>
      loadIdentityOidcConfig(
        environment({
          CGN_IDENTITY_OIDC_REDIRECT_URI:
            "http://attacker.example/v1/identity/auth/callback",
          NODE_ENV: "production",
        }),
      ),
    IdentityAuthConfigurationError,
  );
  assert.throws(
    () =>
      loadIdentityOidcConfig(
        environment({ CGN_IDENTITY_SESSION_ENCRYPTION_KEY: "too-short" }),
      ),
    IdentityAuthConfigurationError,
  );
  assert.throws(
    () =>
      loadIdentityOidcConfig(
        environment({
          CGN_IDENTITY_OIDC_REDIRECT_URI:
            "http://127.0.0.1:3000/callback?next=https://attacker.example",
        }),
      ),
    IdentityAuthConfigurationError,
  );
});

test("encrypts refresh and ID tokens with authenticated AES-GCM ciphertext", () => {
  const key = Buffer.alloc(32, 4);
  const ciphertext = encryptSecret("refresh-secret-value", key);
  assert.ok(ciphertext.startsWith("v1."));
  assert.doesNotMatch(ciphertext, /refresh-secret-value/);
  assert.equal(decryptSecret(ciphertext, key), "refresh-secret-value");
  const [version, iv, tag, encryptedValue] = ciphertext.split(".");
  const shortTag = Buffer.from(tag, "base64url")
    .subarray(0, 12)
    .toString("base64url");
  assert.throws(
    () => decryptSecret([version, iv, shortTag, encryptedValue].join("."), key),
    /unsupported format/,
  );
  const shortIv = Buffer.from(iv, "base64url")
    .subarray(0, 8)
    .toString("base64url");
  assert.throws(
    () => decryptSecret([version, shortIv, tag, encryptedValue].join("."), key),
    /unsupported format/,
  );
  assert.throws(() => decryptSecret(ciphertext.slice(0, -2) + "aa", key));
  assert.equal(encryptSecret(null, key), null);
  assert.equal(decryptSecret(null, key), null);
});

test("uses a deterministic digest only for lookup keys", () => {
  assert.equal(
    sha256Hex("opaque-state"),
    "9092e69f5d988789c2e84fa61df3ded5217031ee6707982b9920685de7e7d75f",
  );
});
