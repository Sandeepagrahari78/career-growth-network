import { URL, URLSearchParams } from "node:url";

const alias = process.env.CGN_IDENTITY_GOOGLE_BROKER_ALIAS?.trim() || "google";
const baseUrl =
  process.env.CGN_KEYCLOAK_ADMIN_URL?.trim() || "http://127.0.0.1:18080";
const adminUsername = process.env.CGN_KEYCLOAK_ADMIN_USERNAME?.trim();
const adminPassword = process.env.CGN_KEYCLOAK_ADMIN_PASSWORD;
const googleClientId = process.env.CGN_GOOGLE_OAUTH_CLIENT_ID?.trim();
const googleClientSecret = process.env.CGN_GOOGLE_OAUTH_CLIENT_SECRET;

function requireValue(value, name) {
  if (!value) {
    throw new Error(`${name} must be set in the local secret environment.`);
  }
  return value;
}

let keycloakUrl;
try {
  keycloakUrl = new URL(baseUrl);
} catch {
  throw new Error("CGN_KEYCLOAK_ADMIN_URL must be a local absolute URL.");
}
if (
  keycloakUrl.protocol !== "http:" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(keycloakUrl.hostname) ||
  keycloakUrl.username ||
  keycloakUrl.password ||
  keycloakUrl.search ||
  keycloakUrl.hash
) {
  throw new Error(
    "Google broker setup is limited to the local Keycloak instance.",
  );
}
if (!/^[a-zA-Z0-9._-]{1,64}$/.test(alias)) {
  throw new Error("CGN_IDENTITY_GOOGLE_BROKER_ALIAS is invalid.");
}
const resolvedAdminUsername = requireValue(
  adminUsername,
  "CGN_KEYCLOAK_ADMIN_USERNAME",
);
const resolvedAdminPassword = requireValue(
  adminPassword,
  "CGN_KEYCLOAK_ADMIN_PASSWORD",
);
const resolvedGoogleClientId = requireValue(
  googleClientId,
  "CGN_GOOGLE_OAUTH_CLIENT_ID",
);
const resolvedGoogleClientSecret = requireValue(
  googleClientSecret,
  "CGN_GOOGLE_OAUTH_CLIENT_SECRET",
);

const tokenUrl = new URL(
  "/realms/master/protocol/openid-connect/token",
  keycloakUrl,
);
const adminResponse = await fetch(tokenUrl, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "password",
    client_id: "admin-cli",
    username: resolvedAdminUsername,
    password: resolvedAdminPassword,
  }),
});
if (!adminResponse.ok) {
  throw new Error(
    "Could not authenticate to local Keycloak admin API (response redacted).",
  );
}
const accessToken = (await adminResponse.json()).access_token;
if (!accessToken) {
  throw new Error("Local Keycloak did not issue an admin access token.");
}

const apiUrl = new URL(
  "/admin/realms/cgn-local/identity-provider/instances",
  keycloakUrl,
);
const headers = {
  authorization: `Bearer ${accessToken}`,
  "content-type": "application/json",
};
const listing = await fetch(apiUrl, {
  headers: { authorization: headers.authorization },
});
if (!listing.ok) {
  throw new Error(
    "Could not read local Keycloak identity providers (response redacted).",
  );
}
const providers = await listing.json();
const existing = providers.find((provider) => provider.alias === alias);
const providerUrl = new URL(
  `${apiUrl.pathname}/${encodeURIComponent(alias)}`,
  keycloakUrl,
);
const provider = {
  alias,
  displayName: "Google",
  providerId: "google",
  enabled: true,
  trustEmail: false,
  firstBrokerLoginFlowAlias: "first broker login",
  syncMode: "IMPORT",
  config: {
    clientId: resolvedGoogleClientId,
    clientSecret: resolvedGoogleClientSecret,
    defaultScope: "openid email profile",
  },
};
const saved = await fetch(existing ? providerUrl : apiUrl, {
  method: existing ? "PUT" : "POST",
  headers,
  body: JSON.stringify(provider),
});
if (!saved.ok) {
  throw new Error(
    "Could not configure the local Google broker (response redacted).",
  );
}
process.stdout.write(`Configured local Keycloak Google broker '${alias}'.\n`);
