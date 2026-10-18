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
    cidrsOverlap(baseline.cluster.podSubnet, baseline.cluster.serviceSubnet),
    false,
    "pod and service CIDRs must not overlap",
  );

  assert.equal(baseline.cluster.apiServerAddress, "127.0.0.1");
  assert.equal(baseline.ingress.bindAddress, "127.0.0.1");
  assert.equal(baseline.ingress.publicByDefault, false);

  assert.deepEqual([...baseline.namespaces].sort(), [
    "cgn-apps",
    "cgn-data",
    "cgn-system",
  ]);

  for (const service of Object.values(baseline.dataServices)) {
    assert.equal(service.namespace, "cgn-data");
    assert.equal(service.exposure, "ClusterIP");
  }

  assert.equal(baseline.networkPolicy.defaultDenyIngress, true);
  assert.equal(baseline.networkPolicy.defaultDenyEgress, true);
  assert.equal(baseline.networkPolicy.allowDnsEgress, true);
  assert.deepEqual(
    [...baseline.networkPolicy.defaultDenyNamespaces].sort(),
    [...baseline.namespaces].sort(),
    "every CGN namespace must receive the default-deny baseline",
  );

  return true;
}

export function validateManifests(manifestRootPath = manifestRoot) {
  const files = readdirSync(manifestRootPath)
    .filter((file) => file.endsWith(".yaml"))
    .sort();

  assert.ok(
    files.length >= 3,
    "expected Kubernetes security baseline manifests",
  );

  const source = files
    .map((file) => readFileSync(join(manifestRootPath, file), "utf8"))
    .join("\n");

  for (const namespace of ["cgn-system", "cgn-apps", "cgn-data"]) {
    assert.match(source, new RegExp(`name: ${namespace}\\b`));
  }

  assert.match(source, /kind: NetworkPolicy/);

  const defaultDeny = readFileSync(
    join(manifestRootPath, "network-policy-default-deny.yaml"),
    "utf8",
  );
  const allowDns = readFileSync(
    join(manifestRootPath, "network-policy-allow-dns.yaml"),
    "utf8",
  );
  const baseline = loadBaseline();

  for (const namespace of baseline.networkPolicy.defaultDenyNamespaces) {
    const policyDocuments = defaultDeny.split(/^---\s*$/m);
    const denyPolicy = policyDocuments.find((document) =>
      new RegExp(`name: default-deny-all\\s+namespace: ${namespace}\\b`).test(
        document,
      ),
    );
    assert.ok(denyPolicy, `expected default-deny policy for ${namespace}`);
    assert.match(denyPolicy, /podSelector:\s*\{\}/);
    assert.match(denyPolicy, /policyTypes:[\s\S]*?- Ingress[\s\S]*?- Egress/);

    const dnsDocuments = allowDns.split(/^---\s*$/m);
    const dnsPolicy = dnsDocuments.find((document) =>
      new RegExp(`name: allow-dns-egress\\s+namespace: ${namespace}\\b`).test(
        document,
      ),
    );
    assert.ok(dnsPolicy, `expected DNS egress policy for ${namespace}`);
    assert.match(dnsPolicy, /k8s-app: kube-dns/);
    assert.match(dnsPolicy, /protocol: UDP\s+port: 53/);
    assert.match(dnsPolicy, /protocol: TCP\s+port: 53/);
  }

  const smokeAllow = readFileSync(
    join(repoRoot, "infra/k8s/smoke/network-policy-probe-allow.yaml"),
    "utf8",
  );
  const smokePolicies = smokeAllow.split(/^---\s*$/m);
  const egressProbe = smokePolicies.find((document) =>
    /name: smoke-allow-target-egress/.test(document),
  );
  const ingressProbe = smokePolicies.find((document) =>
    /name: smoke-allow-target-ingress/.test(document),
  );

  assert.ok(egressProbe, "expected the explicit service egress probe policy");
  assert.match(egressProbe, /namespace: cgn-apps/);
  assert.match(egressProbe, /app: netpol-client/);
  assert.match(egressProbe, /kubernetes\.io\/metadata\.name: cgn-data/);
  assert.match(egressProbe, /app: netpol-target/);
  assert.match(egressProbe, /protocol: TCP\s+port: 8080/);

  assert.ok(ingressProbe, "expected the explicit service ingress probe policy");
  assert.match(ingressProbe, /namespace: cgn-data/);
  assert.match(ingressProbe, /app: netpol-target/);
  assert.match(ingressProbe, /kubernetes\.io\/metadata\.name: cgn-apps/);
  assert.match(ingressProbe, /app: netpol-client/);
  assert.match(ingressProbe, /protocol: TCP\s+port: 8080/);

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
