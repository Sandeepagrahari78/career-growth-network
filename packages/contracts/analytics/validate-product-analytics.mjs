const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const EVENT_NAME = /^cgn\.analytics\.[a-z]+(?:-[a-z]+)*\.v1$/;
const PROPERTY_NAME = /^[a-z][A-Za-z0-9]*$/;
const RFC3339 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const PRODUCERS = new Set(["career", "roadmap", "evidence", "growth", "feed"]);
const PROPERTY_TYPES = new Set([
  "boolean",
  "enum",
  "integer",
  "number",
  "string",
]);
const BLOCKED_PROPERTY =
  /(?:text|body|content|token|password|email|phone|mark|studyhour)/i;

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateSample(event, path, issues) {
  const sample = event.sample;
  if (!isObject(sample)) {
    issues.push(`${path}.sample must be an object`);
    return;
  }
  if (sample.eventType !== event.eventName) {
    issues.push(`${path}.sample.eventType must match eventName`);
  }
  if (sample.eventVersion !== 1)
    issues.push(`${path}.sample.eventVersion must be 1`);
  if (sample.producer !== event.producer) {
    issues.push(`${path}.sample.producer must match producer`);
  }
  if (
    typeof sample.eventId !== "string" ||
    !sample.eventId.startsWith("event-sample-")
  ) {
    issues.push(`${path}.sample.eventId must be synthetic`);
  }
  if (
    typeof sample.occurredAt !== "string" ||
    !RFC3339.test(sample.occurredAt) ||
    Number.isNaN(Date.parse(sample.occurredAt))
  ) {
    issues.push(`${path}.sample.occurredAt must be a date-time`);
  }
  if (!isObject(sample.payload)) {
    issues.push(`${path}.sample.payload must be an object`);
    return;
  }

  const properties = new Map(
    event.properties
      .filter(
        (property) => isObject(property) && typeof property.name === "string",
      )
      .map((property) => [property.name, property]),
  );
  for (const name of Object.keys(sample.payload)) {
    if (!properties.has(name))
      issues.push(`${path}.sample.payload has undeclared property ${name}`);
  }
  for (const property of event.properties) {
    const value = sample.payload[property.name];
    if (value === undefined) {
      if (property.required)
        issues.push(`${path}.sample.payload is missing ${property.name}`);
      continue;
    }
    const validType =
      (property.type === "string" && typeof value === "string") ||
      (property.type === "enum" && typeof value === "string") ||
      (property.type === "integer" && Number.isInteger(value)) ||
      (property.type === "number" &&
        typeof value === "number" &&
        Number.isFinite(value)) ||
      (property.type === "boolean" && typeof value === "boolean");
    if (!validType)
      issues.push(`${path}.sample.payload.${property.name} has the wrong type`);
    if (property.type === "enum" && !property.allowedValues?.includes(value)) {
      issues.push(
        `${path}.sample.payload.${property.name} is outside allowedValues`,
      );
    }
  }
}

export function validateProductAnalyticsDictionary(dictionary) {
  const issues = [];
  if (!isObject(dictionary)) return ["dictionary must be an object"];
  if (dictionary.schemaVersion !== 1) issues.push("schemaVersion must be 1");
  if (
    typeof dictionary.dictionaryVersion !== "string" ||
    !SEMVER.test(dictionary.dictionaryVersion)
  ) {
    issues.push("dictionaryVersion must use MAJOR.MINOR.PATCH format");
  }
  if (!Array.isArray(dictionary.events))
    return [...issues, "events must be an array"];

  const eventNames = new Set();
  for (const [index, event] of dictionary.events.entries()) {
    const path = `events[${index}]`;
    if (!isObject(event)) {
      issues.push(`${path} must be an object`);
      continue;
    }
    if (
      typeof event.eventName !== "string" ||
      !EVENT_NAME.test(event.eventName)
    ) {
      issues.push(`${path}.eventName must be a stable cgn.analytics.*.v1 name`);
    } else if (eventNames.has(event.eventName)) {
      issues.push(`${path}.eventName duplicates ${event.eventName}`);
    } else {
      eventNames.add(event.eventName);
    }
    if (!PRODUCERS.has(event.producer))
      issues.push(`${path}.producer is not an approved bounded context`);
    if (event.consentClass !== "product_analytics_opt_in") {
      issues.push(`${path}.consentClass must be product_analytics_opt_in`);
    }
    if (event.retentionOwner !== "analytics") {
      issues.push(`${path}.retentionOwner must be analytics`);
    }
    if (!Array.isArray(event.properties)) {
      issues.push(`${path}.properties must be an array`);
      continue;
    }

    const propertyNames = new Set();
    for (const [propertyIndex, property] of event.properties.entries()) {
      const propertyPath = `${path}.properties[${propertyIndex}]`;
      if (!isObject(property)) {
        issues.push(`${propertyPath} must be an object`);
        continue;
      }
      if (
        typeof property.name !== "string" ||
        !PROPERTY_NAME.test(property.name)
      ) {
        issues.push(`${propertyPath}.name must be camelCase`);
      } else {
        if (BLOCKED_PROPERTY.test(property.name)) {
          issues.push(
            `${propertyPath}.name is not allowed to collect private content or credentials`,
          );
        }
        if (propertyNames.has(property.name)) {
          issues.push(`${propertyPath}.name duplicates ${property.name}`);
        }
        propertyNames.add(property.name);
      }
      if (!PROPERTY_TYPES.has(property.type)) {
        issues.push(`${propertyPath}.type is not supported`);
      }
      if (typeof property.required !== "boolean") {
        issues.push(`${propertyPath}.required must be boolean`);
      }
      if (property.type === "enum") {
        if (
          !Array.isArray(property.allowedValues) ||
          property.allowedValues.length === 0
        ) {
          issues.push(
            `${propertyPath}.allowedValues is required for enum properties`,
          );
        } else if (
          new Set(property.allowedValues).size !== property.allowedValues.length
        ) {
          issues.push(
            `${propertyPath}.allowedValues must not contain duplicates`,
          );
        }
      } else if (property.allowedValues !== undefined) {
        issues.push(
          `${propertyPath}.allowedValues is only valid for enum properties`,
        );
      }
    }
    validateSample(event, path, issues);
  }
  return issues;
}

export function canonicalizeProductAnalyticsDictionary(dictionary) {
  const issues = validateProductAnalyticsDictionary(dictionary);
  if (issues.length > 0)
    throw new Error(
      `Invalid product analytics dictionary:\n${issues.join("\n")}`,
    );
  return {
    schemaVersion: dictionary.schemaVersion,
    dictionaryVersion: dictionary.dictionaryVersion,
    events: [...dictionary.events]
      .sort((left, right) => compareText(left.eventName, right.eventName))
      .map((event) => ({
        ...event,
        properties: [...event.properties]
          .sort((left, right) => compareText(left.name, right.name))
          .map((property) => ({
            ...property,
            ...(property.allowedValues
              ? { allowedValues: [...property.allowedValues].sort(compareText) }
              : {}),
          })),
      })),
  };
}

export function serializeProductAnalyticsDictionary(dictionary) {
  return `${JSON.stringify(canonicalizeProductAnalyticsDictionary(dictionary), null, 2)}\n`;
}
