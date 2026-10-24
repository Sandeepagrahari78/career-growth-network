import {
  IDENTITY_APPLICATION_ROLES_V1,
  IDENTITY_AUTHORIZATION_CONTEXT_CONTRACT,
  IDENTITY_ORGANIZATION_AUTHORIZATION_CONTEXT_CONTRACT_V1,
} from "./identity-auth-contract.mjs";

const KNOWN_ROLES = new Set(IDENTITY_APPLICATION_ROLES_V1);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORGANIZATION_MEMBERSHIP_STATUSES = new Set([
  "none",
  "pending",
  "approved",
  "revoked",
]);

export function createAuthorizationContext({
  accountId,
  assignments,
  evaluatedAt = new Date(),
}) {
  if (typeof accountId !== "string" || !UUID_PATTERN.test(accountId)) {
    throw new TypeError("accountId must be a UUID.");
  }
  const timestamp = new Date(evaluatedAt);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new TypeError("evaluatedAt must be a valid timestamp.");
  }
  const roles = [
    ...new Set(
      (Array.isArray(assignments) ? assignments : [])
        .filter(
          (assignment) =>
            assignment?.status === "active" && KNOWN_ROLES.has(assignment.role),
        )
        .map((assignment) => assignment.role),
    ),
  ].sort();

  return {
    contract: IDENTITY_AUTHORIZATION_CONTEXT_CONTRACT,
    accountId,
    evaluatedAt: timestamp.toISOString(),
    roles,
  };
}

/** Exact role membership only; malformed contexts and unknown roles fail closed. */
export function hasIdentityApplicationRole(context, requiredRole) {
  return (
    context?.contract === IDENTITY_AUTHORIZATION_CONTEXT_CONTRACT &&
    typeof context.accountId === "string" &&
    UUID_PATTERN.test(context.accountId) &&
    KNOWN_ROLES.has(requiredRole) &&
    Array.isArray(context.roles) &&
    context.roles.some((role) => KNOWN_ROLES.has(role) && role === requiredRole)
  );
}

/** Resolve an organization-scoped recruiter claim from Identity-owned state. */
export function createOrganizationAuthorizationContext({
  accountId,
  organizationId,
  membershipStatus,
  assignments,
  evaluatedAt = new Date(),
}) {
  if (typeof accountId !== "string" || !UUID_PATTERN.test(accountId)) {
    throw new TypeError("accountId must be a UUID.");
  }
  if (
    typeof organizationId !== "string" ||
    !UUID_PATTERN.test(organizationId)
  ) {
    throw new TypeError("organizationId must be a UUID.");
  }
  if (!ORGANIZATION_MEMBERSHIP_STATUSES.has(membershipStatus)) {
    throw new TypeError("membershipStatus must be a recognized status.");
  }
  const timestamp = new Date(evaluatedAt);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new TypeError("evaluatedAt must be a valid timestamp.");
  }

  const hasActiveRecruiterRole =
    Array.isArray(assignments) &&
    assignments.some(
      (assignment) =>
        assignment?.role === "recruiter" && assignment?.status === "active",
    );
  const roles =
    membershipStatus === "approved" && hasActiveRecruiterRole
      ? ["recruiter"]
      : [];

  return {
    contract: IDENTITY_ORGANIZATION_AUTHORIZATION_CONTEXT_CONTRACT_V1,
    accountId,
    organizationId,
    evaluatedAt: timestamp.toISOString(),
    membershipStatus,
    roles,
  };
}
