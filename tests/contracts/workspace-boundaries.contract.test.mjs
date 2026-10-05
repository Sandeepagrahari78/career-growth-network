import assert from "node:assert/strict";
import test from "node:test";

import {
  discoverWorkspacePackages,
  loadWorkspaceBoundaries,
  validateWorkspaceFile,
  validateWorkspaceGraph,
} from "../../scripts/ci/verify-workspace-boundaries.mjs";

const boundaries = loadWorkspaceBoundaries();

function pkg(path, category, name, dependencies = {}) {
  return {
    path,
    category,
    manifest: {
      name,
      private: true,
      version: "0.0.0",
      type: "module",
      dependencies,
    },
  };
}

test("real monorepo workspace satisfies the frozen package boundaries", () => {
  const packages = discoverWorkspacePackages();

  assert.equal(validateWorkspaceFile(), true);
  assert.equal(validateWorkspaceGraph(packages, boundaries), true);
  assert.ok(packages.length >= 15);
});

test("services cannot depend directly on another service", () => {
  const packages = [
    pkg("services/identity", "services", "@cgn/identity", {
      "@cgn/career": "workspace:*",
    }),
    pkg("services/career", "services", "@cgn/career"),
  ];

  assert.throws(
    () => validateWorkspaceGraph(packages, boundaries),
    /must not depend directly/,
  );
});

test("apps cannot import a service package as an implementation shortcut", () => {
  const packages = [
    pkg("apps/web", "apps", "@cgn/web", {
      "@cgn/identity": "workspace:*",
    }),
    pkg("services/identity", "services", "@cgn/identity"),
  ];

  assert.throws(
    () => validateWorkspaceGraph(packages, boundaries),
    /must not depend directly/,
  );
});

test("shared packages may depend on shared packages but not services", () => {
  const allowed = [
    pkg("packages/tooling", "sharedPackages", "@cgn/tooling", {
      "@cgn/contracts": "workspace:*",
    }),
    pkg("packages/contracts", "sharedPackages", "@cgn/contracts"),
  ];
  assert.equal(validateWorkspaceGraph(allowed, boundaries), true);

  const forbidden = [
    pkg("packages/tooling", "sharedPackages", "@cgn/tooling", {
      "@cgn/identity": "workspace:*",
    }),
    pkg("services/identity", "services", "@cgn/identity"),
  ];
  assert.throws(
    () => validateWorkspaceGraph(forbidden, boundaries),
    /must not depend directly/,
  );
});

test("workspace package names must be unique", () => {
  const packages = [
    pkg("apps/web", "apps", "@cgn/duplicate"),
    pkg("apps/mobile", "apps", "@cgn/duplicate"),
  ];

  assert.throws(
    () => validateWorkspaceGraph(packages, boundaries),
    /Duplicate workspace package name/,
  );
});
