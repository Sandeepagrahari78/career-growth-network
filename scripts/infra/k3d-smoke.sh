#!/usr/bin/env bash
set -euo pipefail

PROBE="infra/k8s/smoke/network-policy-probe.yaml"
ALLOW="infra/k8s/smoke/network-policy-probe-allow.yaml"
SERVICE_URL="http://netpol-target.cgn-data.svc.cluster.local:8080/"

cleanup() {
  kubectl delete -f "$ALLOW" --ignore-not-found >/dev/null 2>&1 || true
  kubectl delete -f "$PROBE" --ignore-not-found >/dev/null 2>&1 || true
}
trap cleanup EXIT

kubectl config current-context | grep -qx "k3d-cgn-local"
kubectl get namespace cgn-system cgn-apps cgn-data >/dev/null
kubectl get ingressclass traefik >/dev/null
kubectl -n kube-system rollout status deployment/coredns --timeout=180s
kubectl -n kube-system rollout status deployment/traefik --timeout=180s

docker port k3d-cgn-local-serverlb 6443/tcp | grep -qx "127.0.0.1:6550"
docker port k3d-cgn-local-serverlb 80/tcp | grep -qx "127.0.0.1:8080"
docker port k3d-cgn-local-serverlb 443/tcp | grep -qx "127.0.0.1:8443"

kubectl apply -f "$PROBE"
kubectl -n cgn-data wait --for=condition=Ready pod/netpol-target --timeout=180s
kubectl -n cgn-apps wait --for=condition=Ready pod/netpol-client --timeout=180s

kubectl -n cgn-apps exec netpol-client --   nslookup netpol-target.cgn-data.svc.cluster.local >/dev/null

sleep 3

if kubectl -n cgn-apps exec netpol-client --   wget -q -T 2 -O - "$SERVICE_URL" >/dev/null 2>&1; then
  echo "Default-deny NetworkPolicy did not block cross-namespace traffic." >&2
  exit 1
fi

echo "Default-deny NetworkPolicy enforcement confirmed."

kubectl apply -f "$ALLOW"

allowed="false"
for _ in $(seq 1 30); do
  response="$(
    kubectl -n cgn-apps exec netpol-client --       wget -q -T 2 -O - "$SERVICE_URL" 2>/dev/null || true
  )"
  if [ "$response" = "ok" ]; then
    allowed="true"
    break
  fi
  sleep 1
done

if [ "$allowed" != "true" ]; then
  echo "Explicit allow NetworkPolicy did not restore expected traffic." >&2
  exit 1
fi

echo "Service discovery and explicit NetworkPolicy allow path confirmed."
echo "CGN local Kubernetes smoke passed."
