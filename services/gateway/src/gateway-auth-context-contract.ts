export const GATEWAY_AUTH_CONTEXT_FORWARDING_CONTRACT_V1 =
  "cgn.gateway.auth-context-forwarding.v1" as const;

export const GATEWAY_AUTH_CONTEXT_HEADER_V1 = "x-cgn-auth-context-v1" as const;

export const IDENTITY_AUTHORIZATION_CONTEXT_CONTRACT_V1 =
  "cgn.identity.authorization-context.v1" as const;

export const IDENTITY_AUTHORIZATION_CONTEXT_API_V1 =
  "/v1/identity/auth/authorization-context" as const;

export const IDENTITY_APPLICATION_ROLES_V1 = [
  "student",
  "expert",
  "recruiter",
  "admin",
] as const;
