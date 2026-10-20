import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash, generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { URL, URLSearchParams } from "node:url";
import { IdentityOidcAuthService } from "../../src/oidc-auth-service.mjs";

const CLIENT_ID = "cgn-identity-test";

function json(response, status, value) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json",
  });
  response.end(JSON.stringify(value));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function makeSigningKey(kid) {
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = pair.publicKey.export({ format: "jwk" });
  jwk.kid = kid;
  jwk.alg = "RS256";
  jwk.use = "sig";
  return { ...pair, jwk, kid };
}

function signIdToken(claims, signingKey) {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", kid: signingKey.kid, typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(signingInput),
    signingKey.privateKey,
  ).toString("base64url");
  return `${signingInput}.${signature}`;
}

async function createMockProvider() {
  const state = {
    keys: [makeSigningKey("key-1")],
    currentKeyIndex: 0,
    codes: new Map(),
    refreshTokens: new Map(),
    jwksRequests: 0,
    unavailableDiscovery: false,
    unavailableTokenEndpoint: false,
  };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", state.issuer ?? "http://127.0.0.1");
    if (
      request.method === "GET" &&
      url.pathname.endsWith("/.well-known/openid-configuration")
    ) {
      if (state.unavailableDiscovery) {
        json(response, 503, { error: "temporarily_unavailable" });
        return;
      }
      json(response, 200, {
        issuer: state.issuer,
        authorization_endpoint: `${state.issuer}/authorize`,
        token_endpoint: `${state.issuer}/token`,
        jwks_uri: `${state.issuer}/jwks`,
        end_session_endpoint: `${state.issuer}/logout`,
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
        token_endpoint_auth_methods_supported: ["none"],
        code_challenge_methods_supported: ["S256"],
      });
      return;
    }
    if (request.method === "GET" && url.pathname.endsWith("/jwks")) {
      state.jwksRequests += 1;
      json(response, 200, {
        keys: [state.keys[state.currentKeyIndex].jwk],
      });
      return;
    }
    if (request.method === "POST" && url.pathname.endsWith("/token")) {
      if (state.unavailableTokenEndpoint) {
        json(response, 503, { error: "temporarily_unavailable" });
        return;
      }
      const form = new URLSearchParams(await readBody(request));
      if (form.get("grant_type") === "authorization_code") {
        const pending = state.codes.get(form.get("code"));
        if (
          !pending ||
          form.get("client_id") !== CLIENT_ID ||
          form.get("redirect_uri") !== pending.redirectUri ||
          createHash("sha256")
            .update(form.get("code_verifier") ?? "")
            .digest("base64url") !== pending.codeChallenge
        ) {
          json(response, 400, { error: "invalid_grant" });
          return;
        }
        state.codes.delete(form.get("code"));
        const now = Math.floor(Date.now() / 1000);
        const claims = {
          iss: state.issuer,
          aud: CLIENT_ID,
          sub: pending.subject ?? "subject-default",
          email: pending.email ?? "user@example.test",
          email_verified: pending.emailVerified ?? false,
          iat: now,
          exp: pending.exp ?? now + 86_400,
          nonce: pending.nonce,
          ...(pending.claimOverrides ?? {}),
        };
        const signingKey =
          pending.signingKeyOverride ?? state.keys[state.currentKeyIndex];
        const idToken = signIdToken(claims, signingKey);
        const refreshToken = `refresh-${randomUUID()}`;
        state.refreshTokens.set(refreshToken, { subject: claims.sub });
        json(response, 200, {
          access_token: `access-${randomUUID()}`,
          refresh_token: refreshToken,
          id_token: idToken,
          token_type: "Bearer",
          expires_in: 300,
        });
        return;
      }
      if (form.get("grant_type") === "refresh_token") {
        const current = state.refreshTokens.get(form.get("refresh_token"));
        if (!current) {
          json(response, 400, { error: "invalid_grant" });
          return;
        }
        state.refreshTokens.delete(form.get("refresh_token"));
        const refreshToken = `refresh-${randomUUID()}`;
        state.refreshTokens.set(refreshToken, current);
        json(response, 200, {
          access_token: `access-${randomUUID()}`,
          refresh_token: refreshToken,
          token_type: "Bearer",
          expires_in: 300,
        });
        return;
      }
      json(response, 400, { error: "unsupported_grant_type" });
      return;
    }
    if (request.method === "GET" && url.pathname.endsWith("/logout")) {
      response.writeHead(204);
      response.end();
      return;
    }
    response.writeHead(404);
    response.end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  state.issuer = `http://127.0.0.1:${address.port}/realms/cgn-local`;
  state.redirectUri = `http://127.0.0.1:${address.port}/app/callback`;
  state.postLogoutRedirectUri = `http://127.0.0.1:${address.port}/app/signed-out`;
  state.stop = () =>
    new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  state.createCallback = (authorizationUrl, overrides = {}) => {
    const authorization = new URL(authorizationUrl);
    const code = randomUUID();
    state.codes.set(code, {
      nonce: overrides.nonce ?? authorization.searchParams.get("nonce"),
      codeChallenge: authorization.searchParams.get("code_challenge"),
      redirectUri: authorization.searchParams.get("redirect_uri"),
      subject: overrides.subject,
      email: overrides.email,
      emailVerified: overrides.emailVerified,
      exp: overrides.exp,
      claimOverrides: overrides.claimOverrides,
      signingKeyOverride: overrides.signingKeyOverride,
    });
    const callback = new URL(state.redirectUri);
    callback.searchParams.set("code", code);
    callback.searchParams.set("state", authorization.searchParams.get("state"));
    callback.searchParams.set("iss", state.issuer);
    return callback.href;
  };
  state.rotateKey = () => {
    state.keys.push(makeSigningKey(`key-${state.keys.length + 1}`));
    state.currentKeyIndex = state.keys.length - 1;
  };
  return state;
}

