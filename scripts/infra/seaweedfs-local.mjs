import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const composeFile = "infra/docker/docker-compose.seaweedfs.yml";
export const evidenceBucket = "cgn-evidence";
const defaultEndpoint = "http://127.0.0.1:18333";
const configDirectory = resolve(repoRoot, ".cgn/seaweedfs");
const credentialsFile = resolve(configDirectory, "credentials.json");
const s3ConfigFile = resolve(configDirectory, "s3.json");

export function composeArgs(args) {
  return ["compose", "-f", composeFile, ...args];
}

export function buildS3Config({
  accessKey,
  secretKey,
  adminAccessKey,
  adminSecretKey,
}) {
  return {
    identities: [
      {
        name: "cgn-local-bucket-initializer",
        credentials: [{ accessKey: adminAccessKey, secretKey: adminSecretKey }],
        actions: ["Admin"],
      },
      {
        name: "cgn-local-evidence",
        credentials: [{ accessKey, secretKey }],
        actions: [
          `List:${evidenceBucket}`,
          `Read:${evidenceBucket}`,
          `Tagging:${evidenceBucket}`,
          `Write:${evidenceBucket}`,
        ],
      },
    ],
  };
}

export function signS3Request({
  method,
  path,
  body = "",
  endpoint = defaultEndpoint,
  credentials,
  now = new Date(),
}) {
  const url = new URL(endpoint);
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = createHash("sha256").update(body).digest("hex");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders =
    `host:${url.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const canonicalRequest =
    `${method}\n${path}\n\n${canonicalHeaders}\n` +
    `${signedHeaders}\n${payloadHash}`;
  const scope = `${date}/us-east-1/s3/aws4_request`;
  const stringToSign =
    `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n` +
    createHash("sha256").update(canonicalRequest).digest("hex");
  const hmac = (key, value) => createHmac("sha256", key).update(value).digest();
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${credentials.secretKey}`, date), "us-east-1"), "s3"),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  return {
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${credentials.accessKey}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function writePrivateJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

export function loadCredentials() {
  const envAccessKey = process.env.CGN_SEAWEEDFS_ACCESS_KEY;
  const envSecretKey = process.env.CGN_SEAWEEDFS_SECRET_KEY;
  if (Boolean(envAccessKey) !== Boolean(envSecretKey)) {
    throw new Error(
      "Set both CGN_SEAWEEDFS_ACCESS_KEY and " +
        "CGN_SEAWEEDFS_SECRET_KEY, or neither.",
    );
  }

  const stored = existsSync(credentialsFile)
    ? JSON.parse(readFileSync(credentialsFile, "utf8"))
    : {};
  const credentials = {
    accessKey:
      envAccessKey ?? stored.accessKey ?? randomBytes(10).toString("hex"),
    secretKey:
      envSecretKey ?? stored.secretKey ?? randomBytes(32).toString("hex"),
    adminAccessKey: stored.adminAccessKey ?? randomBytes(10).toString("hex"),
    adminSecretKey: stored.adminSecretKey ?? randomBytes(32).toString("hex"),
  };

  for (const [name, value] of Object.entries(credentials)) {
    if (typeof value !== "string" || value.length < 16) {
      throw new Error(
        `Invalid local SeaweedFS ${name}; expected at least 16 characters.`,
      );
    }
  }

  writePrivateJson(credentialsFile, credentials);
  writePrivateJson(s3ConfigFile, buildS3Config(credentials));
  return { ...credentials, configFile: s3ConfigFile };
}

function compose(args, { capture = true } = {}) {
  const credentials = loadCredentials();
  const options = {
    cwd: repoRoot,
    env: {
      ...process.env,
      CGN_SEAWEEDFS_CONFIG_FILE: credentials.configFile,
    },
    maxBuffer: 16 * 1024 * 1024,
  };

  if (capture) {
    options.encoding = "utf8";
  } else {
    options.stdio = "inherit";
  }

  return execFileSync("docker", composeArgs(args), options);
}

function endpoint() {
  const value = process.env.CGN_SEAWEEDFS_S3_ENDPOINT ?? defaultEndpoint;
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "CGN_SEAWEEDFS_S3_ENDPOINT must be an http origin without a path.",
    );
  }
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    throw new Error("Local SeaweedFS must use a loopback S3 endpoint.");
  }
  return url.origin;
}

async function s3Request(method, path, body = "", credentials) {
  const url = new URL(path, endpoint());
  const response = await fetch(url, {
    method,
    headers: credentials
      ? signS3Request({
          method,
          path,
          body,
          endpoint: endpoint(),
          credentials,
        })
      : undefined,
    body: method === "GET" || method === "HEAD" ? undefined : body,
    signal: AbortSignal.timeout(10000),
  });
  return { response, body: await response.text() };
}

function requireStatus(result, expected, message) {
  if (!expected.includes(result.response.status)) {
    throw new Error(
      `${message}: HTTP ${result.response.status} ${result.body.slice(0, 300)}`,
    );
  }
}

