export interface AppConfig {
  port: number;
  environment: "development" | "test" | "production";
  identityBaseUrl: string;
  identitySessionCookieName:
    | "cgn_identity_session"
    | "__Host-cgn_identity_session";
  upstreams: Record<string, string>;
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function serviceBaseUrl(value: string, name: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConfigurationError(name + " must be an absolute HTTP URL.");
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new ConfigurationError(
      name +
        " must be an origin URL without credentials, path, query, or fragment.",
    );
  }
  return parsed.origin;
}

function configuredUpstreams(value: string): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new ConfigurationError(
      "CGN_GATEWAY_UPSTREAMS must be a JSON object.",
    );
  }
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new ConfigurationError(
      "CGN_GATEWAY_UPSTREAMS must be a JSON object.",
    );
  }

  const upstreams: Record<string, string> = {};
  for (const [service, baseUrl] of Object.entries(parsed)) {
    if (
      !/^[a-z][a-z0-9-]{0,31}$/.test(service) ||
      typeof baseUrl !== "string"
    ) {
      throw new ConfigurationError(
        "CGN_GATEWAY_UPSTREAMS has an invalid service entry.",
      );
    }
    upstreams[service] = serviceBaseUrl(baseUrl, "CGN_GATEWAY_UPSTREAMS entry");
  }
  return upstreams;
}

export function loadAppConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const portValue = environment.PORT ?? "3000";
  const port = Number(portValue);
  if (
    !/^\d+$/.test(portValue) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new ConfigurationError("PORT must be an integer from 1 to 65535.");
  }

  const nodeEnvironment = environment.NODE_ENV ?? "development";
  if (
    nodeEnvironment !== "development" &&
    nodeEnvironment !== "test" &&
    nodeEnvironment !== "production"
  ) {
    throw new ConfigurationError(
      "NODE_ENV must be development, test, or production.",
    );
  }

  const identitySessionCookieName =
    environment.CGN_IDENTITY_SESSION_COOKIE_NAME ?? "cgn_identity_session";
  if (
    identitySessionCookieName !== "cgn_identity_session" &&
    identitySessionCookieName !== "__Host-cgn_identity_session"
  ) {
    throw new ConfigurationError(
      "CGN_IDENTITY_SESSION_COOKIE_NAME is not a supported Identity session cookie.",
    );
  }

  const identityBaseUrl = serviceBaseUrl(
    environment.IDENTITY_BASE_URL ?? "",
    "IDENTITY_BASE_URL",
  );
  if (
    nodeEnvironment === "production" &&
    !identityBaseUrl.startsWith("https://")
  ) {
    throw new ConfigurationError(
      "IDENTITY_BASE_URL must use HTTPS in production.",
    );
  }

  const upstreams = configuredUpstreams(
    environment.CGN_GATEWAY_UPSTREAMS ?? "{}",
  );
  if (nodeEnvironment === "production" && Object.keys(upstreams).length > 0) {
    throw new ConfigurationError(
      "Gateway upstream routing is disabled in production until CGN-101 establishes trusted service-to-service authentication.",
    );
  }

  return {
    port,
    environment: nodeEnvironment,
    identityBaseUrl,
    identitySessionCookieName,
    upstreams,
  };
}
