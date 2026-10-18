import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canonicalizeProductAnalyticsDictionary,
  serializeProductAnalyticsDictionary,
  validateProductAnalyticsDictionary,
} from "../../packages/contracts/analytics/validate-product-analytics.mjs";

const dictionaryUrl = new URL(
  "../../packages/contracts/analytics/events.v1.json",
  import.meta.url,
);
const schemaUrl = new URL(
  "../../packages/contracts/schemas/product-analytics.v1.schema.json",
  import.meta.url,
);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

test("CGN-131 dictionary is versioned and its samples match the allow-list", async () => {
  const dictionary = await readJson(dictionaryUrl);
  const schema = await readJson(schemaUrl);

  assert.equal(schema.title, "ProductAnalyticsDictionaryV1");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(validateProductAnalyticsDictionary(dictionary), []);
  assert.equal(
    serializeProductAnalyticsDictionary(dictionary),
    (await readFile(dictionaryUrl, "utf8")).replace(/\r\n/g, "\n"),
  );
});

test("event names are unique and use stable versioned IDs", async () => {
  const dictionary = await readJson(dictionaryUrl);
  const duplicate = clone(dictionary);
  duplicate.events[1].eventName = duplicate.events[0].eventName;
  assert.ok(
    validateProductAnalyticsDictionary(duplicate).some((issue) =>
      issue.includes("duplicates"),
    ),
  );

  const unversioned = clone(dictionary);
  unversioned.events[0].eventName = "career.goal-selected";
  assert.ok(
    validateProductAnalyticsDictionary(unversioned).some((issue) =>
      issue.includes("stable"),
    ),
  );
});

test("each entry declares a valid producer, consent class and retention owner", async () => {
  const dictionary = await readJson(dictionaryUrl);
  const invalid = clone(dictionary);
  invalid.events[0].producer = "gateway";
  invalid.events[0].consentClass = "implicit";
  invalid.events[0].retentionOwner = "identity";
  const issues = validateProductAnalyticsDictionary(invalid);
  assert.ok(issues.some((issue) => issue.includes("producer")));
  assert.ok(issues.some((issue) => issue.includes("consentClass")));
  assert.ok(issues.some((issue) => issue.includes("retentionOwner")));
});

test("private content, credentials and undeclared payload fields are rejected", async () => {
  const dictionary = await readJson(dictionaryUrl);
  const privateProperty = clone(dictionary);
  privateProperty.events[0].properties.push({
    name: "privateMessageBody",
    type: "string",
    required: false,
  });
  assert.ok(
    validateProductAnalyticsDictionary(privateProperty).some((issue) =>
      issue.includes("private content"),
    ),
  );

  const undeclared = clone(dictionary);
  undeclared.events[0].sample.payload.accessToken = "synthetic-token";
  assert.ok(
    validateProductAnalyticsDictionary(undeclared).some((issue) =>
      issue.includes("undeclared property"),
    ),
  );
});

test("sample payloads must use declared enum values and synthetic event IDs", async () => {
  const dictionary = await readJson(dictionaryUrl);
  const invalidEnum = clone(dictionary);
  invalidEnum.events[0].sample.payload.sourceSurface = "unknown";
  assert.ok(
    validateProductAnalyticsDictionary(invalidEnum).some((issue) =>
      issue.includes("allowedValues"),
    ),
  );

  const realLookingId = clone(dictionary);
  realLookingId.events[0].sample.eventId = "event-48291";
  assert.ok(
    validateProductAnalyticsDictionary(realLookingId).some((issue) =>
      issue.includes("synthetic"),
    ),
  );

  const invalidTimestamp = clone(dictionary);
  invalidTimestamp.events[0].sample.occurredAt = "not-a-date";
  assert.ok(
    validateProductAnalyticsDictionary(invalidTimestamp).some((issue) =>
      issue.includes("date-time"),
    ),
  );
});

test("canonical serialization is stable across event and property order", async () => {
  const dictionary = await readJson(dictionaryUrl);
  const reversed = clone(dictionary);
  reversed.events.reverse();
  reversed.events[0].properties.reverse();
  assert.equal(
    serializeProductAnalyticsDictionary(dictionary),
    serializeProductAnalyticsDictionary(reversed),
  );
  assert.deepEqual(
    canonicalizeProductAnalyticsDictionary(reversed).events.map(
      (event) => event.eventName,
    ),
    [...reversed.events.map((event) => event.eventName)].sort(),
  );
});
