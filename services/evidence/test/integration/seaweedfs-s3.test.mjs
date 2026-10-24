import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import {
  buildS3Config,
  evidenceBucket,
  signS3Request,
} from "../../../../scripts/infra/seaweedfs-local.mjs";
import { EvidenceS3Storage } from "../../dist/s3-storage.js";
import { validateUploadedEvidence } from "../../dist/upload-validation.js";

const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const composeFile = resolve(
  repoRoot,
  "infra/docker/docker-compose.seaweedfs.yml",
);
const policy = JSON.parse(
  await readFile(
    resolve(
      repoRoot,
      "services/evidence/config/evidence-upload-policy.v1.json",
    ),
    "utf8",
  ),
);
const dockerAvailable =
  spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;

async function unusedLoopbackPort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not allocate an ephemeral S3 test port.");
  }
  await new Promise((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );
  return address.port;
}

function dockerCompose(project, file, args, env = process.env) {
  return execFileSync(
    "docker",
    ["compose", "--project-name", project, "--file", file, ...args],
    { cwd: repoRoot, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
}

async function waitForS3(endpoint) {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.status < 500) return;
      lastError = new Error("SeaweedFS S3 returned HTTP " + response.status);
    } catch (error) {
      lastError = error;
    }
    await delay(500);
  }
  throw new Error(
    "Isolated SeaweedFS S3 did not become ready: " +
      (lastError?.message ?? "unknown error"),
  );
}

async function createBucket(endpoint, credentials) {
  const path = "/" + evidenceBucket;
  const response = await fetch(endpoint + path, {
    method: "PUT",
    headers: signS3Request({
      method: "PUT",
      path,
      body: "",
      endpoint,
      credentials,
    }),
  });
  assert.ok(
    response.status === 200 || response.status === 201,
    "SeaweedFS evidence bucket creation failed with HTTP " + response.status,
  );
}

