import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ReadinessService } from "./readiness.service.js";

@Controller()
export class HealthController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get("health")
  health(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  ready(): { status: "ready" } {
    if (!this.readiness.isReady()) {
      throw new ServiceUnavailableException({ status: "not_ready" });
    }
    return { status: "ready" };
  }
}
