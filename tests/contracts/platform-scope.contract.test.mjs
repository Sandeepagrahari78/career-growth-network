import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  checkRegistry,
  platformsChanged,
  ticketFromBranch,
  validatePlatformScope,
} from "../../scripts/ci/platform-scope-policy.mjs";

const registry = JSON.parse(
  readFileSync("config/ci/ticket-platform-scopes.v1.json", "utf8"),
);
const check = (branch, files, rules = registry) =>
  validatePlatformScope({ branch, files, registry: rules });

test("checked-in Jira platform registry is well-formed", () => {
  assert.deepEqual(checkRegistry(registry), []);
  assert.deepEqual(registry.tickets["CGN-86"].platforms, ["web"]);
  assert.deepEqual(registry.tickets["CGN-128"].platforms, ["mobile"]);
});

test("correct web and mobile tickets can edit their own apps", () => {
  assert.deepEqual(check("CGN-86-nextjs-shell", ["apps/web/src/app.tsx"]), []);
  assert.deepEqual(check("CGN-128-expo-shell", ["apps/mobile/app.tsx"]), []);
  assert.deepEqual(
    check("CGN-220-opportunities", ["apps/web/src/admin.tsx"]),
    [],
  );
});

test("a web ticket cannot silently change Android files and vice versa", () => {
  assert.match(
    check("CGN-86-nextjs-shell", ["apps/mobile/app.tsx"]).join(" "),
    /modifies apps\/mobile/,
  );
  assert.match(
    check("CGN-128-expo-shell", ["apps/web/app.tsx"]).join(" "),
    /modifies apps\/web/,
  );
});

test("a ticket editing both frontends needs explicit reviewed scope", () => {
  assert.match(
    check("CGN-86-nextjs-shell", [
      "apps/web/src/app.tsx",
      "apps/mobile/app.tsx",
    ]).join(" "),
    /apps\/mobile/,
  );
  assert.deepEqual(
    check("CGN-133-sentry-parity", [
      "apps/web/src/error.ts",
      "apps/mobile/src/error.ts",
    ]),
    [],
  );
  const invalid = {
    ...registry,
    tickets: {
      ...registry.tickets,
      "CGN-133": {
        platforms: ["web", "mobile"],
        note: "Both-platform test",
      },
    },
  };
  assert.match(checkRegistry(invalid).join(" "), /reviewRequired/);
});

test("unknown platform tickets must be registered after LIVE Jira review", () => {
  assert.match(
    check("CGN-999-fabricated", ["apps/web/src/page.tsx"]).join(" "),
    /Unregistered platform ticket/,
  );
  assert.match(
    check("ci/emergency", ["apps/mobile/src/page.tsx"]).join(" "),
    /require a CGN-NNN/,
  );
});

test("backend-only, contract-only and docs-only changes are unaffected", () => {
  const files = [
    "services/identity/src/index.ts",
    "packages/contracts/src/index.ts",
    "docs/architecture/PROJECT_FLOW.md",
  ];
  assert.deepEqual(platformsChanged(files), []);
  assert.deepEqual(check("CGN-286-ci-platform-guardrail", files), []);
});

test("rejects invalid keys, platform names and duplicate platform values", () => {
  const bad = {
    ...registry,
    tickets: {
      "CGN-0": { platforms: ["web"], note: "invalid id" },
      "CGN-10": { platforms: ["ios"], note: "excluded" },
      "CGN-11": { platforms: ["web", "web"], note: "duplicate" },
    },
  };
  assert.equal(checkRegistry(bad).length, 4);
  assert.equal(ticketFromBranch("CGN-128-expo-shell"), "CGN-128");
  assert.equal(ticketFromBranch("CGN-128"), null);
});
