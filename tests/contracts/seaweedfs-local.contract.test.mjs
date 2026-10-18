import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildS3Config,
  composeArgs,
  evidenceBucket,
  signS3Request,
} from "../../scripts/infra/seaweedfs-local.mjs";

const compose = await readFile(
  new URL("../../infra/docker/docker-compose.seaweedfs.yml", import.meta.url),
  "utf8",
);
const script = await readFile(
  new URL("../../scripts/infra/seaweedfs-local.mjs", import.meta.url),
  "utf8",
);

test("SeaweedFS pins the image, loopback API, and persistent volume", () => {
  assert.match(compose, /image: chrislusf\/seaweedfs:4\.46/);
  assert.match(compose, /127\.0\.0\.1:18333:8333/);
  assert.doesNotMatch(compose, /\n\s+- "(?:18333):/);
  assert.match(compose, /cgn-seaweedfs-data:\/data/);
  assert.match(compose, /source: \$\{CGN_SEAWEEDFS_CONFIG_FILE:/);
  assert.match(compose, /read_only: true/);
  assert.doesNotMatch(compose, /(?:9333|8080|8888):/);
});

test("S3 access is bucket-scoped and anonymous access is absent", () => {
  const config = buildS3Config({
    accessKey: "access-key-example-0001",
    secretKey: "secret-key-example-0001",
    adminAccessKey: "admin-access-key-example-0001",
    adminSecretKey: "admin-secret-key-example-0001",
  });
  assert.equal(config.identities.length, 2);
  assert.equal(config.identities[0].name, "cgn-local-bucket-initializer");
  assert.deepEqual(config.identities[0].actions, ["Admin"]);
  assert.equal(config.identities[1].name, "cgn-local-evidence");
  assert.deepEqual(config.identities[1].credentials, [
    {
      accessKey: "access-key-example-0001",
      secretKey: "secret-key-example-0001",
    },
  ]);
  assert.deepEqual(config.identities[1].actions, [
    `List:${evidenceBucket}`,
    `Read:${evidenceBucket}`,
    `Tagging:${evidenceBucket}`,
    `Write:${evidenceBucket}`,
  ]);
  assert.doesNotMatch(JSON.stringify(config), /"name":\s*"anonymous"/);
  assert.doesNotMatch(
    JSON.stringify(config.identities[1]),
    /"actions":\s*\[\s*"(?:Admin|Read|Write|List)"\s*\]/,
  );
});

test("S3 requests use AWS Signature V4 without exposing the secret", () => {
  const credentials = {
    accessKey: "access-key-example-0001",
    secretKey: "secret-key-example-0001",
  };
  const headers = signS3Request({
    method: "PUT",
    path: `/${evidenceBucket}/object.txt`,
    body: "proof",
    credentials,
    now: new Date("2026-10-19T00:00:00.000Z"),
  });
  assert.match(
    headers.Authorization,
    /^AWS4-HMAC-SHA256 Credential=access-key-example-0001\//,
  );
  assert.match(
    headers.Authorization,
    /SignedHeaders=host;x-amz-content-sha256;x-amz-date/,
  );
  assert.doesNotMatch(JSON.stringify(headers), /secret-key-example-0001/);
  assert.match(headers["x-amz-content-sha256"], /^[a-f0-9]{64}$/);
});

test("lifecycle smoke covers S3, privacy, and scoped persistence reset", () => {
  assert.deepEqual(composeArgs(["up", "-d", "seaweedfs"]), [
    "compose",
    "-f",
    "infra/docker/docker-compose.seaweedfs.yml",
    "up",
    "-d",
    "seaweedfs",
  ]);
  assert.match(
    script,
    /s3Request\(\s*"PUT",\s*`\/\$\{evidenceBucket\}\/\$\{key\}`/,
  );
  assert.match(
    script,
    /s3Request\(\s*"GET",\s*`\/\$\{evidenceBucket\}\/\$\{key\}`/,
  );
  assert.match(
    script,
    /s3Request\(\s*"HEAD",\s*`\/\$\{evidenceBucket\}\/\$\{key\}`/,
  );
  assert.match(script, /Anonymous access was not denied/);
  assert.match(script, /Bucket-scoped credentials accessed another bucket/);
  assert.match(script, /compose\(\["restart", "seaweedfs"\]/);
  assert.match(script, /case "reset":\s+down\(\{ purge: true \}\)/);
  assert.doesNotMatch(script, /volume prune|--remove-orphans/);
});
