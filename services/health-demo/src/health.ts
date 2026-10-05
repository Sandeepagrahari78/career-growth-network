export type HealthPayload = {
  status: "ok";
  service: "cgn-health-demo";
  version: 1;
  timestamp: string;
};

export function createHealthPayload(now = new Date()): HealthPayload {
  return {
    status: "ok",
    service: "cgn-health-demo",
    version: 1,
    timestamp: now.toISOString(),
  };
}
