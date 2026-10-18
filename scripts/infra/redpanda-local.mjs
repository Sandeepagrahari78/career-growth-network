import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const composeFile = "infra/docker/docker-compose.redpanda.yml";
const smokeTopic = "cgn.contract-smoke.v1";
const fixturePath =
  "packages/contracts/fixtures/events/domain-event-envelope.v1.json";

export function composeArgs(args) {
  return ["compose", "-f", composeFile, ...args];
}

function compose(args, options = {}) {
  const execOptions = {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  };

  if (options.capture) {
    execOptions.encoding = "utf8";
    execOptions.input = options.input;
  } else {
    execOptions.stdio = "inherit";
  }

  return execFileSync("docker", composeArgs(args), execOptions);
}

function rpk(args, options = {}) {
  return compose(["exec", "-T", "redpanda", "rpk", ...args], {
    capture: true,
    ...options,
  });
}

function sleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

export function createSmokeEvent() {
  const fixture = JSON.parse(
    readFileSync(resolve(repoRoot, fixturePath), "utf8"),
  );
  const event = JSON.parse(JSON.stringify(fixture.valid[0]));
  event.eventId = `cgn-local-smoke-${randomUUID()}`;
  return event;
}

async function waitUntilReady() {
  let lastError;
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      rpk(["cluster", "health", "--brokers", "localhost:9092"]);
      console.log("Local Redpanda is healthy.");
      return;
    } catch (error) {
      lastError = error;
      await sleep(1000);
    }
  }

  throw new Error(
    `Local Redpanda did not become healthy within 60 seconds: ${lastError?.message ?? "unknown error"}`,
  );
}

function ensureSmokeTopic() {
  const topics = rpk(["topic", "list", "--brokers", "localhost:9092"]);
  if (
    !topics
      .split(/\r?\n/)
      .some((line) => line.trim().split(/\s+/)[0] === smokeTopic)
  ) {
    rpk([
      "topic",
      "create",
      smokeTopic,
      "--partitions",
      "1",
      "--replicas",
      "1",
      "--brokers",
      "localhost:9092",
    ]);
  }
}

export async function up() {
  execFileSync("docker", ["info"], { stdio: "ignore" });
  compose(["up", "-d", "redpanda"]);
  await waitUntilReady();
}

export function verify() {
  rpk(["cluster", "health", "--brokers", "localhost:9092"]);
  ensureSmokeTopic();
  console.log(
    `Local Redpanda verification passed; ${smokeTopic} is available.`,
  );
}

export async function restartSmoke() {
  await up();
  ensureSmokeTopic();

  const expected = createSmokeEvent();
  rpk(["topic", "produce", smokeTopic, "--brokers", "localhost:9092"], {
    input: `${JSON.stringify(expected)}\n`,
  });

  compose(["restart", "redpanda"]);
  await waitUntilReady();

  const recovered = rpk([
    "topic",
    "consume",
    smokeTopic,
    "--brokers",
    "localhost:9092",
    "--offset",
    "-1",
    "--num",
    "1",
    "-f",
    "%v",
  ]);
  const record = JSON.parse(recovered.trim());
  assert.equal(record.eventId, expected.eventId);
  assert.equal(record.eventVersion, 1);
  assert.equal(record.eventType, expected.eventType);

  console.log(
    `Versioned ${expected.eventType} event ${expected.eventId} survived Redpanda restart on ${smokeTopic}.`,
  );
}

export function down({ purge = false } = {}) {
  const args = ["down"];
  if (purge) args.push("--volumes");
  compose(args);
  console.log(
    purge
      ? "Local Redpanda stopped and its CGN Compose volume removed."
      : "Local Redpanda stopped; its CGN Compose volume is preserved.",
  );
}

async function main() {
  const [command] = process.argv.slice(2);
  switch (command) {
    case "up":
      await up();
      break;
    case "verify":
      verify();
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
