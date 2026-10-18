import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const fixture = JSON.parse(
  await readFile(
    new URL(
      "../../packages/contracts/fixtures/http/error-envelope.v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

test("http.error-envelope.v1 fixtures preserve the compatible envelope shape", () => {
  assert.equal(fixture.$contract, "http.error-envelope.v1");
  assert.deepEqual(
    fixture.responses.map(({ case: name, status, error }) => [
      name,
      status,
      error.code,
    ]),
    [
      ["validation", 400, "VALIDATION_ERROR"],
      ["unauthenticated", 401, "UNAUTHENTICATED"],
      ["forbidden", 403, "FORBIDDEN"],
      ["not-found", 404, "NOT_FOUND"],
      ["unexpected", 500, "UNEXPECTED_ERROR"],
    ],
  );
  for (const { error } of fixture.responses) {
    assert.equal(typeof error.message, "string");
    assert.equal(error.requestId, "cgn-contract-test");
    assert.equal("stack" in error, false);
  }
});

test("synchronous API policy uses URL major versions and preserves existing routes", async () => {
  const policy = await readFile(
    new URL(
      "../../docs/contracts/synchronous-api-versioning.md",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(policy, /`\/v1\/<resource>`/);
  assert.match(policy, /new major path/);
  assert.match(policy, /does not silently move existing routes/);
});
