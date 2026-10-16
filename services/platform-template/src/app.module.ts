import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller.js";
import { ReadinessService } from "./health/readiness.service.js";

@Module({
  controllers: [HealthController],
  providers: [ReadinessService],
})
export class AppModule {}
