import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const composeFile = "infra/docker/docker-compose.valkey.yml";

export function composeArgs(args) {
  return ["compose", "-f", composeFile, ...args];
}

function compose(args, { capture = true } = {}) {
  const options = {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  };

  if (capture) {
    options.encoding = "utf8";
  } else {
    options.stdio = "inherit";
  }

  return execFileSync("docker", composeArgs(args), options);
}

function valkey(args) {
  return compose(["exec", "-T", "valkey", "valkey-cli", "--raw", ...args]);
}

function sleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

async function waitUntilReady() {
  let lastError;
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      assert.equal(valkey(["PING"]).trim(), "PONG");
      console.log("Local Valkey is healthy.");
      return;
    } catch (error) {
      lastError = error;
      await sleep(1000);
    }
  }

  throw new Error(
    `Local Valkey did not become healthy within 60 seconds: ${lastError?.message ?? "unknown error"}`,
  );
}

export async function up() {
  execFileSync("docker", ["info"], { stdio: "ignore" });
  compose(["up", "-d", "valkey"], { capture: false });
  await waitUntilReady();
}

export async function verify() {
  assert.equal(valkey(["PING"]).trim(), "PONG");

  const ttlKey = `cgn:local:ttl:${process.pid}:${Date.now()}`;
  try {
    assert.equal(valkey(["SET", ttlKey, "expires", "EX", "2"]).trim(), "OK");
    assert.equal(valkey(["GET", ttlKey]).trim(), "expires");
    await sleep(3000);
    assert.equal(valkey(["GET", ttlKey]).trim(), "");
  } finally {
    valkey(["DEL", ttlKey]);
  }

  console.log(
    `Local Valkey verification passed; TTL expiry works and authentication is ${process.env.CGN_VALKEY_PASSWORD ? "configured" : "not configured"}.`,
  );
}

export async function restartSmoke() {
  await up();
  await verify();

  const key = `cgn:local:restart-smoke:${process.pid}`;
  const value = `durable-${Date.now()}`;
  assert.equal(valkey(["SET", key, value]).trim(), "OK");

  try {
    compose(["restart", "valkey"], { capture: false });
    await waitUntilReady();
    assert.equal(valkey(["GET", key]).trim(), value);
    console.log("Local Valkey retained a smoke key after container restart.");
  } finally {
    valkey(["DEL", key]);
  }
}

export function down({ purge = false } = {}) {
  const args = ["down"];
  if (purge) {
    args.push("--volumes");
  }
  compose(args, { capture: false });
  console.log(
    purge
      ? "Local Valkey stopped and its CGN Compose volume removed."
      : "Local Valkey stopped; its CGN Compose volume is preserved.",
  );
}

async function main() {
  const [command] = process.argv.slice(2);
  switch (command) {
    case "up":
      await up();
      break;
    case "verify":
      await verify();
      break;
    case "restart-smoke":
      await restartSmoke();
      break;
    case "down":
      down();
      break;
    case "reset":
      down({ purge: true });
      break;
    default:
      throw new Error("Commands: up, verify, restart-smoke, down, reset");
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