function createMemoryRepository(now = () => new Date()) {
  const transactions = new Map();
  const sessions = new Map();
  return {
    transactions,
    sessions,
    async createLoginTransaction(transaction) {
      transactions.set(transaction.state, { ...transaction });
    },
    async consumeLoginTransaction({ state, browserBinding, now }) {
      const transaction = transactions.get(state);
      if (
        !transaction ||
        transaction.browserBinding !== browserBinding ||
        new Date(transaction.expiresAt) <= now
      ) {
        return null;
      }
      transactions.delete(state);
      return transaction;
    },
    async createSession(session) {
      sessions.set(session.sessionId, { ...session });
    },
    async findSession({ sessionId, now }) {
      const session = sessions.get(sessionId);
      if (!session || new Date(session.expiresAt) <= now) {
        return null;
      }
      return { ...session };
    },
    async rotateSession({
      oldSessionId,
      newSessionId,
      refreshToken,
      idToken,
      expiresAt,
    }) {
      const session = sessions.get(oldSessionId);
      if (!session || new Date(session.expiresAt) <= now()) {
        return null;
      }
      sessions.delete(oldSessionId);
      const rotated = {
        ...session,
        sessionId: newSessionId,
        refreshToken,
        idToken,
        expiresAt,
      };
      sessions.set(newSessionId, rotated);
      return {
        accountId: rotated.accountId,
        authenticatedAt: rotated.authenticatedAt,
        expiresAt,
      };
    },
    async deleteSession(sessionId) {
      sessions.delete(sessionId);
    },
  };
}

function createMemoryAccountRepository() {
  const accounts = new Map();
  return {
    accounts,
    async findAccountByProviderSubject({ issuer, subject }) {
      return accounts.get(`${issuer}\0${subject}`) ?? null;
    },
    async createAccountForProvider({ issuer, subject }) {
      const key = `${issuer}\0${subject}`;
      const account = {
        contract: "cgn.identity.account.v1",
        accountId: randomUUID(),
        createdAt: new Date().toISOString(),
      };
      accounts.set(key, account);
      return account;
    },
  };
}

