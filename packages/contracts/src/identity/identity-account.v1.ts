export const IDENTITY_ACCOUNT_CONTRACT = "cgn.identity.account.v1" as const;
export const IDENTITY_PROVIDER_SUBJECT_CONTRACT =
  "cgn.identity.provider-subject.v1" as const;

/** Identity's internal account record. It is not a Career profile or goal. */
export interface IdentityAccountV1 {
  contract: typeof IDENTITY_ACCOUNT_CONTRACT;
  accountId: string;
  createdAt: string;
}

/** Identity-owned mapping from an OIDC issuer and opaque subject to an account. */
export interface IdentityProviderSubjectV1 {
  contract: typeof IDENTITY_PROVIDER_SUBJECT_CONTRACT;
  issuer: string;
  subject: string;
  accountId: string;
  linkedAt: string;
}
