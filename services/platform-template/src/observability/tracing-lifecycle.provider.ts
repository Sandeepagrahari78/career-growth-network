import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { shutdownTracing } from "@cgn/observability";

@Injectable()
export class TracingLifecycleProvider implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await shutdownTracing();
  }
}