function makeService(provider, options = {}) {
  let clock = new Date("2026-10-20T10:00:00.000Z");
  const repository = options.repository ?? createMemoryRepository(() => new Date(clock));
  const accounts = options.accounts ?? createMemoryAccountRepository();
  const roleAssignments = options.roleAssignments ?? new Map();
  const roleRepository = {
    async listRoleAssignments(accountId) {
      return roleAssignments.get(accountId) ?? [];
    },
  };
  const config = {
    issuer: provider.issuer,
    clientId: CLIENT_ID,
    clientAuthentication: "none",
    redirectUri: provider.redirectUri,
    postLogoutRedirectUri: provider.postLogoutRedirectUri,
    clientSecret: undefined,
    googleBrokerAlias: "google",
    googleBrokerHintParameter: "kc_idp_hint",
    encryptionKey: Buffer.alloc(32, 5),
    cookieSecure: false,
    sessionLifetimeSeconds: 28_800,
    loginTransactionLifetimeSeconds: 600,
    environment: "test",
  };
  return {
    repository,
    accounts,
    roleAssignments,
    config,
    setNow(value) {
      clock = new Date(value);
    },
    service: new IdentityOidcAuthService({
      config,
      transactionAndSessionRepository: repository,
      accountRepository: accounts,
      roleRepository,
      now: () => new Date(clock),
    }),
  };
}

