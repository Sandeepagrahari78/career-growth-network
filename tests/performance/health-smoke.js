import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 2,
  duration: "10s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || "http://host.docker.internal:3001";
  const response = http.get(`${baseUrl}/health`);

  check(response, {
    "health returns 200": (res) => res.status === 200,
    "health body is ok": (res) => res.json("status") === "ok",
  });

  sleep(1);
}
