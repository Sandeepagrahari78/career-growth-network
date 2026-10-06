import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("static Helm promotion validator passes", () => {
  const output = execFileSync(
    "node",
    ["scripts/ci/validate-helm-promotion.mjs"],
    { encoding: "utf8" },
  );
  assert.match(
    output,
    /CGN-93 Helm staging-to-production promotion contract is valid/,
  );
});

test("promotion renderer keeps one immutable artifact across environments", () => {
  const releaseSha = "0123456789abcdef0123456789abcdef01234567";
  const outputDir = mkdtempSync(join(tmpdir(), "cgn-helm-promotion-"));

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

    const staging = readFileSync(
      join(outputDir, "staging-values.yaml"),
      "utf8",
    );
    const production = readFileSync(
      join(outputDir, "production-values.yaml"),
      "utf8",
    );
    const evidence = JSON.parse(
      readFileSync(join(outputDir, "promotion-evidence.json"), "utf8"),
    );

    assert.match(staging, new RegExp(`sha-${releaseSha}`));
    assert.match(production, new RegExp(`sha-${releaseSha}`));
    assert.equal(evidence.releaseSha, releaseSha);
    assert.equal(evidence.sameArtifact, true);
    assert.equal(evidence.realProductionDeployment, false);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});
