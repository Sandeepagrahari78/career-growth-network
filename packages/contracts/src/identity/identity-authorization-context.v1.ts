export const IDENTITY_AUTHORIZATION_CONTEXT_CONTRACT =
  "cgn.identity.authorization-context.v1" as const;

export const IDENTITY_AUTHORIZATION_CONTEXT_API_V1 =
  "/v1/identity/auth/authorization-context" as const;

export const IDENTITY_APPLICATION_ROLES_V1 = [
  "student",
  "expert",
  "recruiter",
  "admin",
] as const;

export type IdentityApplicationRoleV1 =
  (typeof IDENTITY_APPLICATION_ROLES_V1)[number];

/** Current server-resolved Identity roles for one authenticated account. */
export interface IdentityAuthorizationContextV1 {
  contract: typeof IDENTITY_AUTHORIZATION_CONTEXT_CONTRACT;
  accountId: string;
  evaluatedAt: string;
  /** Only recognized active assignments are included. */
  roles: IdentityApplicationRoleV1[];
}
