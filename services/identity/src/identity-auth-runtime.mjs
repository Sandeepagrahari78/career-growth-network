import { IdentityAccountRepository } from "./account-repository.mjs";
import { IdentityAuthSessionRepository } from "./auth-session-repository.mjs";
import { IdentityApplicationRoleRepository } from "./application-role-repository.mjs";
import { IdentityOrganizationMembershipRepository } from "./organization-membership-repository.mjs";
import { createIdentityAuthHttpServer } from "./http-auth-server.mjs";
import { IdentityOidcAuthService } from "./oidc-auth-service.mjs";
import { loadIdentityOidcConfig } from "./oidc-config.mjs";

/** Compose Identity authentication with the owning Identity database adapter. */
export function createIdentityAuthRuntime({
  database,
  environment = process.env,
  logger,
  now,
  clientFactory,
}) {
  const config = loadIdentityOidcConfig(environment);
  const authService = new IdentityOidcAuthService({
    config,
    transactionAndSessionRepository: new IdentityAuthSessionRepository(
      database,
      config.encryptionKey,
    ),
    accountRepository: new IdentityAccountRepository(database),
    roleRepository: new IdentityApplicationRoleRepository(database),
    organizationMembershipRepository:
      new IdentityOrganizationMembershipRepository(database),
    ...(now ? { now } : {}),
    ...(clientFactory ? { clientFactory } : {}),
  });
  return {
    server: createIdentityAuthHttpServer({ authService, config, logger }),
  };
}