async function waitUntilReady() {
  let lastError;
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const result = await s3Request("HEAD", `/${evidenceBucket}`);
      if (result.response.status === 403) {
        console.log(
          "Local SeaweedFS S3 endpoint is ready and requires credentials.",
        );
        return;
      }
      lastError = new Error(
        `Expected protected bucket HTTP 403, got ${result.response.status}.`,
      );
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 1000));
  }

  throw new Error(
    `Local SeaweedFS did not become ready within 60 seconds: ${
      lastError?.message ?? "unknown error"
    }`,
  );
}

async function initializeBucket(credentials) {
  const result = await s3Request("PUT", `/${evidenceBucket}`, "", {
    accessKey: credentials.adminAccessKey,
    secretKey: credentials.adminSecretKey,
  });
  if (
    result.response.status === 409 &&
    /BucketAlreadyOwnedByYou|BucketAlreadyExists/.test(result.body)
  ) {
    return;
  }
  requireStatus(
    result,
    [200, 201],
    `Could not initialize private bucket ${evidenceBucket}`,
  );
}

export async function up() {
  const credentials = loadCredentials();
  execFileSync("docker", ["info"], { stdio: "ignore" });
  compose(["up", "-d", "--force-recreate", "seaweedfs"], {
    capture: false,
  });
  await waitUntilReady();
  await initializeBucket(credentials);
  console.log(`Local private evidence bucket ${evidenceBucket} is ready.`);
}

export async function verify() {
  const credentials = loadCredentials();
  requireStatus(
    await s3Request("GET", `/${evidenceBucket}`, "", credentials),
    [200],
    "Authenticated bucket listing failed",
  );

  const anonymous = await s3Request("GET", `/${evidenceBucket}`);
  requireStatus(anonymous, [403], "Anonymous access was not denied");

  const otherBucket = `cgn-denied-${randomUUID().replaceAll("-", "")}`;
  const unauthorized = await s3Request(
    "PUT",
    `/${otherBucket}`,
    "",
    credentials,
  );
  requireStatus(
    unauthorized,
    [403],
    "Bucket-scoped credentials accessed another bucket",
  );

  const key = `cgn-smoke-${randomUUID()}`;
  const value = `cgn-seaweedfs-${randomUUID()}`;
  requireStatus(
    await s3Request("PUT", `/${evidenceBucket}/${key}`, value, credentials),
    [200],
    "S3-compatible object upload failed",
  );
  try {
    const downloaded = await s3Request(
      "GET",
      `/${evidenceBucket}/${key}`,
      "",
      credentials,
    );
    requireStatus(downloaded, [200], "S3-compatible object download failed");
    assert.equal(downloaded.body, value);

    const metadata = await s3Request(
      "HEAD",
      `/${evidenceBucket}/${key}`,
      "",
      credentials,
    );
    requireStatus(
      metadata,
      [200],
      "S3-compatible object metadata request failed",
    );
    assert.equal(
      Number(metadata.response.headers.get("content-length")),
      Buffer.byteLength(value),
    );
  } finally {
    requireStatus(
      await s3Request("DELETE", `/${evidenceBucket}/${key}`, "", credentials),
      [204],
      "Could not remove the temporary S3 smoke object",
    );
  }

  console.log(
    "SeaweedFS S3 put/get/head, anonymous denial, and bucket isolation passed.",
  );
}

export async function restartSmoke() {
  await up();
  await verify();

  const credentials = loadCredentials();
  const key = `cgn-restart-${randomUUID()}`;
  const value = `persisted-${randomUUID()}`;
  requireStatus(
    await s3Request("PUT", `/${evidenceBucket}/${key}`, value, credentials),
    [200],
    "Could not write the persistence smoke object",
  );

  try {
    compose(["restart", "seaweedfs"], { capture: false });
    await waitUntilReady();
    const recovered = await s3Request(
      "GET",
      `/${evidenceBucket}/${key}`,
      "",
      credentials,
    );
    requireStatus(
      recovered,
      [200],
      "Persisted object was unavailable after restart",
    );
    assert.equal(recovered.body, value);
    const metadata = await s3Request(
      "HEAD",
      `/${evidenceBucket}/${key}`,
      "",
      credentials,
    );
    requireStatus(
      metadata,
      [200],
      "Persisted object metadata was unavailable after restart",
    );
    console.log(
      "SeaweedFS retained the private evidence object after container restart.",
    );
  } finally {
    requireStatus(
      await s3Request("DELETE", `/${evidenceBucket}/${key}`, "", credentials),
      [204],
      "Could not remove the persistence smoke object",
    );
  }
}

export function down({ purge = false } = {}) {
  const args = ["down"];
  if (purge) args.push("--volumes");
  compose(args, { capture: false });
  console.log(
    purge
      ? "Local SeaweedFS stopped and its CGN Compose data volume removed."
      : "Local SeaweedFS stopped; its CGN Compose data volume is preserved.",
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
