import assert from "node:assert/strict";
import test from "node:test";
import { selectDockerServices } from "../../scripts/ci/changed-docker-services.mjs";

const availableServices = ["career", "health-demo", "identity"];

test("selects only the changed Docker service for service-local changes", () => {
  assert.deepEqual(
    selectDockerServices({
      changedFiles: ["services/identity/src/index.ts"],
      availableServices,
    }),
    ["identity"],
  );
});

test("shared Docker inputs rebuild all Docker services", () => {
  assert.deepEqual(
    selectDockerServices({
      changedFiles: ["pnpm-lock.yaml"],
      availableServices,
    }),
    ["career", "health-demo", "identity"],
  );
});

test("docs-only changes build no Docker service", () => {
  assert.deepEqual(
    selectDockerServices({
      changedFiles: ["docs/runbooks/example.md"],
      availableServices,
    }),
    [],
  );
});

test("manual force-all builds every Docker service", () => {
  assert.deepEqual(
    selectDockerServices({
      changedFiles: [],
      availableServices,
      forceAll: true,
    }),
    ["career", "health-demo", "identity"],
  );
});
