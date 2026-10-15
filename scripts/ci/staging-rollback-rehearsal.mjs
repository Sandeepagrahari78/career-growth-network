import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const sha = process.env.GITHUB_SHA || "local-rehearsal";
const suffix = sha.slice(0, 12).replace(/[^a-z0-9-]/gi, "-");
const knownGoodImage = "cgn-rehearsal-good:" + suffix;
const faultyImage = "cgn-rehearsal-fault:" + suffix;
const goodContainer = "cgn-rehearsal-good";
const faultyContainer = "cgn-rehearsal-fault";
const baseUrl = "http://127.0.0.1:3001";

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

function removeContainer(name) {
  spawnSync("docker", ["rm", "-f", name], { stdio: "ignore" });
}

async function expectHttp(path, status) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseUrl + path, {
        signal: AbortSignal.timeout(1500),
      });
      if (response.status === status) {
        return response.json();
      }
    } catch {
      // Container may still be starting.
    }
    await sleep(750);
  }
  throw new Error("Expected " + path + " HTTP " + status + " but timed out");
}

function startContainer(name, image) {
  run("docker", [
    "run",
    "-d",
    "--name",
    name,
    "-p",
    "127.0.0.1:3001:3001",
    image,
  ]);
}

const scratch = mkdtempSync(join(tmpdir(), "cgn-staging-rollback-"));

try {
  console.log("Building known-good CGN health-demo image...");
  run("docker", [
    "build",
    "-f",
    "services/health-demo/Dockerfile",
    "-t",
    knownGoodImage,
    ".",
  ]);
  startContainer(goodContainer, knownGoodImage);

  const originalHealth = await expectHttp("/health", 200);
  const originalReady = await expectHttp("/ready", 200);
  assert.equal(originalHealth.status, "ok");
  assert.equal(originalReady.status, "ready");
  run("node", ["tests/e2e/health-demo.e2e.mjs"], {
    env: { ...process.env, BASE_URL: baseUrl },
  });
  console.log("Baseline ephemeral staging deployment: HEALTHY.");

  removeContainer(goodContainer);

  writeFileSync(
    join(scratch, "Dockerfile"),
    'FROM node:22-alpine\nWORKDIR /app\nCOPY fault.mjs ./fault.mjs\nUSER node\nEXPOSE 3001\nCMD ["node", "fault.mjs"]\n',
  );
  writeFileSync(
    join(scratch, "fault.mjs"),
    "import { createServer } from 'node:http';\n" +
      "createServer((req,res)=>{res.writeHead(503, {'content-type':'application/json'});res.end(JSON.stringify({status:'unhealthy',faultInjected:true}));}).listen(3001,'0.0.0.0');\n",
  );
  run("docker", ["build", "-t", faultyImage, scratch]);
  startContainer(faultyContainer, faultyImage);

  const failedHealth = await expectHttp("/health", 503);
  const failedReady = await expectHttp("/ready", 503);
  assert.equal(failedHealth.faultInjected, true);
  assert.equal(failedReady.faultInjected, true);
  console.log(
    "Intentionally bad staging candidate rejected by readiness checks.",
  );

  removeContainer(faultyContainer);
  startContainer(goodContainer, knownGoodImage);

  const restoredHealth = await expectHttp("/health", 200);
  const restoredReady = await expectHttp("/ready", 200);
  assert.equal(restoredHealth.status, "ok");
  assert.equal(restoredReady.status, "ready");
  run("node", ["tests/e2e/health-demo.e2e.mjs"], {
    env: { ...process.env, BASE_URL: baseUrl },
  });

  const evidence = {
    schema: "cgn.staging-rollback-rehearsal.v1",
    ticket: "CGN-227",
    mode: "ephemeral-staging-rehearsal",
    sha,
    knownGoodImage,
    injectedFaultImage: faultyImage,
    baselineHealth: "passed",
    baselineReadiness: "passed",
    baselineE2E: "passed",
    injectedHealthStatus: 503,
    injectedReadinessStatus: 503,
    failureDetected: true,
    rollbackToKnownGood: true,
    restoredHealth: "passed",
    restoredReadiness: "passed",
    restoredE2E: "passed",
    realProductionDeployment: false,
    realProductionRollback: false,
    validatedAt: new Date().toISOString(),
  };
  mkdirSync(".local/rehearsal", { recursive: true });
  writeFileSync(
    ".local/rehearsal/rollback-evidence.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(
    "PASS: unhealthy staging candidate detected and known-good image restored.",
  );
} finally {
  removeContainer(faultyContainer);
  removeContainer(goodContainer);
  rmSync(scratch, { recursive: true, force: true });
}
