import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const valueOf = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

const releaseSha = valueOf("--release-sha");
const outputDir = resolve(valueOf("--output-dir", ".local/helm"));

assert.match(
  releaseSha ?? "",
  /^[0-9a-f]{40}$/,
  "release SHA must be an exact 40-character lowercase Git SHA",
);

const environments = {
  staging: "infra/helm/health-demo/values-staging.yaml",
  production: "infra/helm/health-demo/values-production.yaml",
};

mkdirSync(outputDir, { recursive: true });

const rendered = {};
for (const [environment, source] of Object.entries(environments)) {
  const raw = readFileSync(source, "utf8");
  const resolved = raw.replaceAll("__RELEASE_SHA__", releaseSha);
  assert.doesNotMatch(resolved, /__RELEASE_SHA__/);
  assert.match(resolved, new RegExp(`tag:\\s*["']?sha-${releaseSha}["']?`));

  const path = resolve(outputDir, `${environment}-values.yaml`);
  writeFileSync(path, resolved);
  rendered[environment] = {
    path,
    sha256: createHash("sha256").update(resolved).digest("hex"),
  };
}

const stagingImage = readFileSync(rendered.staging.path, "utf8").match(
  /^\s{2}tag:\s*["']?([^"'\s]+)["']?\s*$/m,
)?.[1];
const productionImage = readFileSync(rendered.production.path, "utf8").match(
  /^\s{2}tag:\s*["']?([^"'\s]+)["']?\s*$/m,
)?.[1];

assert.equal(stagingImage, `sha-${releaseSha}`);
assert.equal(productionImage, stagingImage);

const evidence = {
  schema: "cgn.helm-promotion-evidence.v1",
  ticket: "CGN-93",
  mode: "render-only",
  releaseSha,
  stagingImageTag: stagingImage,
  productionImageTag: productionImage,
  sameArtifact: true,
  realProductionDeployment: false,
  rendered,
};

writeFileSync(
  resolve(outputDir, "promotion-evidence.json"),
  `${JSON.stringify(evidence, null, 2)}\n`,
);

console.log(
  `Rendered staging and production Helm values for immutable release ${releaseSha}.`,
);
