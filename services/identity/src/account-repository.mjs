import { randomUUID } from "node:crypto";

const ACCOUNT_CONTRACT = "cgn.identity.account.v1";

function validateProviderSubject({ issuer, subject }) {
  if (typeof issuer !== "string" || issuer.length === 0) {
    throw new TypeError("OIDC issuer must be a non-empty string.");
  }
  if (typeof subject !== "string" || subject.length === 0) {
    throw new TypeError("OIDC subject must be a non-empty string.");
  }
}

function mapAccount(row) {
  if (!row) {
    return null;
  }

  return {
    contract: ACCOUNT_CONTRACT,
    accountId: row.accountId,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString(),
  };
}

export class IdentityAccountRepository {
  constructor(database) {
    if (
      typeof database?.query !== "function" ||
      typeof database?.withTransaction !== "function"
    ) {
      throw new TypeError(
        "Identity account repository requires query and withTransaction methods.",
      );
    }

    this.database = database;
  }

  async createAccountForProvider({ issuer, subject }) {
    validateProviderSubject({ issuer, subject });

    return this.database.withTransaction(async (transaction) => {
      const accountId = randomUUID();
      const accountResult = await transaction.query(
        `INSERT INTO identity.accounts (id)
         VALUES ($1)
         RETURNING id AS "accountId", created_at AS "createdAt"`,
        [accountId],
      );
      const account = accountResult.rows[0];
      if (!account) {
        throw new Error("Identity account insert returned no row.");
      }

      await transaction.query(
        `INSERT INTO identity.provider_subjects (issuer, subject, account_id)
         VALUES ($1, $2, $3)`,
        [issuer, subject, accountId],
      );

      return mapAccount(account);
    });
  }

  async findAccountByProviderSubject({ issuer, subject }) {
    validateProviderSubject({ issuer, subject });

    const result = await this.database.query(
      `SELECT a.id AS "accountId", a.created_at AS "createdAt"
       FROM identity.provider_subjects AS p
       JOIN identity.accounts AS a ON a.id = p.account_id
       WHERE p.issuer = $1 AND p.subject = $2`,
      [issuer, subject],
    );

    return mapAccount(result.rows[0]);
  }
}
