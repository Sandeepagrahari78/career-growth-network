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
const SERVICE_ROUTE_PATTERN = /^\/v1\/([a-z][a-z0-9-]{0,31})(?:\/.*)?$/;
export const MAX_UPSTREAM_RESPONSE_BYTES = 5 * 1024 * 1024;

type RequestWithRawBody = Request & { rawBody?: Buffer };

function hasUnsafePathSegment(rawSegment: string): boolean {
  let candidate = rawSegment;
  for (let depth = 0; depth < 8; depth += 1) {
    if (
      candidate === "." ||
      candidate === ".." ||
      candidate.includes("/") ||
      candidate.includes("\\")
    ) {
      return true;
    }
    if (!/%(?:25|2e|2f|5c)/i.test(candidate)) return false;
    let decoded: string;
    try {
      decoded = decodeURIComponent(candidate);
    } catch {
      return true;
    }
    if (decoded === candidate) return false;
    candidate = decoded;
  }
  return (
    candidate === "." ||
    candidate === ".." ||
    candidate.includes("/") ||
    candidate.includes("\\") ||
    /%(?:25|2e|2f|5c)/i.test(candidate)
  );
}

async function readBoundedUpstreamBody(
  upstreamResponse: globalThis.Response,
): Promise<Buffer | undefined> {
  const contentLength = upstreamResponse.headers.get("content-length");
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    BigInt(contentLength) > BigInt(MAX_UPSTREAM_RESPONSE_BYTES)
  ) {
    await upstreamResponse.body?.cancel().catch(() => undefined);
    return undefined;
  }

  if (!upstreamResponse.body) return Buffer.alloc(0);
  const reader = upstreamResponse.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks, totalBytes);
      if (totalBytes + value.byteLength > MAX_UPSTREAM_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        return undefined;
      }
      totalBytes += value.byteLength;
      chunks.push(Uint8Array.from(value));
    }
  } finally {
    reader.releaseLock();
  }
}

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
  const queryOrFragment = originalUrl.search(/[?#]/);
  const rawPath =
    queryOrFragment === -1
      ? originalUrl
      : originalUrl.slice(0, queryOrFragment);
  if (
    !rawPath.startsWith("/") ||
    rawPath.startsWith("//") ||
    rawPath.includes("\\")
  ) {
    return undefined;
  }
  const rawMatch = SERVICE_ROUTE_PATTERN.exec(rawPath);
  if (!rawMatch || rawPath.split("/").some(hasUnsafePathSegment)) {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(originalUrl, "http://gateway.invalid");
  } catch {
    return undefined;
  }
  const canonicalMatch = SERVICE_ROUTE_PATTERN.exec(parsed.pathname);
  if (
    !canonicalMatch ||
    canonicalMatch[1] !== rawMatch[1] ||
    /%2f|%5c|%2e/i.test(parsed.pathname)
  ) {
    return undefined;
  }
  return {
    service: rawMatch[1],
    path: parsed.pathname,
    search: parsed.search,
  };
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

      const hasNoBody =
        request.method === "HEAD" || upstreamResponse.status === 204;
      let upstreamBody: Buffer | undefined;
      if (!hasNoBody) {
        upstreamBody = await readBoundedUpstreamBody(upstreamResponse);
        if (upstreamBody === undefined) {
          sendError(
            response,
            502,
            "UPSTREAM_RESPONSE_TOO_LARGE",
            "The requested service returned a response that was too large.",
          );
          return;
        }
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
      if (hasNoBody) {
        response.end();
        return;
      }
      response.end(upstreamBody);
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
