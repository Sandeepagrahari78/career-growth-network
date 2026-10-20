import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { URL } from "node:url";
import { createIdentityAuthHttpServer } from "../src/http-auth-server.mjs";
import { IdentityAuthError } from "../src/oidc-auth-service.mjs";

const SESSION = {
  contract: "cgn.identity.auth-session.v1",
  accountId: "9ad4af47-5f1c-459a-9cd1-cae65b960fc7",
  authenticatedAt: "2026-10-20T10:00:00.000Z",
  expiresAt: "2026-10-20T18:00:00.000Z",
};

function cookieValue(headers, name) {
  const lines = headers.getSetCookie?.() ?? [headers.get("set-cookie") ?? ""];
  const cookie = lines.findLast(
    (line) => line.startsWith(`${name}=`) && !/Max-Age=0(?:;|$)/.test(line),
  );
  return cookie?.slice(name.length + 1).split(";", 1)[0] ?? "";
}

async function startServer(t, authService, logger) {
  const config = {
    cookieSecure: true,
    loginTransactionLifetimeSeconds: 600,
    sessionLifetimeSeconds: 28_800,
    redirectUri: "https://identity.example.test/v1/identity/auth/callback",
  };
  const server = createIdentityAuthHttpServer({ authService, config, logger });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    fetch(path, options) {
      return fetch(new URL(path, `http://127.0.0.1:${address.port}`), {
        redirect: "manual",
        ...options,
      });
    },
  };
}

