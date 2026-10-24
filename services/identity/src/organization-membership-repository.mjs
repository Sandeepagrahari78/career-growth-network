import { randomUUID } from "node:crypto";

const MEMBERSHIP_STATUSES = new Set(["pending", "approved", "revoked"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUuid(value, field) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new TypeError(`${field} must be a UUID.`);
  }
}

function validateStatus(status) {
  if (typeof status !== "string" || !MEMBERSHIP_STATUSES.has(status)) {
    throw new TypeError("status must be pending, approved or revoked.");
  }
}

export class IdentityOrganizationMembershipRepository {
  constructor(database) {
    if (
      typeof database?.query !== "function" ||
      typeof database?.withTransaction !== "function"
    ) {
      throw new TypeError(
        "Identity membership repository requires query and withTransaction methods.",
      );
    }
    this.database = database;
  }

  async findMembershipStatus(accountId, organizationId) {
    requireUuid(accountId, "accountId");
    requireUuid(organizationId, "organizationId");
    const result = await this.database.query(
      `SELECT status
       FROM identity.organization_memberships
       WHERE account_id = $1 AND organization_id = $2`,
      [accountId, organizationId],
    );
    return result.rows[0]?.status ?? "none";
  }

  async setMembershipStatus({
    accountId,
    organizationId,
    status,
    actorAccountId = null,
    changedAt = new Date(),
  }) {
    requireUuid(accountId, "accountId");
    requireUuid(organizationId, "organizationId");
    if (actorAccountId !== null) {
      requireUuid(actorAccountId, "actorAccountId");
    }
    validateStatus(status);
    const when = changedAt instanceof Date ? changedAt : new Date(changedAt);
    if (!Number.isFinite(when.getTime())) {
      throw new TypeError("changedAt must be a valid timestamp.");
    }

    return this.database.withTransaction(async (transaction) => {
      await transaction.query(
        `SELECT id FROM identity.accounts WHERE id = $1 FOR UPDATE`,
        [accountId],
      );
      const currentResult = await transaction.query(
        `SELECT status
         FROM identity.organization_memberships
         WHERE account_id = $1 AND organization_id = $2
         FOR UPDATE`,
        [accountId, organizationId],
      );
      const previousStatus = currentResult.rows[0]?.status ?? null;
      if (previousStatus === status) {
        return false;
      }

      await transaction.query(
        `INSERT INTO identity.organization_memberships
          (account_id, organization_id, status, changed_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (account_id, organization_id)
         DO UPDATE SET status = EXCLUDED.status, changed_at = EXCLUDED.changed_at`,
        [accountId, organizationId, status, when],
      );
      await transaction.query(
        `INSERT INTO identity.organization_membership_changes
          (change_id, account_id, organization_id, previous_status,
           new_status, actor_account_id, changed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          accountId,
          organizationId,
          previousStatus,
          status,
          actorAccountId,
          when,
        ],
      );
      return true;
    });
  }
}
