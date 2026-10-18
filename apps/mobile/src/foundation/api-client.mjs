/**
 * CGN-128 network foundation. Domain endpoints and schemas must come from
 * Sandeep-approved owning-service contracts (CGN-290).
 * Never invents API endpoints, tokens, responses or local user records.
 */
export class CgnApiError extends Error {
  constructor(message, { status = null, code = "REQUEST_FAILED" } = {}) {
    super(message);
    this.name = "CgnApiError";
    this.status = status;
    this.code = code;
  }
}

function isLoopback(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

function validateBaseUrl(value, allowInsecureLocal) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("API baseUrl must be configured");
  }
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !(
      url.protocol === "https:" ||
      (allowInsecureLocal && url.protocol === "http:" && isLoopback(url.hostname))
    )
  ) {
    throw new TypeError("API URL must use HTTPS (or explicit local-only HTTP)");
  }
  return url;
}

function validateEndpoint(base, endpoint) {
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("/") ||
    endpoint.startsWith("//") ||
    endpoint.includes("\\") ||
    /%(?:2f|5c|00)/i.test(endpoint)
  ) {
    throw new TypeError("API endpoint must be an absolute same-origin path");
  }
  const url = new URL(endpoint, base);
  if (url.origin !== base.origin || url.username || url.password || url.hash) {
    throw new TypeError("Cross-origin API endpoints are not allowed");
  }
  return url;
}

/**
 * @param {object} options
 * @param {string} options.baseUrl Trusted, configured API gateway base URL.
 * @param {() => Promise<string|null>|string|null} options.getAccessToken Fresh token provider.
 * @param {typeof fetch} [options.fetchImpl] Native fetch adapter.
 * @param {boolean} [options.allowInsecureLocal] Test-only loopback exception.
 */
export function createCgnApiClient({
  baseUrl,
  getAccessToken,
  fetchImpl = globalThis.fetch,
  allowInsecureLocal = false,
}) {
  const base = validateBaseUrl(baseUrl, allowInsecureLocal);
  if (typeof getAccessToken !== "function" || typeof fetchImpl !== "function") {
    throw new TypeError("A token provider and fetch implementation are required");
  }

  return Object.freeze({
    async request(endpoint, { method = "GET", body, signal } = {}) {
      const url = validateEndpoint(base, endpoint);
      if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(method)) {
        throw new TypeError("Unsupported HTTP method");
      }
      if ((method === "GET" || method === "DELETE") && body !== undefined) {
        throw new TypeError("GET and DELETE requests cannot include a body");
      }
      const token = await getAccessToken();
      if (typeof token !== "string" || !token.trim()) {
        throw new CgnApiError("Authentication required", {
          status: 401,
          code: "AUTH_REQUIRED",
        });
      }
      const headers = {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      let response;
      try {
        response = await fetchImpl(url.toString(), {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal,
          credentials: "omit",
          redirect: "error",
        });
      } catch (error) {
        if (signal?.aborted) throw error;
        throw new CgnApiError("Cannot reach CGN API", {
          code: "NETWORK_ERROR",
        });
      }
      if (!response || typeof response.ok !== "boolean") {
        throw new CgnApiError("Invalid CGN API response", {
          code: "INVALID_RESPONSE",
        });
      }
      if (!response.ok) {
        // Never include untrusted/private response body in errors.
        throw new CgnApiError(
          response.status === 401 ? "Session expired" : "CGN API request failed",
          {
            status: response.status,
            code: response.status === 401 ? "UNAUTHORIZED" : "HTTP_ERROR",
          },
        );
      }
      if (response.status === 204) return null;
      try {
        return await response.json();
      } catch {
        throw new CgnApiError("Invalid JSON from CGN API", {
          status: response.status,
          code: "INVALID_JSON",
        });
      }
    },
  });
}
