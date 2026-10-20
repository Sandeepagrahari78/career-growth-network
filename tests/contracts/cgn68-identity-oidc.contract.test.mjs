import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const providerSchema = JSON.parse(
  readFileSync(
    "packages/contracts/schemas/identity-oidc-provider-config.v1.schema.json",
    "utf8",
  ),
);
const sessionSchema = JSON.parse(
  readFileSync(
    "packages/contracts/schemas/identity-auth-session.v1.schema.json",
    "utf8",
  ),
);
const providerTypes = readFileSync(
  "packages/contracts/src/identity/identity-oidc-provider.v1.ts",
  "utf8",
);
const identityRuntime = readFileSync(
  "services/identity/src/oidc-auth-service.mjs",
  "utf8",
);
const authServer = readFileSync(
  "services/identity/src/http-auth-server.mjs",
  "utf8",
);
const migration = readFileSync(
  "services/identity/migrations/002_identity_auth_sessions.up.sql",
  "utf8",
);
const rollback = readFileSync(
  "services/identity/migrations/002_identity_auth_sessions.down.sql",
  "utf8",
);
const keycloakCompose = readFileSync(
  "services/identity/keycloak/docker-compose.yml",
  "utf8",
);
const keycloakRealm = JSON.parse(
  readFileSync(
    "services/identity/keycloak/realm-export/cgn-local-realm.json",
    "utf8",
  ),
);
const googleSetup = readFileSync(
  "services/identity/keycloak/configure-google-broker.mjs",
  "utf8",
);
const identityPackage = JSON.parse(
  readFileSync("services/identity/package.json", "utf8"),
);
const changeDetector = readFileSync("scripts/ci/detect-changes.mjs", "utf8");
const ciWorkflow = readFileSync(".github/workflows/pr-ci.yml", "utf8");

test("Identity OIDC contracts expose safe provider settings and token-free sessions", () => {
  assert.equal(
    providerSchema.properties.contract.const,
    "cgn.identity.oidc-provider-config.v1",
  );
  assert.equal(providerSchema.additionalProperties, false);
  assert.ok(providerSchema.required.includes("googleBrokerHintParameterEnv"));
  assert.equal(
    providerSchema.properties.clientSecretEnv.const,
    "CGN_IDENTITY_OIDC_CLIENT_SECRET",
  );
  assert.equal(
    sessionSchema.properties.contract.const,
    "cgn.identity.auth-session.v1",
  );
  assert.equal(sessionSchema.additionalProperties, false);
  assert.deepEqual(Object.keys(sessionSchema.properties).sort(), [
    "accountId",
    "authenticatedAt",
    "contract",
    "expiresAt",
  ]);
  assert.match(providerTypes, /IdentityOidcProviderConfigV1/);
  assert.match(providerTypes, /IdentityAuthSessionV1/);
});

test("OIDC callback validation, account mapping and durable sessions stay in Identity", () => {
  assert.match(identityRuntime, /enableNonRepudiationChecks\(client\)/);
  assert.match(identityRuntime, /expectedState: state/);
  assert.match(identityRuntime, /expectedNonce: transaction\.nonce/);
  assert.match(identityRuntime, /pkceCodeVerifier: transaction\.codeVerifier/);
  assert.match(identityRuntime, /findAccountByProviderSubject/);
  assert.doesNotMatch(identityRuntime, /findAccountByEmail|email.*merge/i);
  assert.match(migration, /CREATE TABLE identity\.oidc_login_transactions/);
  assert.match(migration, /CREATE TABLE identity\.auth_sessions/);
  assert.match(
    migration,
    /REFERENCES identity\.accounts \(id\) ON DELETE CASCADE/,
  );
  assert.match(migration, /refresh_token_ciphertext/);
  assert.match(migration, /session_id_hash/);
  assert.match(rollback, /DROP TABLE IF EXISTS identity\.auth_sessions/);
  assert.match(
    rollback,
    /DROP TABLE IF EXISTS identity\.oidc_login_transactions/,
  );
});

test("auth routes and local Keycloak enforce PKCE, exact loopback callbacks and secret boundaries", () => {
  for (const route of [
    "authorize",
    "callback",
    "session",
    "refresh",
    "logout",
  ]) {
    assert.match(authServer, new RegExp(`/v1/identity/auth/${route}`));
  }
  assert.match(keycloakCompose, /quay\.io\/keycloak\/keycloak:26\.8\.1/);
  assert.match(keycloakCompose, /127\.0\.0\.1:18080:8080/);
  assert.match(keycloakCompose, /:\s*ro\s*$/m);
  assert.equal(keycloakRealm.registrationAllowed, true);
  assert.equal(keycloakRealm.duplicateEmailsAllowed, false);
  assert.equal(keycloakRealm.clients[0].publicClient, true);
  assert.equal(
    keycloakRealm.clients[0].attributes["pkce.code.challenge.method"],
    "S256",
  );
  assert.equal(keycloakRealm.clients[0].implicitFlowEnabled, false);
  assert.equal(keycloakRealm.clients[0].directAccessGrantsEnabled, false);
  assert.deepEqual(keycloakRealm.clients[0].redirectUris, [
    "http://127.0.0.1:3000/v1/identity/auth/callback",
  ]);
  assert.match(googleSetup, /CGN_GOOGLE_OAUTH_CLIENT_SECRET/);
  assert.match(googleSetup, /firstBrokerLoginFlowAlias: "first broker login"/);
  assert.match(googleSetup, /trustEmail: false/);
  assert.doesNotMatch(googleSetup, /AIza[\w-]{30,}|GOCSPX-[\w-]{20,}/);
  assert.equal(identityPackage.dependencies["openid-client"], "6.8.8");
  assert.match(changeDetector, /services\/identity\/migrations\//);
  assert.match(
    ciWorkflow,
    /Verify Identity schema, uniqueness, access boundary and rollback[\s\S]*?node services\/identity\/test\/postgres-acceptance\.mjs/,
  );
});
