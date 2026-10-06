import { execFileSync } from "node:child_process";

const composeFile = "infra/docker/docker-compose.test.yml";
const composeBase = ["compose", "-f", composeFile];

function runDocker(args, options = {}) {
  return execFileSync("docker", args, {
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitFor(label, check, attempts = 60) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      check();
      console.log(`${label} is ready.`);
      return;
    } catch (error) {
      lastError = error;
      console.log(`${label} not ready yet (${attempt}/${attempts}).`);
      sleep(1000);
    }
  }

  throw new Error(
    `${label} failed readiness checks: ${lastError?.message ?? "unknown error"}`,
  );
}

try {
  runDocker([...composeBase, "up", "-d"]);

  waitFor("PostgreSQL", () => {
    runDocker(
      [
        ...composeBase,
        "exec",
        "-T",
        "postgres",
        "pg_isready",
        "-U",
        "cgn",
        "-d",
        "cgn_test",
      ],
      { capture: true },
    );
  });

  waitFor("Valkey", () => {
    const output = runDocker(
      [...composeBase, "exec", "-T", "valkey", "valkey-cli", "ping"],
      { capture: true },
    );

    if (!output.includes("PONG")) {
      throw new Error("Valkey did not return PONG.");
    }
  });

  waitFor("Redpanda", () => {
    runDocker(
      [...composeBase, "exec", "-T", "redpanda", "rpk", "cluster", "info"],
      { capture: true },
    );
  });

  waitFor("S3-compatible object store", () => {
    execFileSync(
      "curl",
      ["--fail", "--silent", "--show-error", "http://127.0.0.1:8333/"],
      { stdio: "ignore" },
    );
  });

  console.log(
    "Integration dependency stack passed: PostgreSQL + Valkey + Redpanda + object storage.",
  );
} finally {
  try {
    runDocker([...composeBase, "down", "-v", "--remove-orphans"]);
  } catch (error) {
    console.error("Failed to clean integration dependency stack.");
    console.error(error.message);
  }
}
