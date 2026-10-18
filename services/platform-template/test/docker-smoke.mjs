import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { clearTimeout } from "node:timers";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const image =
  process.env.CGN_TEMPLATE_IMAGE ?? "cgn-platform-template:docker-test";
const container = `cgn-template-smoke-${process.pid}`;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((resolveTimeout) => {
    timer = setTimeout(() => {
      controller.abort();
      resolveTimeout(undefined);
    }, 1000);
  });

  try {
    return await Promise.race([
      fetch(url, { signal: controller.signal }),
      timeout,
    ]);
  } catch {
    return undefined;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

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
      const response = await fetchWithTimeout(`${baseUrl}/ready`);
      if (response?.status === 200) {
        return;
      }
      lastError = new Error(
        response
          ? `readiness returned ${response.status}`
          : "readiness request timed out",
      );
    } catch (error) {
      lastError = error;
    }
    await delay(500);
  }
  throw lastError ?? new Error("container did not become ready");
}

let containerStarted = false;
try {
  if (process.env.CGN_TEMPLATE_IMAGE === undefined) {
    docker(
      [
        "build",
        "-f",
        "services/platform-template/Dockerfile",
        "-t",
        image,
        ".",
      ],
      { stdio: "inherit" },
    );
  }

  docker(["run", "-d", "--name", container, "-p", "127.0.0.1::3000", image]);
  containerStarted = true;
  const mapping = docker(["port", container, "3000/tcp"]);
  const portMatch = mapping.match(/127\.0\.0\.1:(\d+)/);
  assert.ok(
    portMatch,
    `Docker did not report a loopback port mapping: ${mapping}`,
  );
  const baseUrl = `http://127.0.0.1:${portMatch[1]}`;
  await waitForReady(baseUrl);

  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });

  const missing = await fetch(`${baseUrl}/not-a-business-route`);
  assert.equal(missing.status, 404);
  const requestId = missing.headers.get("x-request-id");
  assert.ok(requestId);
  assert.deepEqual(await missing.json(), {
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found.",
      requestId,
    },
  });

  const invalidConfig = spawnSync(
    "docker",
    ["run", "--rm", "-e", "PORT=invalid", image],
    { encoding: "utf8", timeout: 15000 },
  );
  assert.notEqual(
    invalidConfig.status,
    0,
    "invalid container configuration must fail closed",
  );

  docker(["stop", "--time", "10", container]);
  containerStarted = false;
  const exitCode = docker([
    "inspect",
    "--format",
    "{{.State.ExitCode}}",
    container,
  ]);
  assert.equal(exitCode, "0", "SIGTERM should trigger a clean Nest shutdown");
  console.log("Platform template Docker smoke passed.");
} finally {
  if (containerStarted) {
    spawnSync("docker", ["rm", "-f", container], {
      cwd: repoRoot,
      stdio: "ignore",
    });
  } else {
    spawnSync("docker", ["rm", container], { cwd: repoRoot, stdio: "ignore" });
  }
}
