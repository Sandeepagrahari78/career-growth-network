import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);

function argument(flag, fallback = null) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return fallback;
  }
  return args[index + 1] ?? fallback;
}

const releaseSha = argument("--release-sha");
const outputDir = resolve(argument("--output-dir", ".local/helm-promotion"));

assert.match(
  releaseSha ?? "",
  /^[0-9a-f]{40}$/,
  "release SHA must be an exact lowercase 40-character Git SHA",
);

const contract = JSON.parse(
  readFileSync("config/gitops/helm-promotion.v1.json", "utf8"),
);
mkdirSync(outputDir, { recursive: true });

const environments = [
  ["staging", contract.stagingValues],
  ["production", contract.productionValues],
];

const evidence = {
  schema: "cgn.helm-promotion-evidence.v1",
  ticket: "CGN-93",
  releaseSha,
  imageTag: `sha-${releaseSha}`,
  sameArtifactAcrossEnvironments: true,
  realProductionDeployment: false,
  renderedValues: {},
};

for (const [environment, sourcePath] of environments) {
  const source = readFileSync(sourcePath, "utf8");
  const rendered = source.replaceAll("__RELEASE_SHA__", releaseSha);
  assert.doesNotMatch(rendered, /__RELEASE_SHA__/);
  assert.equal(rendered.includes(`sha-${releaseSha}`), true);

  const destination = resolve(outputDir, `${environment}-values.yaml`);
  writeFileSync(destination, rendered);
  evidence.renderedValues[environment] = destination;
}

writeFileSync(
  resolve(outputDir, "promotion-evidence.json"),
  `${JSON.stringify(evidence, null, 2)}\n`,
);

console.log(
  `Rendered CGN Helm promotion values for immutable release ${releaseSha}.`,
);
