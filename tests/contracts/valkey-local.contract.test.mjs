import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { composeArgs } from "../../scripts/infra/valkey-local.mjs";

const compose = await readFile(
  new URL("../../infra/docker/docker-compose.valkey.yml", import.meta.url),
  "utf8",
);
const script = await readFile(
  new URL("../../scripts/infra/valkey-local.mjs", import.meta.url),
  "utf8",
);

test("local Valkey image is pinned, loopback-only and uses a scoped data volume", () => {
  assert.match(compose, /image: valkey\/valkey:9\.1\.2/);
  assert.match(compose, /127\.0\.0\.1:16379:6379/);
  assert.doesNotMatch(compose, /\n\s+- "(?:16379):/);
  assert.match(compose, /cgn-valkey-data:\/data/);
  assert.match(compose, /--appendonly yes/);
  assert.match(compose, /--appendfsync always/);
});

test("password configuration comes from environment and has no hardcoded value", () => {
  assert.match(compose, /CGN_VALKEY_PASSWORD: \$\{CGN_VALKEY_PASSWORD:-\}/);
  assert.match(compose, /REDISCLI_AUTH: \$\{CGN_VALKEY_PASSWORD:-\}/);
  assert.match(compose, /--requirepass "\$\$CGN_VALKEY_PASSWORD"/);
  assert.doesNotMatch(compose, /--requirepass\s+(?!["$])\S+/);
});

test("lifecycle commands stay scoped and purge data only for reset", () => {
  assert.deepEqual(composeArgs(["up", "-d", "valkey"]), [
    "compose",
    "-f",
    "infra/docker/docker-compose.valkey.yml",
    "up",
    "-d",
    "valkey",
  ]);
  assert.match(script, /case "reset":\s+down\(\{ purge: true \}\)/);
  assert.doesNotMatch(script, /volume prune|--remove-orphans/);
});

test("verification covers TTL expiration and persistence across restart", () => {
  assert.match(script, /"SET", ttlKey, "expires", "EX", "2"/);
  assert.match(script, /await sleep\(3000\)/);
  assert.match(script, /compose\(\["restart", "valkey"\]/);
  assert.match(script, /assert\.equal\(valkey\(\["GET", key\]\)\.trim\(\), value\)/);
});
