import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  buildEndSessionUrl,
  calculatePKCECodeChallenge,
  ClientSecretBasic,
  discovery,
  enableNonRepudiationChecks,
  None,
  allowInsecureRequests,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
  refreshTokenGrant,
} from "openid-client";
import { randomBytes } from "node:crypto";
import { URL } from "node:url";
import { IDENTITY_AUTH_SESSION_CONTRACT } from "./identity-auth-contract.mjs";
import { createAuthorizationContext } from "./application-authorization.mjs";

const LOGIN_METHODS = new Set(["email_password", "google"]);

export class IdentityAuthError extends Error {
  constructor(code, statusCode = 401, options = {}) {
    super(code, options);
    this.name = "IdentityAuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function sessionView({ accountId, authenticatedAt, expiresAt }) {
  return {
    contract: IDENTITY_AUTH_SESSION_CONTRACT,
    accountId,
    authenticatedAt: new Date(authenticatedAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

function assertCallbackUrl(value, configuredRedirectUri) {
  let actual;
  try {
    actual = new URL(value);
  } catch {
    throw new IdentityAuthError("invalid_callback");
  }
  const expected = new URL(configuredRedirectUri);
  if (
    actual.origin !== expected.origin ||
    actual.pathname !== expected.pathname ||
    actual.username ||
    actual.password ||
    actual.hash
  ) {
    throw new IdentityAuthError("invalid_callback");
  }
  if (actual.searchParams.getAll("state").length !== 1) {
    throw new IdentityAuthError("invalid_state");
  }
  return actual;
}

function validateIdTokenClaims(claims, { issuer, clientId, now }) {
  const audiences = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (
    claims?.iss !== issuer ||
    !audiences.includes(clientId) ||
    (audiences.length > 1 && claims.azp !== clientId) ||
    (claims?.azp !== undefined && claims.azp !== clientId) ||
    typeof claims.exp !== "number" ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= Math.floor(now.getTime() / 1000) ||
    typeof claims.sub !== "string" ||
    claims.sub.length === 0
  ) {
    throw new IdentityAuthError("invalid_identity_token");
  }
}

function isInvalidRefreshToken(error) {
  return (
    error?.code === "invalid_grant" ||
    error?.error === "invalid_grant" ||
    error?.cause?.error === "invalid_grant"
  );
}

export class IdentityOidcAuthService {
  constructor({
    config,
    transactionAndSessionRepository,
    accountRepository,
    roleRepository,
    now = () => new Date(),
    clientFactory,
  }) {
    if (
      typeof transactionAndSessionRepository?.createLoginTransaction !==
        "function" ||
      typeof transactionAndSessionRepository?.consumeLoginTransaction !==
        "function" ||
      typeof transactionAndSessionRepository?.createSession !== "function" ||
      typeof transactionAndSessionRepository?.findSession !== "function" ||
      typeof transactionAndSessionRepository?.rotateSession !== "function" ||
      typeof transactionAndSessionRepository?.deleteSession !== "function"
    ) {
      throw new TypeError(
        "Identity auth requires a durable session repository.",
      );
    }
    if (
      typeof accountRepository?.findAccountByProviderSubject !== "function" ||
      typeof accountRepository?.createAccountForProvider !== "function"
    ) {
      throw new TypeError(
        "Identity auth requires the Identity account repository.",
      );
    }
    if (typeof roleRepository?.listRoleAssignments !== "function") {
      throw new TypeError(
        "Identity auth requires the Identity application-role repository.",
      );
    }
    this.config = config;
    this.repository = transactionAndSessionRepository;
    this.accountRepository = accountRepository;
    this.roleRepository = roleRepository;
    this.now = now;
    this.clientFactory =
      clientFactory ??
      (async () => {
        const metadata = config.clientSecret
          ? { token_endpoint_auth_method: "client_secret_basic" }
          : { token_endpoint_auth_method: "none" };
        const client = await discovery(
          new URL(config.issuer),
          config.clientId,
          metadata,
          config.clientSecret ? ClientSecretBasic(config.clientSecret) : None(),
          config.environment !== "production" &&
            new URL(config.issuer).protocol === "http:"
            ? { execute: [allowInsecureRequests] }
            : undefined,
        );
        enableNonRepudiationChecks(client);
        return client;
      });
    this.clientPromise = null;
  }

  async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = this.clientFactory(this.config).catch((error) => {
        this.clientPromise = null;
        throw new IdentityAuthError("identity_provider_unavailable", 503, {
          cause: error,
        });
      });
    }
    return this.clientPromise;
  }

  async beginLogin(loginMethod) {
    if (!LOGIN_METHODS.has(loginMethod)) {
      throw new IdentityAuthError("unsupported_login_method", 400);
    }

    const client = await this.getClient();
    const state = randomState();
    const nonce = randomNonce();
    const codeVerifier = randomPKCECodeVerifier();
    const browserBinding = randomBytes(32).toString("base64url");
    const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
    const createdAt = this.now();
    const expiresAt = new Date(
      createdAt.getTime() + this.config.loginTransactionLifetimeSeconds * 1000,
    );

    await this.repository.createLoginTransaction({
      state,
      browserBinding,
      nonce,
      codeVerifier,
      loginMethod,
      expiresAt,
    });

    const parameters = {
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    };
    if (loginMethod === "google") {
      parameters[this.config.googleBrokerHintParameter] =
        this.config.googleBrokerAlias;
    }
    return {
      authorizationUrl: buildAuthorizationUrl(client, parameters).href,
      browserBinding,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async completeLogin({ callbackUrl, browserBinding }) {
    if (typeof browserBinding !== "string" || browserBinding.length < 32) {
      throw new IdentityAuthError("invalid_state");
    }
    const url = assertCallbackUrl(callbackUrl, this.config.redirectUri);
    const state = url.searchParams.get("state");
    const transaction = await this.repository.consumeLoginTransaction({
      state,
      browserBinding,
      now: this.now(),
    });
    if (!transaction) {
      throw new IdentityAuthError("invalid_state");
    }

    try {
      const client = await this.getClient();
      const tokenResponse = await authorizationCodeGrant(client, url, {
        expectedState: state,
        expectedNonce: transaction.nonce,
        pkceCodeVerifier: transaction.codeVerifier,
        idTokenExpected: true,
      });
      const claims = tokenResponse.claims();
      const authenticatedAt = this.now();
      validateIdTokenClaims(claims, {
        issuer: this.config.issuer,
        clientId: this.config.clientId,
        now: authenticatedAt,
      });

      const providerSubject = { issuer: claims.iss, subject: claims.sub };
      let account =
        await this.accountRepository.findAccountByProviderSubject(
          providerSubject,
        );
      let accountCreated = false;
      if (!account) {
        try {
          account =
            await this.accountRepository.createAccountForProvider(
              providerSubject,
            );
          accountCreated = true;
        } catch (error) {
          if (error?.code !== "23505") {
            throw error;
          }
          account =
            await this.accountRepository.findAccountByProviderSubject(
              providerSubject,
            );
          if (!account) {
            throw error;
          }
        }
      }

      if (!account?.accountId || !tokenResponse.id_token) {
        throw new IdentityAuthError("invalid_identity_token");
      }
      const sessionId = randomBytes(32).toString("base64url");
      const expiresAt = new Date(
        authenticatedAt.getTime() + this.config.sessionLifetimeSeconds * 1000,
      );
      await this.repository.createSession({
        sessionId,
        accountId: account.accountId,
        refreshToken: tokenResponse.refresh_token ?? null,
        idToken: tokenResponse.id_token,
        authenticatedAt,
        expiresAt,
      });
      return {
        sessionId,
        accountCreated,
        session: sessionView({
          accountId: account.accountId,
          authenticatedAt,
          expiresAt,
        }),
      };
    } catch (error) {
      if (error instanceof IdentityAuthError) {
        throw error;
      }
      throw new IdentityAuthError("identity_provider_rejected_login", 401, {
        cause: error,
      });
    }
  }

  async getSession(sessionId) {
    if (typeof sessionId !== "string" || sessionId.length < 32) {
      return null;
    }
    const session = await this.repository.findSession({
      sessionId,
      now: this.now(),
    });
    if (!session) {
      return null;
    }
    return sessionView(session);
  }

  async getAuthorizationContext(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }
    const assignments = await this.roleRepository.listRoleAssignments(
      session.accountId,
    );
    return createAuthorizationContext({
      accountId: session.accountId,
      assignments,
      evaluatedAt: this.now(),
    });
  }

  async refreshSession(sessionId) {
    if (typeof sessionId !== "string" || sessionId.length < 32) {
      throw new IdentityAuthError("session_expired");
    }
    const current = await this.repository.findSession({
      sessionId,
      now: this.now(),
    });
    if (!current?.refreshToken) {
      if (current) {
        await this.repository.deleteSession(sessionId);
      }
      throw new IdentityAuthError("session_expired");
    }

    try {
      const client = await this.getClient();
      const refreshed = await refreshTokenGrant(client, current.refreshToken);
      const newSessionId = randomBytes(32).toString("base64url");
      const authenticatedAt = this.now();
      const expiresAt = new Date(
        authenticatedAt.getTime() + this.config.sessionLifetimeSeconds * 1000,
      );
      const rotated = await this.repository.rotateSession({
        oldSessionId: sessionId,
        newSessionId,
        refreshToken: refreshed.refresh_token ?? current.refreshToken,
        idToken: refreshed.id_token ?? current.idToken,
        expiresAt,
      });
      if (!rotated) {
        throw new IdentityAuthError("session_expired");
      }
      return {
        sessionId: newSessionId,
        session: sessionView({
          accountId: rotated.accountId,
          authenticatedAt: rotated.authenticatedAt,
          expiresAt: rotated.expiresAt,
        }),
      };
    } catch (error) {
      if (error instanceof IdentityAuthError) {
        throw error;
      }
      if (isInvalidRefreshToken(error)) {
        await this.repository.deleteSession(sessionId);
        throw new IdentityAuthError("session_expired");
      }
      throw new IdentityAuthError("identity_provider_unavailable", 503, {
        cause: error,
      });
    }
  }

  async logout(sessionId) {
    if (typeof sessionId !== "string" || sessionId.length < 32) {
      return { logoutUrl: null };
    }
    const session = await this.repository.findSession({
      sessionId,
      now: this.now(),
    });
    await this.repository.deleteSession(sessionId);
    if (!session?.idToken) {
      return { logoutUrl: null };
    }

    try {
      const client = await this.getClient();
      const logoutUrl = buildEndSessionUrl(client, {
        id_token_hint: session.idToken,
        post_logout_redirect_uri: this.config.postLogoutRedirectUri,
      });
      return { logoutUrl: logoutUrl.href };
    } catch {
      // The local session is already gone; provider failure must not restore it.
      return { logoutUrl: null };
    }
  }
}
