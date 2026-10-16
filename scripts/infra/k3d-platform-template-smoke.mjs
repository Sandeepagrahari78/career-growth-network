import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { clearTimeout } from "node:timers";
import { setTimeout as delay } from "node:timers/promises";
import { createServer } from "node:net";

const cluster = "cgn-local";
const namespace = `cgn-cgn34-staging-${process.pid}`;
const release = "platform-template";
const image = "cgn-platform-template:cgn34";

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

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
  });
  return (output ?? "").trim();
}

function commandExists(command, args) {
  try {
    run(command, args);
    return true;
  } catch {
    return false;
  }
}

async function reserveLocalPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return address.port;
}

async function waitForHttp(baseUrl) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/ready`);
      if (response?.status === 200) {
        return;
      }
      lastError = new Error(
        response
          ? `ready endpoint returned ${response.status}`
          : "readiness request timed out",
      );
    } catch (error) {
      lastError = error;
    }
    await delay(500);
  }
  throw lastError ?? new Error("port-forward did not become ready");
}

if (!commandExists("k3d", ["version"])) {
  throw new Error("k3d is required for CGN-34 staging acceptance.");
}
if (!commandExists("kubectl", ["version", "--client=true"])) {
  throw new Error("kubectl is required for CGN-34 staging acceptance.");
}
if (!commandExists("helm", ["version", "--short"])) {
  throw new Error("helm is required for CGN-34 staging acceptance.");
}

const clusters = run("k3d", ["cluster", "list", "--no-headers"]);
assert.ok(
  clusters
    .split(/\r?\n/)
    .some((line) => line.trim().split(/\s+/)[0] === cluster),
  `Expected existing ${cluster} cluster; this acceptance script never creates or deletes clusters.`,
);

run("k3d", ["image", "import", image, "--cluster", cluster], { inherit: true });
run("kubectl", ["create", "namespace", namespace], { inherit: true });

let portForward;
try {
  run(
    "helm",
    [
      "upgrade",
      "--install",
      release,
      "infra/helm/cgn-service",
      "--namespace",
      namespace,
      "--values",
      "infra/helm/values/platform-template-cgn34-staging.yaml",
      "--set",
      `image.tag=${image.split(":")[1]}`,
      "--wait",
      "--timeout",
      "180s",
    ],
    { inherit: true },
  );
  run(
    "kubectl",
    [
      "-n",
      namespace,
      "rollout",
      "status",
      "deployment/cgn-platform-template",
      "--timeout=180s",
    ],
    { inherit: true },
  );

  const podJson = JSON.parse(
    run("kubectl", [
      "-n",
      namespace,
      "get",
      "pods",
      "-l",
      "app.kubernetes.io/name=cgn-platform-template",
      "-o",
      "json",
    ]),
  );
  assert.equal(podJson.items.length, 1, "expected one temporary staging pod");
  const containerSpec = podJson.items[0].spec.containers[0];
  assert.equal(containerSpec.startupProbe?.httpGet?.path, "/health");
  assert.equal(containerSpec.readinessProbe?.httpGet?.path, "/ready");
  assert.equal(containerSpec.livenessProbe?.httpGet?.path, "/health");
  assert.equal(podJson.items[0].status.containerStatuses[0].ready, true);

  const port = await reserveLocalPort();
  const child = await import("node:child_process");
  portForward = child.spawn(
    "kubectl",
    [
      "-n",
      namespace,
      "port-forward",
      "service/cgn-platform-template",
      `${port}:3000`,
    ],
    { stdio: "ignore", windowsHide: true },
  );
  await waitForHttp(`http://127.0.0.1:${port}`);

  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });

  const ready = await fetch(`http://127.0.0.1:${port}/ready`);
  assert.equal(ready.status, 200);
  assert.deepEqual(await ready.json(), { status: "ready" });

  const missing = await fetch(`http://127.0.0.1:${port}/unknown-cgn34-route`);
  assert.equal(missing.status, 404);
  assert.ok(missing.headers.get("x-request-id"));

  console.log(
    JSON.stringify(
      {
        result: "passed",
        cluster,
        namespace,
        release,
        image,
        startupProbe: containerSpec.startupProbe.httpGet.path,
        readinessProbe: containerSpec.readinessProbe.httpGet.path,
        healthStatus: health.status,
        readyStatus: ready.status,
        unknownRouteStatus: missing.status,
      },
      null,
      2,
    ),
  );
} finally {
  if (portForward && !portForward.killed) {
    await new Promise((resolve) => {
      portForward.once("exit", resolve);
      portForward.kill("SIGTERM");
      setTimeout(resolve, 3000).unref();
    });
  }
  run(
    "kubectl",
    ["delete", "namespace", namespace, "--wait=true", "--timeout=180s"],
    { inherit: true },
  );
}
