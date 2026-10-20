export const IDENTITY_OIDC_PROVIDER_CONFIG_CONTRACT =
  "cgn.identity.oidc-provider-config.v1" as const;
export const IDENTITY_AUTH_SESSION_CONTRACT =
  "cgn.identity.auth-session.v1" as const;
export const IDENTITY_AUTH_API_V1 = {
  authorize: "/v1/identity/auth/authorize",
  callback: "/v1/identity/auth/callback",
  session: "/v1/identity/auth/session",
  refresh: "/v1/identity/auth/refresh",
  logout: "/v1/identity/auth/logout",
} as const;
export type IdentityLoginMethodV1 = "email_password" | "google";

/** Provider-neutral OIDC settings; secret values are resolved from the environment. */
export interface IdentityOidcProviderConfigV1 {
  contract: typeof IDENTITY_OIDC_PROVIDER_CONFIG_CONTRACT;
  issuer: string;
  clientId: string;
  clientAuthentication: "none" | "client_secret_basic";
  clientSecretEnv?: "CGN_IDENTITY_OIDC_CLIENT_SECRET";
  redirectUri: string;
  postLogoutRedirectUri: string;
  sessionEncryptionKeyEnv: "CGN_IDENTITY_SESSION_ENCRYPTION_KEY";
  googleBrokerAliasEnv: "CGN_IDENTITY_GOOGLE_BROKER_ALIAS";
  googleBrokerHintParameterEnv: "CGN_IDENTITY_GOOGLE_BROKER_HINT_PARAMETER";
  sessionLifetimeSeconds: number;
  loginTransactionLifetimeSeconds: number;
}

/** Session summary exposed by Identity. Never includes access or refresh tokens. */
export interface IdentityAuthSessionV1 {
  contract: typeof IDENTITY_AUTH_SESSION_CONTRACT;
  accountId: string;
  authenticatedAt: string;
  expiresAt: string;
}