test("email and password use authorization-code PKCE and produce a token-free Identity session", async (t) => {
  const provider = await createMockProvider();
  t.after(provider.stop);
  const fixture = makeService(provider);
  const start = await fixture.service.beginLogin("email_password");
  const authorization = new URL(start.authorizationUrl);
  assert.equal(authorization.searchParams.get("response_type"), "code");
  assert.equal(authorization.searchParams.get("code_challenge_method"), "S256");
  assert.match(
    authorization.searchParams.get("code_challenge"),
    /^[A-Za-z0-9_-]{43}$/,
  );
  assert.equal(authorization.searchParams.has("kc_idp_hint"), false);

  const callbackUrl = provider.createCallback(start.authorizationUrl, {
    subject: "keycloak-user-1",
    email: "person@example.test",
  });
  const result = await fixture.service.completeLogin({
    callbackUrl,
    browserBinding: start.browserBinding,
  });

  assert.equal(result.session.contract, "cgn.identity.auth-session.v1");
  assert.match(
    result.session.accountId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  assert.equal(result.session.authenticatedAt, "2026-10-20T10:00:00.000Z");
  assert.equal(result.session.expiresAt, "2026-10-20T18:00:00.000Z");
  assert.equal(result.session.email, undefined);
  assert.equal(fixture.repository.sessions.size, 1);
  assert.doesNotMatch(JSON.stringify(result), /access-|refresh-|id_token/i);
  assert.equal(
    (await fixture.service.getSession(result.sessionId)).accountId,
    result.session.accountId,
  );
});

test("authorization context uses Identity grants and ignores provider role claims", async (t) => {
  const provider = await createMockProvider();
  t.after(provider.stop);
  const fixture = makeService(provider);
  const start = await fixture.service.beginLogin("email_password");
  const callbackUrl = provider.createCallback(start.authorizationUrl, {
    subject: "identity-role-test-subject",
    claimOverrides: { roles: ["admin"], role: "admin" },
  });
  const login = await fixture.service.completeLogin({
    callbackUrl,
    browserBinding: start.browserBinding,
  });

  assert.deepEqual(
    await fixture.service.getAuthorizationContext(login.sessionId),
    {
      contract: "cgn.identity.authorization-context.v1",
      accountId: login.session.accountId,
      evaluatedAt: "2026-10-20T10:00:00.000Z",
      roles: [],
    },
  );

  fixture.roleAssignments.set(login.session.accountId, [
    { role: "student", status: "active" },
    { role: "admin", status: "inactive" },
  ]);
  assert.deepEqual(
    (await fixture.service.getAuthorizationContext(login.sessionId)).roles,
    ["student"],
  );

  fixture.roleAssignments.set(login.session.accountId, [
    { role: "student", status: "inactive" },
  ]);
  assert.deepEqual(
    (await fixture.service.getAuthorizationContext(login.sessionId)).roles,
    [],
  );
});

test("Google is routed through the configured broker and matching email never merges subjects", async (t) => {
  const provider = await createMockProvider();
  t.after(provider.stop);
  const fixture = makeService(provider);
  const googleStart = await fixture.service.beginLogin("google");
  const googleAuthorization = new URL(googleStart.authorizationUrl);
  assert.equal(googleAuthorization.searchParams.get("kc_idp_hint"), "google");
  const first = await fixture.service.completeLogin({
    callbackUrl: provider.createCallback(googleStart.authorizationUrl, {
      subject: "keycloak-subject-a",
      email: "same@example.test",
      emailVerified: true,
    }),
    browserBinding: googleStart.browserBinding,
  });

  const secondStart = await fixture.service.beginLogin("email_password");
  const second = await fixture.service.completeLogin({
    callbackUrl: provider.createCallback(secondStart.authorizationUrl, {
      subject: "keycloak-subject-b",
      email: "same@example.test",
      emailVerified: true,
    }),
    browserBinding: secondStart.browserBinding,
  });

  assert.notEqual(first.session.accountId, second.session.accountId);
  assert.equal(fixture.accounts.accounts.size, 2);
});

test("state and browser binding are both required and transactions are one-use", async (t) => {
  const provider = await createMockProvider();
  t.after(provider.stop);
  const fixture = makeService(provider);
  const start = await fixture.service.beginLogin("email_password");
  const callback = provider.createCallback(start.authorizationUrl);
  await assert.rejects(
    fixture.service.completeLogin({
      callbackUrl: callback,
      browserBinding: "another-browser-binding-value",
    }),
    { code: "invalid_state" },
  );
  await fixture.service.completeLogin({
    callbackUrl: callback,
    browserBinding: start.browserBinding,
  });
  await assert.rejects(
    fixture.service.completeLogin({
      callbackUrl: callback,
      browserBinding: start.browserBinding,
    }),
    { code: "invalid_state" },
  );
});

test("rejects issuer, audience, expiry, signature and nonce failures", async (t) => {
  const provider = await createMockProvider();
  t.after(provider.stop);
  const wrongKey = makeSigningKey("key-1");
  const invalidCases = [
    { name: "issuer", claimOverrides: { iss: "http://attacker.test" } },
    { name: "audience", claimOverrides: { aud: "different-client" } },
    {
      name: "expired",
      exp: Math.floor(Date.now() / 1000) - 3_600,
      expectedCode: "invalid_identity_token",
    },
    { name: "signature", signingKeyOverride: wrongKey },
    { name: "nonce", nonce: "wrong-nonce" },
  ];
  for (const invalidCase of invalidCases) {
    const fixture = makeService(provider);
    const start = await fixture.service.beginLogin("email_password");
    await assert.rejects(
      fixture.service.completeLogin({
        callbackUrl: provider.createCallback(
          start.authorizationUrl,
          invalidCase,
        ),
        browserBinding: start.browserBinding,
      }),
      { code: invalidCase.expectedCode ?? "identity_provider_rejected_login" },
      invalidCase.name,
    );
    assert.equal(fixture.accounts.accounts.size, 0, invalidCase.name);
    assert.equal(fixture.repository.sessions.size, 0, invalidCase.name);
  }
});

test("discovers and accepts a newly rotated JWKS signing key", async (t) => {
  const provider = await createMockProvider();
  t.after(provider.stop);
  const fixture = makeService(provider);
  const first = await fixture.service.beginLogin("email_password");
  await fixture.service.completeLogin({
    callbackUrl: provider.createCallback(first.authorizationUrl, {
      subject: "rotation-user-1",
    }),
    browserBinding: first.browserBinding,
  });
  const previousJwksReads = provider.jwksRequests;

  provider.rotateKey();
  const restarted = makeService(provider, {
    repository: fixture.repository,
    accounts: fixture.accounts,
  });
  const second = await restarted.service.beginLogin("email_password");
  const result = await restarted.service.completeLogin({
    callbackUrl: provider.createCallback(second.authorizationUrl, {
      subject: "rotation-user-2",
    }),
    browserBinding: second.browserBinding,
  });

  assert.ok(provider.jwksRequests > previousJwksReads);
  assert.equal(fixture.accounts.accounts.size, 2);
  assert.ok(result.session.accountId);
});

test("refresh rotates session identifiers, expiry invalidates sessions, and logout clears local state", async (t) => {
  const provider = await createMockProvider();
  t.after(provider.stop);
  const fixture = makeService(provider);
  const start = await fixture.service.beginLogin("email_password");
  const login = await fixture.service.completeLogin({
    callbackUrl: provider.createCallback(start.authorizationUrl, {
      subject: "refresh-user",
    }),
    browserBinding: start.browserBinding,
  });

  const refreshed = await fixture.service.refreshSession(login.sessionId);
  assert.notEqual(refreshed.sessionId, login.sessionId);
  assert.equal(await fixture.service.getSession(login.sessionId), null);
  assert.equal(
    (await fixture.service.getSession(refreshed.sessionId)).accountId,
    login.session.accountId,
  );

  const logout = await fixture.service.logout(refreshed.sessionId);
  assert.equal(new URL(logout.logoutUrl).pathname, "/realms/cgn-local/logout");
  assert.ok(new URL(logout.logoutUrl).searchParams.get("id_token_hint"));
  assert.equal(await fixture.service.getSession(refreshed.sessionId), null);

  const expiryFixture = makeService(provider);
  const expiryStart = await expiryFixture.service.beginLogin("email_password");
  const expiryLogin = await expiryFixture.service.completeLogin({
    callbackUrl: provider.createCallback(expiryStart.authorizationUrl, {
      subject: "expiry-user",
    }),
    browserBinding: expiryStart.browserBinding,
  });
  expiryFixture.setNow("2026-10-20T18:00:01.000Z");
  assert.equal(
    await expiryFixture.service.getSession(expiryLogin.sessionId),
    null,
  );
  await assert.rejects(
    expiryFixture.service.refreshSession(expiryLogin.sessionId),
    { code: "session_expired" },
  );
});

test("provider outages produce safe errors and keep an existing session available", async (t) => {
  const provider = await createMockProvider();
  t.after(provider.stop);
  const fixture = makeService(provider);
  const start = await fixture.service.beginLogin("email_password");
  const login = await fixture.service.completeLogin({
    callbackUrl: provider.createCallback(start.authorizationUrl),
    browserBinding: start.browserBinding,
  });

  provider.unavailableTokenEndpoint = true;
  await assert.rejects(fixture.service.refreshSession(login.sessionId), {
    code: "identity_provider_unavailable",
    statusCode: 503,
  });
  assert.ok(await fixture.service.getSession(login.sessionId));

  provider.unavailableDiscovery = true;
  const unavailableProvider = await createMockProvider();
  t.after(unavailableProvider.stop);
  unavailableProvider.unavailableDiscovery = true;
  const unavailable = makeService(unavailableProvider);
  await assert.rejects(unavailable.service.beginLogin("email_password"), {
    code: "identity_provider_unavailable",
    statusCode: 503,
  });
});
