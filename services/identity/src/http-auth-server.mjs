import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { IdentityAuthError } from "./oidc-auth-service.mjs";
import { IDENTITY_AUTHORIZATION_CONTEXT_API_V1 } from "./identity-auth-contract.mjs";

const SAFE_MESSAGES = {
  identity_provider_unavailable:
    "Sign-in is temporarily unavailable. Please try again.",
  identity_provider_rejected_login:
    "Sign-in could not be completed. Please try again.",
  invalid_callback: "The sign-in response is invalid. Please start again.",
  invalid_identity_token:
    "The identity provider returned an invalid sign-in response.",
  invalid_state: "The sign-in session expired or could not be verified.",
  session_expired: "Your sign-in session expired. Please sign in again.",
  unsupported_login_method: "This sign-in method is not available.",
  unauthenticated: "Sign-in is required.",
  request_error: "The request could not be completed.",
};

function cookieNames(secure) {
  const prefix = secure ? "__Host-" : "";
  return {
    binding: `${prefix}cgn_oidc_binding`,
    session: `${prefix}cgn_identity_session`,
  };
}

function serializeCookie(name, value, { secure, maxAge }) {
  const fields = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) {
    fields.push("Secure");
  }
  return fields.join("; ");
}

function readCookies(request) {
  const header = request.headers.cookie;
  if (typeof header !== "string" || header.length > 8192) {
    return new Map();
  }
  const cookies = new Map();
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) {
      continue;
    }
    const name = part.slice(0, separator).trim();
    if (cookies.has(name)) {
      return new Map();
    }
    cookies.set(name, part.slice(separator + 1).trim());
  }
  return cookies;
}

function sendJson(response, statusCode, body, requestId) {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-request-id": requestId,
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function safeError(error, requestId) {
  const statusCode =
    error instanceof IdentityAuthError ? error.statusCode : 500;
  const code =
    error instanceof IdentityAuthError ? error.code : "request_error";
  return {
    statusCode,
    body: {
      error: {
        code: code.toUpperCase(),
        message: SAFE_MESSAGES[code] ?? SAFE_MESSAGES.request_error,
        requestId,
      },
    },
  };
}

function routeUrl(request, config) {
  return new URL(request.url ?? "/", config.redirectUri);
}

export function createIdentityAuthHttpServer({ authService, config, logger }) {
  if (
    typeof authService?.beginLogin !== "function" ||
    typeof authService?.completeLogin !== "function" ||
    typeof authService?.getSession !== "function" ||
    typeof authService?.getAuthorizationContext !== "function" ||
    typeof authService?.refreshSession !== "function" ||
    typeof authService?.logout !== "function"
  ) {
    throw new TypeError("Identity HTTP server requires the OIDC auth service.");
  }
  const names = cookieNames(config.cookieSecure);

  return createServer(async (request, response) => {
    const requestId = randomUUID();
    const url = routeUrl(request, config);
    const cookies = readCookies(request);
    const clearBinding = serializeCookie(names.binding, "", {
      secure: config.cookieSecure,
      maxAge: 0,
    });
    const clearSession = serializeCookie(names.session, "", {
      secure: config.cookieSecure,
      maxAge: 0,
    });
    response.setHeader("cache-control", "no-store");

    try {
      if (
        request.method === "GET" &&
        url.pathname === "/v1/identity/auth/authorize"
      ) {
        const login = await authService.beginLogin(
          url.searchParams.get("method"),
        );
        response.writeHead(302, {
          location: login.authorizationUrl,
          "set-cookie": serializeCookie(names.binding, login.browserBinding, {
            secure: config.cookieSecure,
            maxAge: config.loginTransactionLifetimeSeconds,
          }),
          "x-request-id": requestId,
        });
        response.end();
        return;
      }

      if (
        request.method === "GET" &&
        url.pathname === "/v1/identity/auth/callback"
      ) {
        const result = await authService.completeLogin({
          callbackUrl: new URL(request.url ?? "/", config.redirectUri).href,
          browserBinding: cookies.get(names.binding),
        });
        if (result.accountCreated) {
          logger?.info?.("identity_account_created", {
            requestId,
            accountId: result.session.accountId,
          });
        }
        logger?.info?.("identity_auth_login_completed", {
          requestId,
          accountId: result.session.accountId,
          expiresAt: result.session.expiresAt,
        });
        response.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
          "set-cookie": [
            clearBinding,
            serializeCookie(names.session, result.sessionId, {
              secure: config.cookieSecure,
              maxAge: config.sessionLifetimeSeconds,
            }),
          ],
          "x-content-type-options": "nosniff",
          "x-request-id": requestId,
        });
        response.end(JSON.stringify({ session: result.session }));
        return;
      }

      if (
        request.method === "GET" &&
        url.pathname === IDENTITY_AUTHORIZATION_CONTEXT_API_V1
      ) {
        const authorizationContext = await authService.getAuthorizationContext(
          cookies.get(names.session),
        );
        if (!authorizationContext) {
          throw new IdentityAuthError("unauthenticated");
        }
        sendJson(response, 200, { authorizationContext }, requestId);
        return;
      }

      if (
        request.method === "GET" &&
        url.pathname === "/v1/identity/auth/session"
      ) {
        const session = await authService.getSession(
          cookies.get(names.session),
        );
        if (!session) {
          throw new IdentityAuthError("unauthenticated");
        }
        sendJson(response, 200, { session }, requestId);
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/v1/identity/auth/refresh"
      ) {
        const refreshed = await authService.refreshSession(
          cookies.get(names.session),
        );
        logger?.info?.("identity_auth_session_refreshed", {
          requestId,
          accountId: refreshed.session.accountId,
          expiresAt: refreshed.session.expiresAt,
        });
        response.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
          "set-cookie": [
            clearSession,
            serializeCookie(names.session, refreshed.sessionId, {
              secure: config.cookieSecure,
              maxAge: config.sessionLifetimeSeconds,
            }),
          ],
          "x-content-type-options": "nosniff",
          "x-request-id": requestId,
        });
        response.end(JSON.stringify({ session: refreshed.session }));
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/v1/identity/auth/logout"
      ) {
        const result = await authService.logout(cookies.get(names.session));
        logger?.info?.("identity_auth_logout_completed", {
          requestId,
          localSessionCleared: true,
        });
        response.setHeader("set-cookie", [clearSession, clearBinding]);
        if (result.logoutUrl) {
          response.writeHead(303, {
            location: result.logoutUrl,
            "x-request-id": requestId,
          });
          response.end();
        } else {
          response.writeHead(204, { "x-request-id": requestId });
          response.end();
        }
        return;
      }

      sendJson(
        response,
        404,
        {
          error: {
            code: "NOT_FOUND",
            message: "The requested resource was not found.",
            requestId,
          },
        },
        requestId,
      );
    } catch (error) {
      if (url.pathname === "/v1/identity/auth/callback") {
        response.setHeader("set-cookie", clearBinding);
      }
      const mapped = safeError(error, requestId);
      logger?.error?.("identity_auth_request_failed", {
        requestId,
        method: request.method,
        path: url.pathname,
        statusCode: mapped.statusCode,
        code: mapped.body.error.code,
      });
      sendJson(response, mapped.statusCode, mapped.body, requestId);
    }
  });
}
