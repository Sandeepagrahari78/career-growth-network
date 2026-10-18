import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schema = JSON.parse(
  await readFile(
    new URL(
      "../../packages/contracts/schemas/domain-event-envelope.v1.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const fixtures = JSON.parse(
  await readFile(
    new URL(
      "../../packages/contracts/fixtures/events/domain-event-envelope.v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

function validateEnvelope(event) {
  const errors = [];
  for (const field of schema.required) {
    if (!Object.hasOwn(event, field)) errors.push(`${field} is required`);
  }

  for (const [field, rule] of Object.entries(schema.properties)) {
    if (!Object.hasOwn(event, field)) continue;
    const value = event[field];
    if (rule.const !== undefined && value !== rule.const) {
      errors.push(`${field} must equal ${rule.const}`);
    }
    if (rule.type === "string") {
      if (typeof value !== "string") errors.push(`${field} must be a string`);
      else {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push(`${field} must not be empty`);
        }
        if (rule.format === "date-time" && !isRfc3339DateTime(value)) {
          errors.push(`${field} must be an RFC 3339 date-time`);
        }
      }
    }
    if (
      rule.type === "object" &&
      (value === null || typeof value !== "object" || Array.isArray(value))
    ) {
      errors.push(`${field} must be an object`);
    }
  }

  return errors;
}

function isRfc3339DateTime(value) {
  const match =
    /^(\d{4})-(0[1-9]|1[0-2])-([0-2]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/.exec(
      value,
    );
  if (!match || Number.isNaN(Date.parse(value))) return false;

  const [, year, month, day] = match.map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysPerMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day <= daysPerMonth[month - 1];
}

test("domain.event.envelope.v1 requires stable metadata and rejects unknown versions", () => {
  assert.equal(schema.title, "DomainEventEnvelopeV1");
  assert.deepEqual(schema.required, [
    "eventId",
    "eventType",
    "eventVersion",
    "occurredAt",
    "producer",
    "payload",
  ]);
  assert.equal(schema.properties.eventVersion.const, 1);
  assert.equal(schema.properties.occurredAt.format, "date-time");
  assert.equal(schema.properties.payload.type, "object");
  assert.equal(schema.properties.subjectId.type, "string");
  assert.equal(schema.properties.correlationId.type, "string");
});

test("event fixtures cover valid, invalid, and additive-compatible envelopes", () => {
  assert.equal(fixtures.$contract, "domain.event.envelope.v1");
  assert.ok(fixtures.valid.length >= 2);
  for (const event of fixtures.valid) {
    assert.deepEqual(validateEnvelope(event), []);
  }

  assert.equal(schema.additionalProperties, true);
  assert.ok(
    Object.hasOwn(fixtures.valid[1], "traceHint"),
    "the additive fixture must include unknown optional envelope metadata",
  );

  for (const { case: name, event } of fixtures.invalid) {
    assert.notDeepEqual(
      validateEnvelope(event),
      [],
      `${name} must be rejected`,
    );
  }
  assert.ok(
    fixtures.invalid.some(
      ({ case: name }) => name === "unsupported-envelope-version",
    ),
  );
  assert.ok(
    fixtures.invalid.some(({ case: name }) => name === "invalid-occurred-at"),
  );
  assert.ok(
    fixtures.invalid.some(
      ({ case: name }) => name === "nonexistent-calendar-date",
    ),
  );
});
