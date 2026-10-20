import { Buffer } from "node:buffer";
import { URL } from "node:url";

const IDENTITY_OIDC_PROVIDER_CONFIG_CONTRACT =
  "cgn.identity.oidc-provider-config.v1";

export class IdentityAuthConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "IdentityAuthConfigurationError";
  }
}

function required(environment, name) {
  const value = environment[name]?.trim();
  if (!value) {
    throw new IdentityAuthConfigurationError(`${name} is required.`);
  }
  return value;
}

function absoluteUrl(value, name, environment) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new IdentityAuthConfigurationError(
      `${name} must be an absolute URL.`,
    );
  }
  const localDevelopmentHttp =
    environment !== "production" &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" && !localDevelopmentHttp)
  ) {
    throw new IdentityAuthConfigurationError(`${name} is not an approved URL.`);
  }
  return url;
}

function integerSetting(environment, name, fallback, minimum, maximum) {
  const raw = environment[name] ?? String(fallback);
  if (!/^\d+$/.test(raw)) {
    throw new IdentityAuthConfigurationError(
      `${name} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new IdentityAuthConfigurationError(
      `${name} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  return value;
}

export function loadIdentityOidcConfig(environment = process.env) {
  const nodeEnvironment = environment.NODE_ENV ?? "development";
  if (!["development", "test", "production"].includes(nodeEnvironment)) {
    throw new IdentityAuthConfigurationError("NODE_ENV is invalid.");
  }

  const issuer = absoluteUrl(
    required(environment, "CGN_IDENTITY_OIDC_ISSUER"),
    "CGN_IDENTITY_OIDC_ISSUER",
    nodeEnvironment,
  );
  const redirectUri = absoluteUrl(
    required(environment, "CGN_IDENTITY_OIDC_REDIRECT_URI"),
    "CGN_IDENTITY_OIDC_REDIRECT_URI",
    nodeEnvironment,
  );
  const postLogoutRedirectUri = absoluteUrl(
    required(environment, "CGN_IDENTITY_OIDC_POST_LOGOUT_REDIRECT_URI"),
    "CGN_IDENTITY_OIDC_POST_LOGOUT_REDIRECT_URI",
    nodeEnvironment,
  );
  const clientAuthentication =
    environment.CGN_IDENTITY_OIDC_CLIENT_AUTHENTICATION ??
    (environment.CGN_IDENTITY_OIDC_CLIENT_SECRET
      ? "client_secret_basic"
      : "none");
  if (!["none", "client_secret_basic"].includes(clientAuthentication)) {
    throw new IdentityAuthConfigurationError(
      "CGN_IDENTITY_OIDC_CLIENT_AUTHENTICATION must be none or client_secret_basic.",
    );
  }
  const clientSecret = environment.CGN_IDENTITY_OIDC_CLIENT_SECRET?.trim();
  if (clientAuthentication === "client_secret_basic" && !clientSecret) {
    throw new IdentityAuthConfigurationError(
      "CGN_IDENTITY_OIDC_CLIENT_SECRET is required for client_secret_basic.",
    );
  }
  if (nodeEnvironment === "production" && clientAuthentication === "none") {
    throw new IdentityAuthConfigurationError(
      "Production Identity OIDC clients must use client_secret_basic.",
    );
  }
  if (
    clientAuthentication === "none" &&
    clientSecret &&
    environment.CGN_IDENTITY_OIDC_CLIENT_AUTHENTICATION === "none"
  ) {
    throw new IdentityAuthConfigurationError(
      "Do not provide a client secret when client authentication is none.",
    );
  }

  const encryptionKeyValue = required(
    environment,
    "CGN_IDENTITY_SESSION_ENCRYPTION_KEY",
  );
  const encryptionKey = Buffer.from(encryptionKeyValue, "base64");
  if (
    encryptionKey.length !== 32 ||
    encryptionKey.toString("base64") !== encryptionKeyValue
  ) {
    throw new IdentityAuthConfigurationError(
      "CGN_IDENTITY_SESSION_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }

  const clientId = required(environment, "CGN_IDENTITY_OIDC_CLIENT_ID");
  const googleBrokerAlias =
    environment.CGN_IDENTITY_GOOGLE_BROKER_ALIAS?.trim() || "google";
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(googleBrokerAlias)) {
    throw new IdentityAuthConfigurationError(
      "CGN_IDENTITY_GOOGLE_BROKER_ALIAS is invalid.",
    );
  }
  const googleBrokerHintParameter =
    environment.CGN_IDENTITY_GOOGLE_BROKER_HINT_PARAMETER?.trim() ||
    "kc_idp_hint";
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(googleBrokerHintParameter)) {
    throw new IdentityAuthConfigurationError(
      "CGN_IDENTITY_GOOGLE_BROKER_HINT_PARAMETER is invalid.",
    );
  }

  const sessionLifetimeSeconds = integerSetting(
    environment,
    "CGN_IDENTITY_SESSION_LIFETIME_SECONDS",
    28_800,
    300,
    604_800,
  );
  const loginTransactionLifetimeSeconds = integerSetting(
    environment,
    "CGN_IDENTITY_LOGIN_TRANSACTION_LIFETIME_SECONDS",
    600,
    60,
    900,
  );

  return Object.freeze({
    contract: IDENTITY_OIDC_PROVIDER_CONFIG_CONTRACT,
    issuer: issuer.href,
    clientId,
    clientAuthentication,
    clientSecret:
      clientAuthentication === "client_secret_basic" ? clientSecret : undefined,
    redirectUri: redirectUri.href,
    postLogoutRedirectUri: postLogoutRedirectUri.href,
    googleBrokerAlias,
    googleBrokerHintParameter,
    encryptionKey,
    cookieSecure: nodeEnvironment === "production",
    sessionLifetimeSeconds,
    loginTransactionLifetimeSeconds,
    environment: nodeEnvironment,
  });
}
