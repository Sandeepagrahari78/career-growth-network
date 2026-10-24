export const IDENTITY_ORGANIZATION_AUTHORIZATION_CONTEXT_CONTRACT_V1 =
  "cgn.identity.organization-authorization-context.v1" as const;

export const IDENTITY_ORGANIZATION_AUTHORIZATION_CONTEXT_API_V1 =
  "/v1/identity/auth/organization-authorization-context" as const;

export type IdentityOrganizationMembershipStatusV1 =
  | "none"
  | "pending"
  | "approved"
  | "revoked";

/**
 * Identity-derived recruiter access for one authenticated account and one
 * organization. This context is not a bearer credential or proof of Gateway
 * identity; consumers must verify its source before using it for authorization.
 */
export interface IdentityOrganizationAuthorizationContextV1 {
  contract: typeof IDENTITY_ORGANIZATION_AUTHORIZATION_CONTEXT_CONTRACT_V1;
  accountId: string;
  organizationId: string;
  evaluatedAt: string;
  membershipStatus: IdentityOrganizationMembershipStatusV1;
  /** Contains recruiter only for an approved membership and active app role. */
  roles: Array<"recruiter">;
}
