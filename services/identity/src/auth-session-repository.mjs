import { Buffer } from "node:buffer";
import { decryptSecret, encryptSecret, sha256Hex } from "./auth-crypto.mjs";

function requireDatabase(database) {
  if (
    typeof database?.query !== "function" ||
    typeof database?.withTransaction !== "function"
  ) {
    throw new TypeError(
      "Identity auth repository requires query and withTransaction methods.",
    );
  }
  return database;
}

function requireEncryptionKey(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) {
    throw new TypeError(
      "Identity session encryption key must contain exactly 32 bytes.",
    );
  }
  return key;
}

export class IdentityAuthSessionRepository {
  constructor(database, encryptionKey) {
    this.database = requireDatabase(database);
    this.encryptionKey = requireEncryptionKey(encryptionKey);
  }

  async createLoginTransaction({
    state,
    browserBinding,
    nonce,
    codeVerifier,
    loginMethod,
    expiresAt,
  }) {
    await this.database.query(
      `INSERT INTO identity.oidc_login_transactions
        (state_hash, browser_binding_hash, nonce_ciphertext,
         code_verifier_ciphertext, login_method, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sha256Hex(state),
        sha256Hex(browserBinding),
        encryptSecret(nonce, this.encryptionKey),
        encryptSecret(codeVerifier, this.encryptionKey),
        loginMethod,
        expiresAt,
      ],
    );
  }

  async consumeLoginTransaction({ state, browserBinding, now = new Date() }) {
    const result = await this.database.query(
      `DELETE FROM identity.oidc_login_transactions
       WHERE state_hash = $1
         AND browser_binding_hash = $2
         AND expires_at > $3
       RETURNING nonce_ciphertext AS "nonceCiphertext",
                 code_verifier_ciphertext AS "codeVerifierCiphertext",
                 login_method AS "loginMethod", expires_at AS "expiresAt"`,
      [sha256Hex(state), sha256Hex(browserBinding), now],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      nonce: decryptSecret(row.nonceCiphertext, this.encryptionKey),
      codeVerifier: decryptSecret(
        row.codeVerifierCiphertext,
        this.encryptionKey,
      ),
      loginMethod: row.loginMethod,
      expiresAt: new Date(row.expiresAt).toISOString(),
    };
  }

  async createSession({
    sessionId,
    accountId,
    refreshToken,
    idToken,
    authenticatedAt,
    expiresAt,
  }) {
    await this.database.query(
      `INSERT INTO identity.auth_sessions
        (session_id_hash, account_id, refresh_token_ciphertext,
         id_token_ciphertext, authenticated_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sha256Hex(sessionId),
        accountId,
        encryptSecret(refreshToken, this.encryptionKey),
        encryptSecret(idToken, this.encryptionKey),
        authenticatedAt,
        expiresAt,
      ],
    );
  }

  async findSession({ sessionId, now = new Date() }) {
    const result = await this.database.query(
      `SELECT account_id AS "accountId",
              refresh_token_ciphertext AS "refreshTokenCiphertext",
              id_token_ciphertext AS "idTokenCiphertext",
              authenticated_at AS "authenticatedAt",
              expires_at AS "expiresAt"
       FROM identity.auth_sessions
       WHERE session_id_hash = $1 AND expires_at > $2`,
      [sha256Hex(sessionId), now],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      accountId: row.accountId,
      refreshToken: decryptSecret(
        row.refreshTokenCiphertext,
        this.encryptionKey,
      ),
      idToken: decryptSecret(row.idTokenCiphertext, this.encryptionKey),
      authenticatedAt: new Date(row.authenticatedAt).toISOString(),
      expiresAt: new Date(row.expiresAt).toISOString(),
    };
  }

  async rotateSession({
    oldSessionId,
    newSessionId,
    refreshToken,
    idToken,
    expiresAt,
  }) {
    return this.database.withTransaction(async (transaction) => {
      const result = await transaction.query(
        `UPDATE identity.auth_sessions
         SET session_id_hash = $2,
             refresh_token_ciphertext = $3,
             id_token_ciphertext = $4,
             expires_at = $5
         WHERE session_id_hash = $1 AND expires_at > now()
         RETURNING account_id AS "accountId",
                   authenticated_at AS "authenticatedAt"`,
        [
          sha256Hex(oldSessionId),
          sha256Hex(newSessionId),
          encryptSecret(refreshToken, this.encryptionKey),
          encryptSecret(idToken, this.encryptionKey),
          expiresAt,
        ],
      );
      const row = result.rows[0];
      if (!row) {
        return null;
      }
      return {
        accountId: row.accountId,
        authenticatedAt: new Date(row.authenticatedAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
      };
    });
  }

  async deleteSession(sessionId) {
    await this.database.query(
      "DELETE FROM identity.auth_sessions WHERE session_id_hash = $1",
      [sha256Hex(sessionId)],
    );
  }
}
