export interface AppConfig {
  port: number;
  environment: "development" | "test" | "production";
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
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

  return { port, environment: nodeEnvironment };
}
