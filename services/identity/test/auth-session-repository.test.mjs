import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";
import { decryptSecret } from "../src/auth-crypto.mjs";
import { IdentityAuthSessionRepository } from "../src/auth-session-repository.mjs";

function makeDatabase() {
  const calls = [];
  const database = {
    calls,
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.startsWith("DELETE FROM identity.oidc_login_transactions")) {
        const [nonceCiphertext, codeVerifierCiphertext] = database.transaction;
        return {
          rows: [
            {
              nonceCiphertext,
              codeVerifierCiphertext,
              loginMethod: "google",
              expiresAt: new Date("2026-10-20T10:10:00.000Z"),
            },
          ],
        };
      }
      if (sql.startsWith("SELECT account_id")) {
        return {
          rows: [
            {
              accountId: "10000000-0000-4000-8000-000000000001",
              refreshTokenCiphertext: database.refreshTokenCiphertext,
              idTokenCiphertext: database.idTokenCiphertext,
              authenticatedAt: new Date("2026-10-20T10:00:00.000Z"),
              expiresAt: new Date("2026-10-20T18:00:00.000Z"),
            },
          ],
        };
      }
      return { rows: [] };
    },
    async withTransaction(callback) {
      return callback({ query: database.query.bind(database) });
    },
  };
  return database;
}

test("stores only digests and encrypted OIDC transaction secrets", async () => {
  const key = Buffer.alloc(32, 9);
  const database = makeDatabase();
  const repository = new IdentityAuthSessionRepository(database, key);
  await repository.createLoginTransaction({
    state: "opaque-state",
    browserBinding: "opaque-browser-binding",
    nonce: "opaque-nonce",
    codeVerifier: "opaque-pkce-verifier",
    loginMethod: "email_password",
    expiresAt: new Date("2026-10-20T10:10:00.000Z"),
  });
  const call = database.calls[0];
  assert.match(call.sql, /INSERT INTO identity\.oidc_login_transactions/);
  assert.notEqual(call.values[0], "opaque-state");
  assert.notEqual(call.values[1], "opaque-browser-binding");
  assert.notEqual(call.values[2], "opaque-nonce");
  assert.notEqual(call.values[3], "opaque-pkce-verifier");
  assert.equal(decryptSecret(call.values[2], key), "opaque-nonce");
  assert.equal(decryptSecret(call.values[3], key), "opaque-pkce-verifier");
});

test("consumes a one-time transaction using state and browser binding digests", async () => {
  const key = Buffer.alloc(32, 9);
  const database = makeDatabase();
  database.transaction = ["nonce-ciphertext", "verifier-ciphertext"];
  const repository = new IdentityAuthSessionRepository(database, key);
  database.transaction = [
    (await import("../src/auth-crypto.mjs")).encryptSecret("nonce", key),
    (await import("../src/auth-crypto.mjs")).encryptSecret("verifier", key),
  ];
  const transaction = await repository.consumeLoginTransaction({
    state: "state",
    browserBinding: "binding",
    now: new Date("2026-10-20T10:01:00.000Z"),
  });
  assert.equal(transaction.nonce, "nonce");
  assert.equal(transaction.codeVerifier, "verifier");
  const call = database.calls[0];
  assert.match(call.sql, /DELETE FROM identity\.oidc_login_transactions/);
  assert.match(call.sql, /expires_at > \$3/);
  assert.notEqual(call.values[0], "state");
  assert.notEqual(call.values[1], "binding");
});

test("encrypts credentials and returns token-free public session data", async () => {
  const key = Buffer.alloc(32, 9);
  const database = makeDatabase();
  const repository = new IdentityAuthSessionRepository(database, key);
  await repository.createSession({
    sessionId: "opaque-session-id",
    accountId: "10000000-0000-4000-8000-000000000001",
    refreshToken: "refresh-secret",
    idToken: "id-secret",
    authenticatedAt: new Date("2026-10-20T10:00:00.000Z"),
    expiresAt: new Date("2026-10-20T18:00:00.000Z"),
  });
  const insertion = database.calls.at(-1);
  assert.notEqual(insertion.values[0], "opaque-session-id");
  assert.notEqual(insertion.values[2], "refresh-secret");
  assert.notEqual(insertion.values[3], "id-secret");
  assert.equal(decryptSecret(insertion.values[2], key), "refresh-secret");
  assert.equal(decryptSecret(insertion.values[3], key), "id-secret");

  database.refreshTokenCiphertext = insertion.values[2];
  database.idTokenCiphertext = insertion.values[3];
  const session = await repository.findSession({
    sessionId: "opaque-session-id",
    now: new Date("2026-10-20T10:01:00.000Z"),
  });
  assert.equal(session.accountId, "10000000-0000-4000-8000-000000000001");
  assert.equal(session.refreshToken, "refresh-secret");
  assert.equal(session.idToken, "id-secret");
  assert.doesNotMatch(JSON.stringify(session), /sessionId/);
});
