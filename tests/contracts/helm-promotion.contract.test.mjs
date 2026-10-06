import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("CGN-93 static Helm promotion contract passes", () => {
  const output = execFileSync(
    "node",
    ["scripts/ci/validate-helm-promotion.mjs"],
    { encoding: "utf8" },
  );

  assert.match(output, /CGN-93 Helm promotion contract is valid/);
});

test("staging and production resolve the same immutable release artifact", () => {
  const releaseSha = "0123456789abcdef0123456789abcdef01234567";
  const outputDir = mkdtempSync(join(tmpdir(), "cgn-promotion-"));

  try {
    execFileSync(
      "node",
      [
        "scripts/infra/render-helm-promotion.mjs",
        "--release-sha",
        releaseSha,
        "--output-dir",
        outputDir,
      ],
      { encoding: "utf8" },
    );

    const staging = readFileSync(join(outputDir, "staging-values.yaml"), "utf8");
    const production = readFileSync(
      join(outputDir, "production-values.yaml"),
      "utf8",
    );
    const evidence = JSON.parse(
      readFileSync(join(outputDir, "promotion-evidence.json"), "utf8"),
    );

    assert.match(staging, /sha-0123456789abcdef0123456789abcdef01234567/);
    assert.match(
      production,
      /sha-0123456789abcdef0123456789abcdef01234567/,
    );
    assert.equal(evidence.releaseSha, releaseSha);
    assert.equal(evidence.sameArtifactAcrossEnvironments, true);
    assert.equal(evidence.realProductionDeployment, false);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});
