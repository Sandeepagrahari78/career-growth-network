#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="cgn-local"
CONFIG_PATH="infra/k8s/local/k3d.yaml"

for command in docker k3d kubectl node; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Required command is missing: $command" >&2
    exit 1
  }
done

docker info >/dev/null
node scripts/ci/validate-local-network.mjs

if k3d cluster list --no-headers 2>/dev/null | awk '{print $1}' | grep -qx "$CLUSTER_NAME"; then
  echo "k3d cluster $CLUSTER_NAME already exists; reusing it."
else
  k3d cluster create --config "$CONFIG_PATH"
fi

kubectl config use-context "k3d-$CLUSTER_NAME" >/dev/null
kubectl apply -f infra/k8s/base

kubectl wait --for=condition=Ready nodes --all --timeout=180s
kubectl -n kube-system rollout status deployment/coredns --timeout=180s

for attempt in $(seq 1 60); do
  if kubectl -n kube-system get deployment traefik >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    echo "Traefik deployment did not appear." >&2
    exit 1
  fi
  sleep 2
done

kubectl -n kube-system rollout status deployment/traefik --timeout=180s
kubectl get ingressclass traefik >/dev/null

echo "CGN local k3d cluster is ready."
