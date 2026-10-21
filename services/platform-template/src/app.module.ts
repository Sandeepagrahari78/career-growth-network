import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller.js";
import { ReadinessService } from "./health/readiness.service.js";
import { TracingLifecycleProvider } from "./observability/tracing-lifecycle.provider.js";

@Module({
  controllers: [HealthController],
  providers: [ReadinessService, TracingLifecycleProvider],
})
export class AppModule {}
