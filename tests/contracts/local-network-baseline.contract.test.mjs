import assert from "node:assert/strict";
import test from "node:test";

import {
  cidrsOverlap,
  loadBaseline,
  validateBaseline,
  validateManifests,
} from "../../scripts/ci/validate-local-network.mjs";

test("approved local network/security baseline is safe", () => {
  assert.equal(validateBaseline(loadBaseline()), true);
  assert.equal(validateManifests(), true);
});

test("default-deny and DNS allowances cover every CGN namespace", () => {
  const baseline = loadBaseline();
  assert.deepEqual(
    [...baseline.networkPolicy.defaultDenyNamespaces].sort(),
    [...baseline.namespaces].sort(),
  );
  assert.equal(validateManifests(), true);

  const incomplete = structuredClone(baseline);
  incomplete.networkPolicy.defaultDenyNamespaces = ["cgn-apps", "cgn-data"];
  assert.throws(() => validateBaseline(incomplete));
});

test("temporary service allow path is limited to the smoke probe and port", () => {
  assert.equal(validateManifests(), true);
});

test("pod and service CIDRs cannot overlap", () => {
  assert.equal(cidrsOverlap("10.244.0.0/16", "10.96.0.0/16"), false);
  assert.equal(cidrsOverlap("10.244.0.0/16", "10.244.10.0/24"), true);
});

test("public developer ingress is rejected", () => {
  const unsafe = structuredClone(loadBaseline());
  unsafe.ingress.bindAddress = "0.0.0.0";
  assert.throws(() => validateBaseline(unsafe));
});

test("cloud resources are rejected by the local baseline", () => {
  const unsafe = structuredClone(loadBaseline());
  unsafe.cloudResourcesEnabled = true;
  assert.throws(() => validateBaseline(unsafe));
});

test("overlapping cluster CIDRs are rejected", () => {
  const unsafe = structuredClone(loadBaseline());
  unsafe.cluster.serviceSubnet = "10.244.128.0/17";
  assert.throws(() => validateBaseline(unsafe));
});
