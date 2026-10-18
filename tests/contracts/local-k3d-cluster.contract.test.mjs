import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = readFileSync("infra/k8s/local/k3d.yaml", "utf8");
const localIngress = readFileSync(
  "infra/k8s/local/health-demo-ingress.yaml",
  "utf8",
);
const ingressNetworkPolicy = readFileSync(
  "infra/k8s/local/health-demo-ingress-allow.yaml",
  "utf8",
);
const network = JSON.parse(
  readFileSync("config/infra/local-network.v1.json", "utf8"),
);

test("k3d cluster config matches the approved local network contract", () => {
  assert.match(config, /apiVersion: k3d\.io\/v1alpha5/);
  assert.match(config, /name: cgn-local/);
  assert.match(config, /image: rancher\/k3s:v1\.35\.9-k3s1/);

  assert.match(
    config,
    new RegExp(`--cluster-cidr=${network.cluster.podSubnet}`),
  );
  assert.match(
    config,
    new RegExp(`--service-cidr=${network.cluster.serviceSubnet}`),
  );

  assert.match(config, /hostIP: 127\.0\.0\.1/);
  assert.match(config, /127\.0\.0\.1:8080:80/);
  assert.match(config, /127\.0\.0\.1:8443:443/);
});

test("local cluster does not disable required platform networking", () => {
  assert.doesNotMatch(config, /--disable-network-policy/);
  assert.doesNotMatch(config, /--disable(?:=|\s+)traefik/);
  assert.doesNotMatch(config, /0\.0\.0\.0/);
});

test("local cluster config contains no cloud-specific infrastructure", () => {
  assert.doesNotMatch(config, /\b(?:aws|eks|azure|gcp|google)\b/i);
});

test(
  "local Traefik ingress routes the CGN health service over development TLS",
  () => {
    assert.match(localIngress, /ingressClassName: traefik/);
    assert.match(localIngress, /host: health\.cgn\.localhost/);
    assert.match(localIngress, /secretName: cgn-local-development-tls/);
    assert.match(localIngress, /name: cgn-health-demo/);
    assert.match(localIngress, /number: 3001/);
    assert.match(localIngress, /web,websecure/);
    assert.doesNotMatch(localIngress, /LoadBalancer|aws|acme|letsencrypt/i);
  },
);

test(
  "local ingress allow policy is scoped to Traefik namespace and app port",
  () => {
    assert.match(ingressNetworkPolicy, /kind: NetworkPolicy/);
    assert.match(ingressNetworkPolicy, /namespace: cgn-apps/);
    assert.match(
      ingressNetworkPolicy,
      /app\.kubernetes\.io\/name: cgn-health-demo/,
    );
    assert.match(
      ingressNetworkPolicy,
      /kubernetes\.io\/metadata\.name: kube-system/,
    );
    assert.match(ingressNetworkPolicy, /port: 3001/);
    assert.doesNotMatch(ingressNetworkPolicy, /0\.0\.0\.0\/0/);
  },
);
