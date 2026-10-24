import assert from "node:assert/strict";
import test from "node:test";
import { createOrganizationAuthorizationContext } from "../src/application-authorization.mjs";
import { IdentityOrganizationMembershipRepository } from "../src/organization-membership-repository.mjs";

const ACCOUNT_ID = "9ad4af47-5f1c-459a-9cd1-cae65b960fc7";
const ACTOR_ID = "5c790dc2-11c9-49af-aae5-95ef157cf763";
const ORGANIZATION_A = "10000000-0000-4000-8000-000000000001";
const ORGANIZATION_B = "10000000-0000-4000-8000-000000000002";

function createDatabase() {
  const memberships = new Map();
  const audit = [];
  const calls = [];
  const key = (accountId, organizationId) => `${accountId}:${organizationId}`;

  async function query(sql, values = []) {
    calls.push({ sql, values });
    if (/SELECT status[\s\S]*FOR UPDATE/.test(sql)) {
      const status = memberships.get(key(values[0], values[1]));
      return { rows: status ? [{ status }] : [] };
    }
    if (
      /SELECT status[\s\S]*FROM identity\.organization_memberships/.test(sql)
    ) {
      const status = memberships.get(key(values[0], values[1]));
      return { rows: status ? [{ status }] : [] };
    }
    if (/SELECT id FROM identity\.accounts/.test(sql)) {
      return { rows: [{ id: values[0] }] };
    }
    if (/INSERT INTO identity\.organization_memberships/.test(sql)) {
      memberships.set(key(values[0], values[1]), values[2]);
      return { rows: [] };
    }
    if (/INSERT INTO identity\.organization_membership_changes/.test(sql)) {
      audit.push({
        accountId: values[1],
        organizationId: values[2],
        previousStatus: values[3],
        newStatus: values[4],
        actorAccountId: values[5],
        changedAt: values[6],
      });
      return { rows: [] };
    }
    throw new Error("Unexpected SQL in membership repository test.");
  }

  return {
    memberships,
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

test("membership lookup is scoped to both the authenticated account and organization", async () => {
  const database = createDatabase();
  database.memberships.set(`${ACCOUNT_ID}:${ORGANIZATION_A}`, "approved");
  const repository = new IdentityOrganizationMembershipRepository(database);

  assert.equal(
    await repository.findMembershipStatus(ACCOUNT_ID, ORGANIZATION_A),
    "approved",
  );
  assert.equal(
    await repository.findMembershipStatus(ACCOUNT_ID, ORGANIZATION_B),
    "none",
  );
  const query = database.calls[1];
  assert.match(query.sql, /WHERE account_id = \$1 AND organization_id = \$2/);
  assert.deepEqual(query.values, [ACCOUNT_ID, ORGANIZATION_B]);
});

test("membership status changes are transactional, audited and idempotent", async () => {
  const database = createDatabase();
  const repository = new IdentityOrganizationMembershipRepository(database);
  const changedAt = new Date("2026-10-24T10:00:00.000Z");

  assert.equal(
    await repository.setMembershipStatus({
      accountId: ACCOUNT_ID,
      organizationId: ORGANIZATION_A,
      status: "pending",
      actorAccountId: ACTOR_ID,
      changedAt,
    }),
    true,
  );
  assert.equal(
    await repository.setMembershipStatus({
      accountId: ACCOUNT_ID,
      organizationId: ORGANIZATION_A,
      status: "pending",
      actorAccountId: ACTOR_ID,
      changedAt,
    }),
    false,
  );
  assert.equal(
    await repository.setMembershipStatus({
      accountId: ACCOUNT_ID,
      organizationId: ORGANIZATION_A,
      status: "approved",
      actorAccountId: ACTOR_ID,
      changedAt: new Date("2026-10-24T11:00:00.000Z"),
    }),
    true,
  );
  assert.equal(
    await repository.setMembershipStatus({
      accountId: ACCOUNT_ID,
      organizationId: ORGANIZATION_A,
      status: "revoked",
      actorAccountId: ACTOR_ID,
      changedAt: new Date("2026-10-24T12:00:00.000Z"),
    }),
    true,
  );

  assert.deepEqual(
    database.audit.map((change) => ({
      organizationId: change.organizationId,
      previousStatus: change.previousStatus,
      newStatus: change.newStatus,
      actorAccountId: change.actorAccountId,
    })),
    [
      {
        organizationId: ORGANIZATION_A,
        previousStatus: null,
        newStatus: "pending",
        actorAccountId: ACTOR_ID,
      },
      {
        organizationId: ORGANIZATION_A,
        previousStatus: "pending",
        newStatus: "approved",
        actorAccountId: ACTOR_ID,
      },
      {
        organizationId: ORGANIZATION_A,
        previousStatus: "approved",
        newStatus: "revoked",
        actorAccountId: ACTOR_ID,
      },
    ],
  );
  assert.equal(
    await repository.findMembershipStatus(ACCOUNT_ID, ORGANIZATION_A),
    "revoked",
  );
  assert.ok(
    database.calls.some((call) =>
      /SELECT id FROM identity\.accounts WHERE id = \$1 FOR UPDATE/.test(
        call.sql,
      ),
    ),
  );
});

test("invalid account, organization, actor and membership status values fail before SQL", async () => {
  const database = createDatabase();
  const repository = new IdentityOrganizationMembershipRepository(database);

  await assert.rejects(
    repository.findMembershipStatus("not-a-uuid", ORGANIZATION_A),
    /accountId must be a UUID/,
  );
  await assert.rejects(
    repository.findMembershipStatus(ACCOUNT_ID, "not-a-uuid"),
    /organizationId must be a UUID/,
  );
  await assert.rejects(
    repository.setMembershipStatus({
      accountId: ACCOUNT_ID,
      organizationId: ORGANIZATION_A,
      status: "active",
    }),
    /status must be pending, approved or revoked/,
  );
  await assert.rejects(
    repository.setMembershipStatus({
      accountId: ACCOUNT_ID,
      organizationId: ORGANIZATION_A,
      status: "approved",
      actorAccountId: "not-a-uuid",
    }),
    /actorAccountId must be a UUID/,
  );
  assert.equal(database.calls.length, 0);
});

test("recruiter claim requires both active global role and approved membership", () => {
  const base = {
    accountId: ACCOUNT_ID,
    organizationId: ORGANIZATION_A,
    evaluatedAt: "2026-10-24T10:00:00.000Z",
  };
  const recruiter = [{ role: "recruiter", status: "active" }];

  for (const membershipStatus of ["none", "pending", "revoked"]) {
    const context = createOrganizationAuthorizationContext({
      ...base,
      membershipStatus,
      assignments: recruiter,
    });
    assert.deepEqual(context.roles, []);
    assert.equal(context.membershipStatus, membershipStatus);
  }
  assert.deepEqual(
    createOrganizationAuthorizationContext({
      ...base,
      membershipStatus: "approved",
      assignments: recruiter,
    }).roles,
    ["recruiter"],
  );
  assert.deepEqual(
    createOrganizationAuthorizationContext({
      ...base,
      membershipStatus: "approved",
      assignments: [{ role: "recruiter", status: "inactive" }],
    }).roles,
    [],
  );
  assert.deepEqual(
    createOrganizationAuthorizationContext({
      ...base,
      membershipStatus: "approved",
      assignments: [{ role: "admin", status: "active" }],
    }).roles,
    [],
  );
  assert.throws(
    () =>
      createOrganizationAuthorizationContext({
        ...base,
        membershipStatus: "approved",
        assignments: [{ role: "recruiter", status: "active" }],
        organizationId: "not-a-uuid",
      }),
    /organizationId must be a UUID/,
  );
});
