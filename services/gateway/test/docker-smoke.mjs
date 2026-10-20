import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const image = process.env.CGN_GATEWAY_IMAGE ?? "cgn-gateway:docker-test";
const container = "cgn-gateway-smoke-" + process.pid;

function docker(args, options = {}) {
  return execFileSync("docker", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  }).trim();
}

async function waitForReady(baseUrl) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseUrl + "/ready", {
        signal: AbortSignal.timeout(1000),
      });
      if (response.status === 200) return;
      lastError = new Error("readiness returned " + response.status);
    } catch (error) {
      lastError = error;
    }
    await delay(500);
  }
  throw lastError ?? new Error("Gateway container did not become ready");
}

let containerStarted = false;
try {
  if (process.env.CGN_GATEWAY_IMAGE === undefined) {
    docker(["build", "-f", "services/gateway/Dockerfile", "-t", image, "."], {
      stdio: "inherit",
    });
  }

  docker([
    "run",
    "-d",
    "--name",
    container,
    "-e",
    "IDENTITY_BASE_URL=http://identity.invalid",
    "-p",
    "127.0.0.1::3000",
    image,
  ]);
  containerStarted = true;
  const mapping = docker(["port", container, "3000/tcp"]);
  const portMatch = mapping.match(/127\.0\.0\.1:(\d+)/);
  assert.ok(
    portMatch,
    "Docker did not report a loopback port mapping: " + mapping,
  );
  const baseUrl = "http://127.0.0.1:" + portMatch[1];
  await waitForReady(baseUrl);

  const health = await fetch(baseUrl + "/health");
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });
  const missing = await fetch(baseUrl + "/v1/not-configured/private");
  assert.equal(missing.status, 404);
  const missingBody = await missing.json();
  assert.equal(missingBody.error.code, "NOT_FOUND");

  const invalidConfig = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "-e",
      "PORT=invalid",
      "-e",
      "IDENTITY_BASE_URL=http://identity.invalid",
      image,
    ],
    { encoding: "utf8", timeout: 15000 },
  );
  assert.notEqual(invalidConfig.status, 0, "invalid config must fail closed");

  docker(["stop", "--time", "10", container]);
  containerStarted = false;
  assert.equal(
    docker(["inspect", "--format", "{{.State.ExitCode}}", container]),
    "0",
    "SIGTERM should trigger a clean Nest shutdown",
  );
  console.log("Gateway Docker smoke passed.");
} finally {
  spawnSync(
    "docker",
    containerStarted ? ["rm", "-f", container] : ["rm", container],
    { cwd: repoRoot, stdio: "ignore" },
  );
}