test("auth HTTP routes set protected cookies and return token-free session views", async (t) => {
  const calls = [];
  const successLogs = [];
  const authService = {
    async beginLogin(method) {
      calls.push(["beginLogin", method]);
      return {
        authorizationUrl:
          "https://keycloak.example.test/authorize?state=opaque",
        browserBinding: "browser-binding-value-with-at-least-32-bytes",
      };
    },
    async completeLogin({ callbackUrl, browserBinding }) {
      calls.push([
        "completeLogin",
        new URL(callbackUrl).searchParams.get("state"),
        browserBinding,
      ]);
      return {
        sessionId: "initial-session-identifier-with-more-than-32-bytes",
        accountCreated: true,
        session: SESSION,
      };
    },
    async getSession(sessionId) {
      calls.push(["getSession", sessionId]);
      return sessionId ? SESSION : null;
    },
    async refreshSession(sessionId) {
      calls.push(["refreshSession", sessionId]);
      return {
        sessionId: "rotated-session-identifier-with-more-than-32-bytes",
        session: SESSION,
      };
    },
    async logout(sessionId) {
      calls.push(["logout", sessionId]);
      return {
        logoutUrl: "https://keycloak.example.test/logout?client_id=cgn",
      };
    },
  };
  const { fetch: request } = await startServer(t, authService, {
    info(event, data) {
      successLogs.push({ event, data });
    },
  });

  const authorization = await request(
    "/v1/identity/auth/authorize?method=google",
  );
  assert.equal(authorization.status, 302);
  assert.equal(
    authorization.headers.get("location"),
    "https://keycloak.example.test/authorize?state=opaque",
  );
  const bindingName = "__Host-cgn_oidc_binding";
  const bindingCookie = cookieValue(authorization.headers, bindingName);
  assert.equal(bindingCookie, "browser-binding-value-with-at-least-32-bytes");
  assert.match(authorization.headers.get("set-cookie"), /HttpOnly/);
  assert.match(authorization.headers.get("set-cookie"), /Secure/);
  assert.match(authorization.headers.get("set-cookie"), /SameSite=Lax/);
  assert.match(authorization.headers.get("set-cookie"), /Path=\//);
  assert.match(authorization.headers.get("cache-control"), /no-store/);

  const callback = await request(
    "/v1/identity/auth/callback?code=one-time&state=opaque",
    {
      headers: { cookie: `${bindingName}=${bindingCookie}` },
    },
  );
  assert.equal(callback.status, 200);
  const callbackBody = await callback.json();
  assert.deepEqual(callbackBody, { session: SESSION });
  assert.doesNotMatch(
    JSON.stringify(callbackBody),
    /access_token|refresh_token|id_token/i,
  );
  assert.equal(calls[1][1], "opaque");
  assert.equal(calls[1][2], bindingCookie);
  const sessionName = "__Host-cgn_identity_session";
  const sessionCookie = cookieValue(callback.headers, sessionName);
  assert.equal(
    sessionCookie,
    "initial-session-identifier-with-more-than-32-bytes",
  );
  assert.match(
    callback.headers
      .getSetCookie()
      .find((line) => line.startsWith(`${bindingName}=`)),
    /Max-Age=0/,
  );

  const session = await request("/v1/identity/auth/session", {
    headers: { cookie: `${sessionName}=${sessionCookie}` },
  });
  assert.equal(session.status, 200);
  assert.deepEqual(await session.json(), { session: SESSION });
  const unauthenticated = await request("/v1/identity/auth/session");
  assert.equal(unauthenticated.status, 401);
  assert.match(
    (await unauthenticated.json()).error.message,
    /Sign-in is required/,
  );
  const ambiguousCookies = await request("/v1/identity/auth/session", {
    headers: {
      cookie: `${sessionName}=${sessionCookie}; ${sessionName}=another-session-id`,
    },
  });
  assert.equal(ambiguousCookies.status, 401);

  const refreshed = await request("/v1/identity/auth/refresh", {
    method: "POST",
    headers: { cookie: `${sessionName}=${sessionCookie}` },
  });
  assert.equal(refreshed.status, 200);
  assert.deepEqual(await refreshed.json(), { session: SESSION });
  assert.equal(
    cookieValue(refreshed.headers, sessionName),
    "rotated-session-identifier-with-more-than-32-bytes",
  );

  const loggedOut = await request("/v1/identity/auth/logout", {
    method: "POST",
    headers: {
      cookie: `${sessionName}=${cookieValue(refreshed.headers, sessionName)}`,
    },
  });
  assert.equal(loggedOut.status, 303);
  assert.match(
    loggedOut.headers.get("location"),
    /^https:\/\/keycloak\.example\.test\/logout/,
  );
  assert.ok(
    loggedOut.headers.getSetCookie().every((line) => /Max-Age=0/.test(line)),
  );
  assert.deepEqual(
    calls.slice(-3).map(([name]) => name),
    ["getSession", "refreshSession", "logout"],
  );
  assert.deepEqual(
    successLogs.map(({ event }) => event),
    [
      "identity_account_created",
      "identity_auth_login_completed",
      "identity_auth_session_refreshed",
      "identity_auth_logout_completed",
    ],
  );
  assert.ok(
    successLogs.every(
      ({ data }) => !JSON.stringify(data).match(/token|cookie|email|subject/i),
    ),
  );
});

test("auth HTTP errors are safe and diagnostics never include callback credentials", async (t) => {
  const logs = [];
  const authService = {
    async beginLogin() {
      throw new IdentityAuthError("identity_provider_unavailable", 503, {
        cause: new Error("provider token leaked"),
      });
    },
    async completeLogin() {
      throw new IdentityAuthError("identity_provider_rejected_login", 401, {
        cause: new Error("sensitive callback leaked"),
      });
    },
    async getSession() {
      return null;
    },
    async refreshSession() {
      throw new Error("refresh token leaked");
    },
    async logout() {
      return { logoutUrl: null };
    },
  };
  const { fetch: request } = await startServer(t, authService, {
    error(event, data) {
      logs.push({ event, data });
    },
  });

  const unavailable = await request(
    "/v1/identity/auth/authorize?method=email_password",
  );
  assert.equal(unavailable.status, 503);
  const unavailableBody = await unavailable.text();
  assert.doesNotMatch(unavailableBody, /provider token leaked|stack/i);
  assert.match(unavailableBody, /Sign-in is temporarily unavailable/);

  const rejected = await request(
    "/v1/identity/auth/callback?code=private-code&state=private-state",
    {
      headers: { cookie: "__Host-cgn_oidc_binding=private-binding" },
    },
  );
  assert.equal(rejected.status, 401);
  const rejectedBody = await rejected.text();
  assert.doesNotMatch(
    rejectedBody,
    /private-code|private-state|private-binding|sensitive callback leaked/,
  );
  assert.equal(logs.length, 2);
  assert.ok(
    logs.every(
      ({ data }) => !JSON.stringify(data).match(/private|leaked|token/i),
    ),
  );
});
