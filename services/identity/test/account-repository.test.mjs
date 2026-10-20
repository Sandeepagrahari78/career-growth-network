import assert from "node:assert/strict";
import test from "node:test";

import { IdentityAccountRepository } from "../src/account-repository.mjs";

function createDatabase({ failSubjectInsert = false } = {}) {
  const calls = [];
  let transactionState = "idle";
  const database = {
    calls,
    get transactionState() {
      return transactionState;
    },
    async query(sql, values) {
      calls.push({ sql, values, transaction: false });
      return { rows: [] };
    },
    async withTransaction(callback) {
      transactionState = "active";
      const transaction = {
        async query(sql, values) {
          calls.push({ sql, values, transaction: true });
          if (failSubjectInsert && sql.includes("identity.provider_subjects")) {
            throw new Error("duplicate provider subject");
          }
          return {
            rows: [
              {
                accountId: values[0],
                createdAt: "2026-10-20T00:00:00.000Z",
              },
            ],
          };
        },
      };

      try {
        const result = await callback(transaction);
        transactionState = "committed";
        return result;
      } catch (error) {
        transactionState = "rolled back";
        throw error;
      }
    },
  };

  return database;
}

test("creates an internal UUID and links the exact opaque provider subject", async () => {
  const database = createDatabase();
  const repository = new IdentityAccountRepository(database);
  const account = await repository.createAccountForProvider({
    issuer: "https://login.example.test/",
    subject: "opaque:Subject/CaseSensitive",
  });

  assert.match(
    account.accountId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  assert.equal(account.contract, "cgn.identity.account.v1");
  assert.equal(account.createdAt, "2026-10-20T00:00:00.000Z");
  assert.equal(database.transactionState, "committed");
  assert.equal(database.calls.length, 2);
  assert.deepEqual(database.calls[1].values, [
    "https://login.example.test/",
    "opaque:Subject/CaseSensitive",
    account.accountId,
  ]);
  assert.match(database.calls[1].sql, /VALUES \(\$1, \$2, \$3\)/);
  assert.doesNotMatch(JSON.stringify(account), /subject|issuer/i);
});

test("rolls back the account insert when provider subject linking fails", async () => {
  const database = createDatabase({ failSubjectInsert: true });
  const repository = new IdentityAccountRepository(database);

  await assert.rejects(
    repository.createAccountForProvider({
      issuer: "https://issuer.example.test",
      subject: "subject-1",
    }),
    /duplicate provider subject/,
  );
  assert.equal(database.transactionState, "rolled back");
  assert.equal(database.calls.length, 2);
});

test("looks up only the Identity account record with parameterized provider keys", async () => {
  const database = createDatabase();
  database.query = async (sql, values) => {
    database.calls.push({ sql, values, transaction: false });
    return {
      rows: [
        {
          accountId: "af8c7eb1-36c5-420f-84c3-0c4a0cb0b607",
          createdAt: new Date("2026-10-20T00:00:00.000Z"),
        },
      ],
    };
  };
  const repository = new IdentityAccountRepository(database);
  const account = await repository.findAccountByProviderSubject({
    issuer: "https://issuer.example.test",
    subject: "arbitrary'; DROP TABLE identity.accounts; --",
  });

  assert.deepEqual(account, {
    contract: "cgn.identity.account.v1",
    accountId: "af8c7eb1-36c5-420f-84c3-0c4a0cb0b607",
    createdAt: "2026-10-20T00:00:00.000Z",
  });
  assert.deepEqual(database.calls[0].values, [
    "https://issuer.example.test",
    "arbitrary'; DROP TABLE identity.accounts; --",
  ]);
  assert.match(
    database.calls[0].sql,
    /WHERE p\.issuer = \$1 AND p\.subject = \$2/,
  );
  const selectedColumns = database.calls[0].sql.match(
    /SELECT\s+([\s\S]*?)\s+FROM/i,
  )?.[1];
  assert.ok(selectedColumns);
  assert.doesNotMatch(selectedColumns, /p\.subject/i);
});

test("returns null for an unmapped provider subject and rejects empty keys", async () => {
  const database = createDatabase();
  const repository = new IdentityAccountRepository(database);
  assert.equal(
    await repository.findAccountByProviderSubject({
      issuer: "https://issuer.example.test",
      subject: "missing",
    }),
    null,
  );
  await assert.rejects(
    repository.createAccountForProvider({ issuer: "", subject: "valid" }),
    /issuer must be a non-empty string/,
  );
  await assert.rejects(
    repository.findAccountByProviderSubject({ issuer: "valid", subject: "" }),
    /subject must be a non-empty string/,
  );
});
