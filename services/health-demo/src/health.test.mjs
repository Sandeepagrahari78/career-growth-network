import { createHealthPayload } from "./health.ts";

describe("CGN health payload", () => {
  it("returns deterministic service identity and status", () => {
    const now = new Date("2026-10-05T00:00:00.000Z");
    expect(createHealthPayload(now)).toEqual({
      status: "broken",
      service: "cgn-health-demo",
      version: 1,
      timestamp: "2026-10-05T00:00:00.000Z",
    });
  });
});
