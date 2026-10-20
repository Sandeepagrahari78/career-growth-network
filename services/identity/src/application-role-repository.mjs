import { randomUUID } from "node:crypto";

const KNOWN_ROLES = new Set(["student", "expert", "recruiter", "admin"]);
const ROLE_STATUSES = new Set(["active", "inactive"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUuid(value, field) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new TypeError(`${field} must be a UUID.`);
  }
}

function validateRole(role) {
  if (typeof role !== "string" || !KNOWN_ROLES.has(role)) {
    throw new TypeError("role must be a recognized Identity application role.");
  }
}

function validateStatus(status) {
  if (typeof status !== "string" || !ROLE_STATUSES.has(status)) {
    throw new TypeError("status must be active or inactive.");
  }
}

export class IdentityApplicationRoleRepository {
  constructor(database) {
    if (
      typeof database?.query !== "function" ||
      typeof database?.withTransaction !== "function"
    ) {
      throw new TypeError(
        "Identity role repository requires query and withTransaction methods.",
      );
    }
    this.database = database;
  }

  async listRoleAssignments(accountId) {
    requireUuid(accountId, "accountId");
    const result = await this.database.query(
      `SELECT role_key AS "role", status
       FROM identity.account_roles
       WHERE account_id = $1
       ORDER BY role_key`,
      [accountId],
    );
    return result.rows.map((row) => ({
      role: row.role,
      status: row.status,
    }));
  }

  async setRoleStatus({
    accountId,
    role,
    status,
    actorAccountId = null,
    changedAt = new Date(),
  }) {
    requireUuid(accountId, "accountId");
    if (actorAccountId !== null) {
      requireUuid(actorAccountId, "actorAccountId");
    }
    validateRole(role);
    validateStatus(status);
    const when = changedAt instanceof Date ? changedAt : new Date(changedAt);
    if (!Number.isFinite(when.getTime())) {
      throw new TypeError("changedAt must be a valid timestamp.");
    }

    return this.database.withTransaction(async (transaction) => {
      const currentResult = await transaction.query(
        `SELECT status
         FROM identity.account_roles
         WHERE account_id = $1 AND role_key = $2
         FOR UPDATE`,
        [accountId, role],
      );
      const previousStatus = currentResult.rows[0]?.status ?? null;
      if (previousStatus === status) {
        return false;
      }

      await transaction.query(
        `INSERT INTO identity.account_roles
          (account_id, role_key, status, changed_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (account_id, role_key)
         DO UPDATE SET status = EXCLUDED.status, changed_at = EXCLUDED.changed_at`,
        [accountId, role, status, when],
      );
      await transaction.query(
        `INSERT INTO identity.account_role_changes
          (change_id, account_id, role_key, previous_status, new_status,
           actor_account_id, changed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          accountId,
          role,
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
