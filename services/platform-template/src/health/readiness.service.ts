import { Injectable, OnApplicationBootstrap } from "@nestjs/common";

@Injectable()
export class ReadinessService implements OnApplicationBootstrap {
  private ready = false;

  onApplicationBootstrap(): void {
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }
}
