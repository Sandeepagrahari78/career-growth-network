import http from "k6/http";
import { check } from "k6";

const targetRps = Number(__ENV.TARGET_RPS || 25);
const duration = __ENV.PROFILE_DURATION || "30s";
const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:3001";

export const options = {
  scenarios: {
    healthDemoBaseline: {
      executor: "constant-arrival-rate",
      rate: targetRps,
      timeUnit: "1s",
      duration,
      preAllocatedVUs: 100,
      maxVUs: 100,
    },
  },
  thresholds: {
    checks: ["rate>0.995"],
    http_req_failed: ["rate<0.005"],
    http_req_duration: ["p(95)<400"],
  },
};

export default function () {
  const response = http.get(`${baseUrl}/health`);
  check(response, {
    "health returns 200": (res) => res.status === 200,
    "health body is ok": (res) => res.json("status") === "ok",
  });
}
