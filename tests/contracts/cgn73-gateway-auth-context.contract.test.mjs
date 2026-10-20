import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const schemaPath =
  "packages/contracts/schemas/gateway-auth-context-forwarding.v1.schema.json";
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const identitySchemaPath =
  "packages/contracts/schemas/identity-authorization-context.v1.schema.json";
const identitySchema = JSON.parse(readFileSync(identitySchemaPath, "utf8"));
const contract = readFileSync(
  "packages/contracts/src/gateway/gateway-auth-context-forwarding.v1.ts",
  "utf8",
);
const exports = readFileSync("packages/contracts/src/index.ts", "utf8");
const runtimeContract = readFileSync(
  "services/gateway/src/gateway-auth-context-contract.ts",
  "utf8",
);
const registry = readFileSync(
  "docs/engineering-memory/03-contract-registry.md",
  "utf8",
);

test(
  "Gateway forwarding envelope is versioned, closed and reuses Identity's contract",
  () => {
    assert.equal(
      schema.properties.contract.const,
      "cgn.gateway.auth-context-forwarding.v1",
    );
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(schema.required, [
      "contract",
      "identityAuthorizationContext",
    ]);
    assert.equal(
      schema.properties.identityAuthorizationContext.$ref,
      "identity-authorization-context.v1.schema.json",
    );
    assert.equal(
      existsSync(
        "packages/contracts/schemas/" +
          schema.properties.identityAuthorizationContext.$ref,
      ),
      true,
    );
    assert.equal(
      identitySchema.properties.contract.const,
      "cgn.identity.authorization-context.v1",
    );
    assert.match(contract, /GATEWAY_AUTH_CONTEXT_FORWARDING_CONTRACT_V1/);
    assert.match(contract, /"cgn\.gateway\.auth-context-forwarding\.v1"/);
    assert.match(contract, /GATEWAY_AUTH_CONTEXT_HEADER_V1/);
    assert.match(contract, /"x-cgn-auth-context-v1"/);
    assert.match(exports, /gateway-auth-context-forwarding\.v1/);
    assert.match(runtimeContract, /x-cgn-auth-context-v1/);
  },
);

test(
  "registry blocks consumer trust until CGN-101 service authentication",
  () => {
    assert.match(registry, /Gateway Auth Context Forwarding v1/);
    assert.match(
      registry,
      /must not trust or authorize from the forwarded context until CGN-101/,
    );
    assert.match(registry, /does not authenticate the Gateway caller/);
  },
);

test(
  "forwarded context carries no session credential or consumer authorization extension",
  () => {
    const properties = Object.keys(schema.properties).sort();
    assert.deepEqual(properties, ["contract", "identityAuthorizationContext"]);
    assert.doesNotMatch(
      JSON.stringify(schema),
      /sessionId|cookie|permission|credential/i,
    );
  },
);
