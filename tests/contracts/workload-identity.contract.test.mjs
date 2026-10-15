import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("CGN-61 workload identity validator passes", () => {
  const args = ["scripts/ci/validate-workload-identity.mjs"];
  const output = execFileSync("node", args, { encoding: "utf8" });

  assert.match(
    output,
    /CGN-61 ServiceAccount and IRSA policy pattern is valid/,
  );
});

test("service-account token automount is fail-closed by schema", () => {
  const schema = JSON.parse(
    readFileSync("infra/helm/cgn-service/values.schema.json", "utf8"),
  );
  const invalid = readFileSync(
    "tests/fixtures/helm/invalid-token-automount.yaml",
    "utf8",
  );

  const sa = schema.properties.serviceAccount;
  assert.equal(sa.properties.automountServiceAccountToken.const, false);
  assert.match(invalid, /automountServiceAccountToken:\s*true/);
});

test("raw IRSA annotation bypass is reserved by schema", () => {
  const schema = JSON.parse(
    readFileSync("infra/helm/cgn-service/values.schema.json", "utf8"),
  );
  const bypass = readFileSync(
    "tests/fixtures/helm/raw-irsa-annotation-bypass.yaml",
    "utf8",
  );

  const annotations = schema.properties.serviceAccount.properties.annotations;
  assert.equal(
    annotations.propertyNames.not.const,
    "eks.amazonaws.com/role-arn",
  );
  assert.match(bypass, /eks\.amazonaws\.com\/role-arn/);
});

test("repository IRSA fixture is synthetic template-only configuration", () => {
  const fixture = readFileSync(
    "tests/fixtures/helm/irsa-template-smoke.yaml",
    "utf8",
  );

  assert.match(fixture, /123456789012/);
  assert.match(fixture, /cgn-irsa-smoke/);
  assert.match(fixture, /automountServiceAccountToken:\s*false/);
});
