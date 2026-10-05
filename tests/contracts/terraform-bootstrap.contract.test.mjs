import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const terraformRoot = "infra/terraform/environments/local";

function terraformSource() {
  return readdirSync(terraformRoot)
    .filter((file) => file.endsWith(".tf"))
    .sort()
    .map((file) => readFileSync(join(terraformRoot, file), "utf8"))
    .join("\n");
}

test("zero-budget Terraform bootstrap contains no cloud provider or backend", () => {
  const source = terraformSource();

  const forbidden = [
    /backend\s+"(?:s3|gcs|azurerm|remote|pg)"\s*\{/i,
    /provider\s+"(?:aws|google|azurerm)"\s*\{/i,
    /resource\s+"(?:aws_|google_|azurerm_)/i,
    /\bcloud\s*\{/i,
  ];

  for (const pattern of forbidden) {
    assert.equal(
      pattern.test(source),
      false,
      `zero-budget Terraform bootstrap matched forbidden pattern: ${pattern}`,
    );
  }
});

test("Terraform bootstrap whitelists only local environments and mode", () => {
  const variables = readFileSync(join(terraformRoot, "variables.tf"), "utf8");

  assert.match(
    variables,
    /contains\(\["local-dev", "local-staging"\], var\.environment\)/,
  );
  assert.match(
    variables,
    /var\.execution_mode == "zero-budget-local"/,
  );
});

test("committed Terraform variable files do not contain obvious secrets", () => {
  const tfvars = readdirSync(terraformRoot)
    .filter((file) => file.endsWith(".tfvars"))
    .sort();

  assert.deepEqual(tfvars, ["dev.tfvars", "staging.tfvars"]);

  for (const file of tfvars) {
    const source = readFileSync(join(terraformRoot, file), "utf8");
    assert.doesNotMatch(source, /(password|secret|token|api[_-]?key)\s*=/i);
  }
});
