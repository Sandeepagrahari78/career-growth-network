import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3001";

async function expectJson(path, status, expected) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.status, status);

  const body = await response.json();
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(body[key], value);
  }
}

await expectJson("/health", 200, {
  status: "ok",
  service: "cgn-health-demo",
});

await expectJson("/ready", 200, {
  status: "ready",
  service: "cgn-health-demo",
});

await expectJson("/does-not-exist", 404, {
  error: "not_found",
});

console.log("CGN end-to-end HTTP smoke passed.");
