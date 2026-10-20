import type { IdentityAuthorizationContextV1 } from "../identity/identity-authorization-context.v1.js";

export const GATEWAY_AUTH_CONTEXT_FORWARDING_CONTRACT_V1 =
  "cgn.gateway.auth-context-forwarding.v1" as const;

export const GATEWAY_AUTH_CONTEXT_HEADER_V1 = "x-cgn-auth-context-v1" as const;

/**
 * Gateway's versioned transport envelope around the Identity-owned context.
 * It is not proof of the caller's service identity; receivers must authenticate
 * the Gateway as required by CGN-101 before trusting it.
 */
export interface GatewayAuthContextForwardingV1 {
  contract: typeof GATEWAY_AUTH_CONTEXT_FORWARDING_CONTRACT_V1;
  identityAuthorizationContext: IdentityAuthorizationContextV1;
}
