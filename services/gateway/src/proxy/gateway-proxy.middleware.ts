import type { Request, Response } from "express";
import type { AppConfig } from "../config/app-config.js";
import {
  createGatewayAuthContextForwardingV1,
  resolveIdentityAuthorizationContext,
} from "../auth/identity-authorization-context.js";
import { GATEWAY_AUTH_CONTEXT_HEADER_V1 } from "../gateway-auth-context-contract.js";

const ALLOWED_METHODS = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);

type RequestWithRawBody = Request & { rawBody?: Buffer };

function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
): void {
  const requestId = response.getHeader("x-request-id");
  response.status(status).json({
    error: {
      code,
      message,
      ...(typeof requestId === "string" ? { requestId } : {}),
    },
  });
}

function requestRoute(
  originalUrl: string,
): { service: string; path: string; search: string } | undefined {
  if (!originalUrl.startsWith("/") || originalUrl.startsWith("//")) {
    return undefined;
  }
  let parsed: URL;
  try {
    parsed = new URL(originalUrl, "http://gateway.invalid");
  } catch {
    return undefined;
  }
  const match = /^\/v1\/([a-z][a-z0-9-]{0,31})(?:\/.*)?$/.exec(parsed.pathname);
  if (!match || /%2f|%5c|%2e/i.test(parsed.pathname)) return undefined;
  return { service: match[1], path: parsed.pathname, search: parsed.search };
}

function targetUrl(baseUrl: string, path: string, search: string): URL {
  const target = new URL(baseUrl);
  target.pathname = path;
  target.search = search;
  return target;
}

export function createGatewayProxyMiddleware(
  config: AppConfig,
  fetcher: typeof fetch = fetch,
) {
  return (request: Request, response: Response): void => {
    const route = requestRoute(request.originalUrl);
    if (!route) {
      sendError(
        response,
        404,
        "NOT_FOUND",
        "The requested resource was not found.",
      );
      return;
    }
    const upstreamBaseUrl = config.upstreams[route.service];
    if (!upstreamBaseUrl) {
      sendError(
        response,
        404,
        "NOT_FOUND",
        "The requested resource was not found.",
      );
      return;
    }
    if (!ALLOWED_METHODS.has(request.method)) {
      sendError(
        response,
        405,
        "METHOD_NOT_ALLOWED",
        "The request method is not supported.",
      );
      return;
    }

    void (async () => {
      const auth = await resolveIdentityAuthorizationContext(
        request.header("cookie"),
        config,
        fetcher,
      );
      if (auth.kind === "unauthenticated") {
        sendError(
          response,
          401,
          "UNAUTHENTICATED",
          "Authentication is required.",
        );
        return;
      }
      if (auth.kind === "unavailable") {
        sendError(
          response,
          503,
          "IDENTITY_UNAVAILABLE",
          "Authentication could not be verified.",
        );
        return;
      }

      const requestId = response.getHeader("x-request-id");
      const headers = new Headers({
        [GATEWAY_AUTH_CONTEXT_HEADER_V1]: JSON.stringify(
          createGatewayAuthContextForwardingV1(auth.context),
        ),
      });
      if (typeof requestId === "string") headers.set("x-request-id", requestId);
      const contentType = request.header("content-type");
      const accept = request.header("accept");
      if (contentType) headers.set("content-type", contentType);
      if (accept) headers.set("accept", accept);

      const rawBody = (request as RequestWithRawBody).rawBody;
      const hasBody =
        request.method !== "GET" &&
        request.method !== "HEAD" &&
        rawBody !== undefined &&
        rawBody.length > 0;
      let upstreamResponse: globalThis.Response;
      try {
        upstreamResponse = await fetcher(
          targetUrl(upstreamBaseUrl, route.path, route.search),
          {
            method: request.method,
            headers,
            ...(hasBody ? { body: new Uint8Array(rawBody) } : {}),
            redirect: "manual",
            signal: AbortSignal.timeout(10000),
          },
        );
      } catch {
        sendError(
          response,
          502,
          "UPSTREAM_UNAVAILABLE",
          "The requested service could not complete the request.",
        );
        return;
      }

      response.status(upstreamResponse.status);
      response.setHeader("cache-control", "no-store");
      const upstreamContentType = upstreamResponse.headers.get("content-type");
      if (upstreamContentType) {
        response.setHeader("content-type", upstreamContentType);
      }
      const upstreamCacheControl =
        upstreamResponse.headers.get("cache-control");
      if (upstreamCacheControl) {
        response.setHeader("cache-control", upstreamCacheControl);
      }
      if (request.method === "HEAD" || upstreamResponse.status === 204) {
        response.end();
        return;
      }
      response.end(Buffer.from(await upstreamResponse.arrayBuffer()));
    })().catch(() => {
      if (!response.headersSent) {
        sendError(
          response,
          502,
          "UPSTREAM_UNAVAILABLE",
          "The requested service could not complete the request.",
        );
      } else {
        response.destroy();
      }
    });
  };
}
