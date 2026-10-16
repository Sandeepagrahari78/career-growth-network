import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const contract = JSON.parse(
  readFileSync(
    resolve(repoRoot, "packages/contracts/ui/cgn-v2-six-screen.v1.json"),
    "utf8",
  ),
);
const expectedIds = ["UI-01", "UI-02", "UI-03", "UI-04", "UI-05", "UI-06"];
const expectedTabs = ["Home", "Explore", "Journey", "Chats", "Profile"];
const assetDir = resolve(repoRoot, "docs/design/approved-six-v1/images");

test("six-screen visual-intent contract keeps the exact approved screen set", () => {
  assert.equal(contract.contractType, "ui-visual-intent-only");
  assert.equal(contract.assetsRequireVerifiedHash, true);
  assert.equal(
    contract.status,
    "VISUAL_DIRECTION_APPROVED_ASSETS_VERIFIED_IN_GITHUB__FIGMA_REVIEW_PENDING",
  );
  assert.deepEqual(contract.bottomTabs, expectedTabs);
  assert.deepEqual(
    contract.screens.map((screen) => screen.screenId),
    expectedIds,
  );
  assert.equal(
    new Set(contract.screens.map((screen) => screen.visualFile)).size,
    6,
  );
});

for (const screen of contract.screens) {
  test(`${screen.screenId} approved PNG binary is unchanged and addressable`, () => {
    assert.equal(screen.assetStatus, "VERIFIED_IN_GITHUB");
    assert.match(screen.originalSha256, /^[a-f0-9]{64}$/);
    assert.match(screen.verifiedGitBlobSha1, /^[a-f0-9]{40}$/);
    const relative = screen.visualFile;
    const absolute = resolve(repoRoot, relative);
    assert.ok(
      absolute.startsWith(assetDir + sep),
      "approved visual must remain in canonical images directory",
    );
    assert.match(
      relative,
      /^docs\/design\/approved-six-v1\/images\/cgn_[a-z0-9_]+\.png$/,
    );
    const bytes = readFileSync(absolute);
    assert.deepEqual(
      [...bytes.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      screen.originalSha256,
      "original approved image was altered",
    );
    const gitHeader = Buffer.from(`blob ${bytes.length}\0`);
    assert.equal(
      createHash("sha1").update(gitHeader).update(bytes).digest("hex"),
      screen.verifiedGitBlobSha1,
      "GitHub blob mapping must refer to the same binary",
    );
  });
}

test("visual mockups cannot claim implemented API/domain contracts", () => {
  assert.ok(
    contract.scopeExclusions.includes(
      "No backend REST routes inferred from screenshot",
    ),
  );
  assert.equal(
    contract.authenticationOwnership,
    "Identity service (existing domain)",
  );
  assert.equal(
    contract.onboarding,
    "google-or-email-auth → choose-one-current-status → Home",
  );
});
