import assert from "node:assert/strict";
import test from "node:test";

import {
  createAuthorizationContext,
  hasIdentityApplicationRole,
} from "../src/application-authorization.mjs";
import { IdentityApplicationRoleRepository } from "../src/application-role-repository.mjs";

const accountId = "9ad4af47-5f1c-459a-9cd1-cae65b960fc7";
const actorAccountId = "5c790dc2-11c9-49af-aae5-95ef157cf763";

function createDatabase() {
  const assignments = new Map();
  const audit = [];
  const calls = [];

  async function query(sql, values = []) {
    calls.push({ sql, values });
    if (/SELECT status[\s\S]*FOR UPDATE/.test(sql)) {
      const status = assignments.get(`${values[0]}:${values[1]}`);
      return { rows: status ? [{ status }] : [] };
    }
    if (/SELECT role_key AS "role"/.test(sql)) {
      return {
        rows: [...assignments.entries()]
          .filter(([key]) => key.startsWith(`${values[0]}:`))
          .map(([key, status]) => ({
            role: key.slice(values[0].length + 1),
            status,
          })),
      };
    }
    if (/INSERT INTO identity\.account_roles/.test(sql)) {
      assignments.set(`${values[0]}:${values[1]}`, values[2]);
      return { rows: [] };
    }
    if (/INSERT INTO identity\.account_role_changes/.test(sql)) {
      audit.push({
        changeId: values[0],
        accountId: values[1],
        role: values[2],
        previousStatus: values[3],
        newStatus: values[4],
        actorAccountId: values[5],
        changedAt: values[6],
      });
      return { rows: [] };
    }
    throw new Error("Unexpected SQL in role repository test.");
  }

  return {
    assignments,
    audit,
    calls,
    async query(sql, values) {
      return query(sql, values);
    },
    async withTransaction(callback) {
      return callback({ query });
    },
  };
}

test("authorization context includes only recognized active roles", () => {
  const context = createAuthorizationContext({
    accountId,
    evaluatedAt: "2026-10-20T10:00:00.000Z",
    assignments: [
      { role: "student", status: "active" },
      { role: "admin", status: "inactive" },
      { role: "admin", status: "active" },
      { role: "unknown-role", status: "active" },
      { role: "expert", status: "pending" },
    ],
  });

  assert.deepEqual(context, {
    contract: "cgn.identity.authorization-context.v1",
    accountId,
    evaluatedAt: "2026-10-20T10:00:00.000Z",
    roles: ["admin", "student"],
  });
});

test("role checks match exact supported roles and fail closed", () => {
  const context = createAuthorizationContext({
    accountId,
    assignments: [
      { role: "student", status: "active" },
      { role: "expert", status: "active" },
      { role: "recruiter", status: "active" },
      { role: "admin", status: "active" },
    ],
  });

  for (const role of ["student", "expert", "recruiter", "admin"]) {
    assert.equal(hasIdentityApplicationRole(context, role), true);
  }
  for (const assignedRole of ["student", "expert", "recruiter", "admin"]) {
    const isolated = createAuthorizationContext({
      accountId,
      assignments: [{ role: assignedRole, status: "active" }],
    });
    for (const requiredRole of ["student", "expert", "recruiter", "admin"]) {
      assert.equal(
        hasIdentityApplicationRole(isolated, requiredRole),
        assignedRole === requiredRole,
        `${assignedRole} must not imply ${requiredRole}`,
      );
    }
  }
  assert.equal(hasIdentityApplicationRole(context, "operator"), false);
  assert.equal(
    hasIdentityApplicationRole({ ...context, contract: "unknown" }, "admin"),
    false,
  );
  assert.equal(
    hasIdentityApplicationRole({ ...context, roles: ["operator"] }, "admin"),
    false,
  );
  assert.equal(
    hasIdentityApplicationRole({ ...context, roles: ["student"] }, "admin"),
    false,
  );
});

test("role repository reads Identity-owned grants with an account-scoped query", async () => {
  const database = createDatabase();
  database.assignments.set(`${accountId}:admin`, "inactive");
  const repository = new IdentityApplicationRoleRepository(database);

  assert.deepEqual(await repository.listRoleAssignments(accountId), [
    { role: "admin", status: "inactive" },
  ]);
  assert.match(database.calls[0].sql, /FROM identity\.account_roles/);
  assert.match(database.calls[0].sql, /WHERE account_id = \$1/);
  assert.deepEqual(database.calls[0].values, [accountId]);
});

test("role status changes are transactional, audited and idempotent", async () => {
  const database = createDatabase();
  const repository = new IdentityApplicationRoleRepository(database);
  const changedAt = new Date("2026-10-20T10:00:00.000Z");

  assert.equal(
    await repository.setRoleStatus({
      accountId,
      role: "recruiter",
      status: "active",
      actorAccountId,
      changedAt,
    }),
    true,
  );
  assert.equal(
    await repository.setRoleStatus({
      accountId,
      role: "recruiter",
      status: "active",
      actorAccountId,
      changedAt,
    }),
    false,
  );
  assert.equal(
    await repository.setRoleStatus({
      accountId,
      role: "recruiter",
      status: "inactive",
      actorAccountId,
      changedAt: new Date("2026-10-20T11:00:00.000Z"),
    }),
    true,
  );

  assert.deepEqual(
    database.audit.map((change) => ({
      accountId: change.accountId,
      role: change.role,
      previousStatus: change.previousStatus,
      newStatus: change.newStatus,
      actorAccountId: change.actorAccountId,
    })),
    [
      {
        accountId,
        role: "recruiter",
        previousStatus: null,
        newStatus: "active",
        actorAccountId,
      },
      {
        accountId,
        role: "recruiter",
        previousStatus: "active",
        newStatus: "inactive",
        actorAccountId,
      },
    ],
  );
  assert.equal(database.assignments.get(`${accountId}:recruiter`), "inactive");
});

test("unknown roles, statuses and malformed account IDs are rejected", async () => {
  const database = createDatabase();
  const repository = new IdentityApplicationRoleRepository(database);

  await assert.rejects(
    repository.setRoleStatus({ accountId, role: "operator", status: "active" }),
    /recognized Identity application role/,
  );
  await assert.rejects(
    repository.setRoleStatus({ accountId, role: "student", status: "pending" }),
    /status must be active or inactive/,
  );
  await assert.rejects(
    repository.setRoleStatus({
      accountId,
      role: "student",
      status: "active",
      actorAccountId: "not-a-uuid",
    }),
    /actorAccountId must be a UUID/,
  );
  await assert.rejects(
    repository.listRoleAssignments("not-a-uuid"),
    /accountId must be a UUID/,
  );
  assert.equal(database.calls.length, 0);
});