test(
  "SeaweedFS signed evidence uploads, validation, and pinned downloads work end to end",
  { skip: !dockerAvailable && "Docker Engine is unavailable." },
  async (t) => {
    const workDir = await mkdtemp(join(repoRoot, ".cgn", "cgn142-seaweedfs-"));
    await chmod(workDir, 0o700);
    const endpointPort = await unusedLoopbackPort();
    const endpoint = "http://127.0.0.1:" + endpointPort;
    const project =
      "cgn142-evidence-" + process.pid + "-" + randomUUID().slice(0, 8);
    const accessKey = randomUUID().replaceAll("-", "").slice(0, 24);
    const secretKey = randomBytes(32).toString("hex");
    const adminCredentials = {
      accessKey: randomUUID().replaceAll("-", "").slice(0, 24),
      secretKey: randomBytes(32).toString("hex"),
    };
    const credentials = { accessKey, secretKey };
    const configPath = join(workDir, "s3.json");
    const testComposeFile = join(workDir, "docker-compose.yml");
    const compose = (await readFile(composeFile, "utf8")).replace(
      "127.0.0.1:18333:8333",
      "127.0.0.1:" + endpointPort + ":8333",
    );
    assert.notEqual(compose, await readFile(composeFile, "utf8"));
    await writeFile(
      configPath,
      JSON.stringify(
        buildS3Config({
          accessKey,
          secretKey,
          adminAccessKey: adminCredentials.accessKey,
          adminSecretKey: adminCredentials.secretKey,
        }),
      ),
      { encoding: "utf8", mode: 0o644 },
    );
    await chmod(configPath, 0o644);
    await writeFile(testComposeFile, compose, "utf8");

    t.after(async () => {
      try {
        dockerCompose(project, testComposeFile, ["down", "--volumes"]);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    });

    dockerCompose(
      project,
      testComposeFile,
      ["up", "-d", "--force-recreate", "seaweedfs"],
      { ...process.env, CGN_SEAWEEDFS_CONFIG_FILE: configPath },
    );
    await waitForS3(endpoint);
    await createBucket(endpoint, adminCredentials);

    const storage = new EvidenceS3Storage({
      endpoint,
      region: "us-east-1",
      bucket: evidenceBucket,
      credentials,
    });
    const now = new Date();
    const payload = new TextEncoder().encode(
      "%PDF-1.7\nCGN private evidence integration payload\n",
    );
    const upload = storage.createUploadGrant(
      {
        principalId: "student-a",
        ownerId: "student-a",
        fileName: "proof.pdf",
        declaredContentType: "application/pdf",
        declaredSizeBytes: payload.length,
        now,
      },
      policy,
    );
    assert.equal(upload.allowed, true);

    const tamperedUrl = new URL(upload.uploadUrl);
    const signature = tamperedUrl.searchParams.get("X-Amz-Signature");
    assert.ok(signature);
    tamperedUrl.searchParams.set(
      "X-Amz-Signature",
      (signature[0] === "0" ? "1" : "0") + signature.slice(1),
    );
    const tamperedResponse = await fetch(tamperedUrl, {
      method: "PUT",
      headers: upload.headers,
      body: payload,
    });
    assert.equal(tamperedResponse.status, 403);

    const expiredPolicy = { ...policy, signedUploadUrlTtlSeconds: 1 };
    const expiredUpload = storage.createUploadGrant(
      {
        principalId: "student-a",
        ownerId: "student-a",
        fileName: "proof.pdf",
        declaredContentType: "application/pdf",
        declaredSizeBytes: payload.length,
        now: new Date(Date.now() - 60_000),
      },
      expiredPolicy,
    );
    assert.equal(expiredUpload.allowed, true);
    const expiredResponse = await fetch(expiredUpload.uploadUrl, {
      method: "PUT",
      headers: expiredUpload.headers,
      body: payload,
    });
    assert.equal(expiredResponse.status, 403);

    const uploaded = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: upload.headers,
      body: payload,
    });
    assert.equal(uploaded.status, 200);
    assert.ok(uploaded.headers.get("etag"));

    const replay = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: upload.headers,
      body: payload,
    });
    assert.equal(replay.status, 412);

    let scannerInput;
    const validated = await validateUploadedEvidence(
      {
        principalId: "student-a",
        ownerId: "student-a",
        fileName: "proof.pdf",
        declaredContentType: "application/pdf",
        declaredSizeBytes: payload.length,
        now: new Date(),
        objectKey: upload.objectKey,
        uploadUrlExpiresAt: upload.expiresAt,
        scanTimeoutMs: 1000,
        inspectQuarantinedObject: (request) =>
          storage.inspectQuarantinedObject(request),
        scanner: {
          async scan(request) {
            scannerInput = request;
            return "clean";
          },
        },
      },
      policy,
    );
    assert.equal(validated.state, "validated");
    assert.equal(validated.ownerId, "student-a");
    assert.equal(validated.contentType, "application/pdf");
    assert.equal(validated.sizeBytes, payload.length);
    assert.equal(validated.objectKey, upload.objectKey);
    assert.match(validated.checksumSha256, /^[a-f0-9]{64}$/);
    assert.equal(scannerInput.objectRevision, validated.objectRevision);
    assert.equal(scannerInput.checksumSha256, validated.checksumSha256);

    const denied = await storage.createDownloadGrant(
      {
        principalId: "student-b",
        ownerId: "student-a",
        objectKey: upload.objectKey,
        objectVisibility: "private",
        validation: validated,
        now: new Date(),
      },
      policy,
    );
    assert.deepEqual(denied, {
      allowed: false,
      reason: "owner_mismatch",
    });

    const download = await storage.createDownloadGrant(
      {
        principalId: "student-a",
        ownerId: "student-a",
        objectKey: upload.objectKey,
        objectVisibility: "private",
        validation: validated,
        now: new Date(),
      },
      policy,
    );
    assert.equal(download.allowed, true);
    assert.equal(
      new URL(download.downloadUrl).searchParams.get("X-Amz-Expires"),
      "60",
    );
    const bytes = await fetch(download.downloadUrl, {
      headers: download.headers,
    });
    assert.equal(bytes.status, 200);
    assert.deepEqual(new Uint8Array(await bytes.arrayBuffer()), payload);
    const tamperedDownloadUrl = new URL(download.downloadUrl);
    const downloadSignature =
      tamperedDownloadUrl.searchParams.get("X-Amz-Signature");
    assert.ok(downloadSignature);
    tamperedDownloadUrl.searchParams.set(
      "X-Amz-Signature",
      (downloadSignature[0] === "0" ? "1" : "0") + downloadSignature.slice(1),
    );
    const deniedTamper = await fetch(tamperedDownloadUrl, {
      headers: download.headers,
    });
    assert.equal(deniedTamper.status, 403);
  },
);
