import type { IdentityAuthorizationContextV1 } from "../identity/identity-authorization-context.v1.js";

export const GATEWAY_AUTH_CONTEXT_FORWARDING_CONTRACT_V1 =
  "cgn.gateway.auth-context-forwarding.v1" as const;

export const GATEWAY_AUTH_CONTEXT_HEADER_V1 = "x-cgn-auth-context-v1" as const;

/**
 * Gateway builds this versioned transport envelope only from the Identity-owned
 * authorization-context response after Identity validates the caller's session.
 * The nested account identity and roles remain authoritative from Identity.
 * This envelope is not proof of Gateway service identity; receivers must fail
 * closed for protected operations until CGN-101 authenticates the transport.
 */
export interface GatewayAuthContextForwardingV1 {
  contract: typeof GATEWAY_AUTH_CONTEXT_FORWARDING_CONTRACT_V1;
  identityAuthorizationContext: IdentityAuthorizationContextV1;
}
