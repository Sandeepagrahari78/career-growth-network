import type {
  GatewayAuthContextForwardingV1,
  IdentityAuthorizationContextV1,
} from "@cgn/contracts";
import {
  GATEWAY_AUTH_CONTEXT_FORWARDING_CONTRACT_V1,
  IDENTITY_APPLICATION_ROLES_V1,
  IDENTITY_AUTHORIZATION_CONTEXT_API_V1,
  IDENTITY_AUTHORIZATION_CONTEXT_CONTRACT_V1,
} from "../gateway-auth-context-contract.js";
import type { AppConfig } from "../config/app-config.js";

export type AuthContextResult =
  | { kind: "authenticated"; context: IdentityAuthorizationContextV1 }
  | { kind: "unauthenticated" }
  | { kind: "unavailable" };

const ACCOUNT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_VALUE_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;

function sessionCookieValue(
  header: string | undefined,
  cookieName: string,
): string | undefined {
  if (header === undefined || header.length > 8192) return undefined;
  const cookies = new Map<string, string>();
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (cookies.has(name)) return undefined;
    cookies.set(name, value);
  }
  const value = cookies.get(cookieName);
  return value && SESSION_VALUE_PATTERN.test(value) ? value : undefined;
}

export function isIdentityAuthorizationContext(
  value: unknown,
): value is IdentityAuthorizationContextV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate).sort();
  if (
    keys.join(",") !== "accountId,contract,evaluatedAt,roles" ||
    candidate.contract !== IDENTITY_AUTHORIZATION_CONTEXT_CONTRACT_V1 ||
    typeof candidate.accountId !== "string" ||
    !ACCOUNT_ID_PATTERN.test(candidate.accountId) ||
    typeof candidate.evaluatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      candidate.evaluatedAt,
    ) ||
    !Number.isFinite(Date.parse(candidate.evaluatedAt)) ||
    !Array.isArray(candidate.roles)
  ) {
    return false;
  }
  const roles = candidate.roles;
  return (
    roles.every(
      (role) =>
        typeof role === "string" &&
        IDENTITY_APPLICATION_ROLES_V1.some((allowedRole) => role === allowedRole),
    ) && new Set(roles).size === roles.length
  );
}

export async function resolveIdentityAuthorizationContext(
  cookieHeader: string | undefined,
  config: AppConfig,
  fetcher: typeof fetch = fetch,
): Promise<AuthContextResult> {
  const session = sessionCookieValue(
    cookieHeader,
    config.identitySessionCookieName,
  );
  if (!session) return { kind: "unauthenticated" };

  try {
    const response = await fetcher(
      new URL(IDENTITY_AUTHORIZATION_CONTEXT_API_V1, config.identityBaseUrl),
      {
        method: "GET",
        headers: {
          cookie: config.identitySessionCookieName + "=" + session,
        },
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (response.status === 401 || response.status === 403) {
      return { kind: "unauthenticated" };
    }
    if (!response.ok) return { kind: "unavailable" };
    const context: unknown = await response.json();
    if (!isIdentityAuthorizationContext(context)) {
      return { kind: "unavailable" };
    }
    return { kind: "authenticated", context };
  } catch {
    return { kind: "unavailable" };
  }
}

export function createGatewayAuthContextForwardingV1(
  context: IdentityAuthorizationContextV1,
): GatewayAuthContextForwardingV1 {
  return {
    contract: GATEWAY_AUTH_CONTEXT_FORWARDING_CONTRACT_V1,
    identityAuthorizationContext: context,
  };
}
