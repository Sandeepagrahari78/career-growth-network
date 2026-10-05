import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const baselinePath = join(repoRoot, "config/infra/local-network.v1.json");
const manifestRoot = join(repoRoot, "infra/k8s/base");

function ipv4ToBigInt(address) {
  const parts = address.split(".").map(Number);

  assert.equal(parts.length, 4, `Invalid IPv4 address: ${address}`);

  for (const part of parts) {
    assert.ok(
      Number.isInteger(part) && part >= 0 && part <= 255,
      `Invalid IPv4 address: ${address}`,
    );
  }

  return parts.reduce((value, part) => (value << 8n) + BigInt(part), 0n);
}

export function cidrRange(cidr) {
  const [address, prefixText] = cidr.split("/");
  const prefix = Number(prefixText);

  assert.ok(
    Number.isInteger(prefix) && prefix >= 0 && prefix <= 32,
    `Invalid IPv4 CIDR: ${cidr}`,
  );

  const hostBits = 32 - prefix;
  const size = 1n << BigInt(hostBits);
  const ip = ipv4ToBigInt(address);
  const start = (ip / size) * size;

  return {
    start,
    end: start + size - 1n,
  };
}

function isContained(inner, outer) {
  return inner.start >= outer.start && inner.end <= outer.end;
}

export function isPrivateCidr(cidr) {
  const range = cidrRange(cidr);
  const privateRanges = [
    cidrRange("10.0.0.0/8"),
    cidrRange("172.16.0.0/12"),
    cidrRange("192.168.0.0/16"),
  ];

  return privateRanges.some((privateRange) => isContained(range, privateRange));
}

export function cidrsOverlap(left, right) {
  const a = cidrRange(left);
  const b = cidrRange(right);
  return a.start <= b.end && b.start <= a.end;
}

export function validateBaseline(baseline) {
  assert.equal(baseline.contract, "cgn.local-network.v1");
  assert.equal(baseline.cloudResourcesEnabled, false);

  assert.ok(isPrivateCidr(baseline.cluster.podSubnet));
  assert.ok(isPrivateCidr(baseline.cluster.serviceSubnet));
  assert.equal(
    cidrsOverlap(
      baseline.cluster.podSubnet,
      baseline.cluster.serviceSubnet,
    ),
    false,
    "pod and service CIDRs must not overlap",
  );

  assert.equal(baseline.cluster.apiServerAddress, "127.0.0.1");
  assert.equal(baseline.ingress.bindAddress, "127.0.0.1");
  assert.equal(baseline.ingress.publicByDefault, false);

  assert.deepEqual(
    [...baseline.namespaces].sort(),
    ["cgn-apps", "cgn-data", "cgn-system"],
  );

  for (const service of Object.values(baseline.dataServices)) {
    assert.equal(service.namespace, "cgn-data");
    assert.equal(service.exposure, "ClusterIP");
  }

  assert.equal(baseline.networkPolicy.defaultDenyIngress, true);
  assert.equal(baseline.networkPolicy.defaultDenyEgress, true);
  assert.equal(baseline.networkPolicy.allowDnsEgress, true);

  return true;
}

export function validateManifests(manifestRootPath = manifestRoot) {
  const files = readdirSync(manifestRootPath)
    .filter((file) => file.endsWith(".yaml"))
    .sort();

  assert.ok(files.length >= 3, "expected Kubernetes security baseline manifests");

  const source = files
    .map((file) => readFileSync(join(manifestRootPath, file), "utf8"))
    .join("\n");

  for (const namespace of ["cgn-system", "cgn-apps", "cgn-data"]) {
    assert.match(source, new RegExp(`name: ${namespace}\\b`));
  }

  assert.match(source, /kind: NetworkPolicy/);
  assert.match(source, /name: default-deny-all/);
  assert.match(source, /namespace: cgn-apps/);
  assert.match(source, /namespace: cgn-data/);
  assert.match(source, /name: allow-dns-egress/);
  assert.match(source, /port: 53/);

  assert.doesNotMatch(source, /type:\s*(?:LoadBalancer|NodePort)/);
  assert.doesNotMatch(source, /hostNetwork:\s*true/);
  assert.doesNotMatch(source, /0\.0\.0\.0/);

  return true;
}

export function loadBaseline(path = baselinePath) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  validateBaseline(loadBaseline());
  validateManifests();
  console.log("Local network/security baseline validation passed.");
}
