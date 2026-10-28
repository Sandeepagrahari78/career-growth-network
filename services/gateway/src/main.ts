import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";
import { loadAppConfig } from "./config/app-config.js";
import { ApiExceptionFilter } from "./http/api-exception.filter.js";
import { requestCorrelationMiddleware } from "./observability/request-correlation.middleware.js";
import { StructuredLogger } from "./observability/structured-logger.js";
import { createGatewayProxyMiddleware } from "./proxy/gateway-proxy.middleware.js";

async function bootstrap(): Promise<void> {
  const config = loadAppConfig();
  const logger = new StructuredLogger();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger,
    rawBody: true,
    bodyParser: false,
  });

  app.useBodyParser("raw", { type: "*/*", limit: "100kb" });
  app.use(requestCorrelationMiddleware(logger));
  app.use("/v1", createGatewayProxyMiddleware(config));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(config.port, "0.0.0.0");
  logger.log("service_started", "bootstrap");
}

bootstrap().catch((error: unknown) => {
  const logger = new StructuredLogger();
  if (error instanceof Error && error.name === "ConfigurationError") {
    logger.error("configuration_invalid", undefined, "bootstrap");
    process.stderr.write(error.message + "\n");
  } else {
    logger.error("service_start_failed", undefined, "bootstrap");
  }
  process.exitCode = 1;
});
