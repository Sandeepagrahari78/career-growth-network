#!/usr/bin/env bash
set -euo pipefail

RELEASE="cgn-health-demo"
NAMESPACE="cgn-apps"
IMAGE="cgn-health-demo:helm-smoke"
CHART="infra/helm/cgn-service"
VALUES="infra/helm/values/health-demo-staging.yaml"

for command in docker k3d kubectl helm curl; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Required command is missing: $command" >&2
    exit 1
  }
done

cleanup() {
  if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    helm uninstall "$RELEASE" -n "$NAMESPACE" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

helm lint "$CHART" -f "$VALUES"
helm template "$RELEASE" "$CHART" -n "$NAMESPACE" -f "$VALUES" >/tmp/cgn-helm-rendered.yaml

docker build -f services/health-demo/Dockerfile -t "$IMAGE" .
k3d image import "$IMAGE" -c cgn-local

helm upgrade --install "$RELEASE" "$CHART" \
  --namespace "$NAMESPACE" \
  --values "$VALUES" \
  --wait \
  --timeout 180s

kubectl -n "$NAMESPACE" rollout status deployment/cgn-health-demo --timeout=180s

kubectl -n "$NAMESPACE" port-forward service/cgn-health-demo 3001:3001 >/tmp/cgn-helm-port-forward.log 2>&1 &
PORT_FORWARD_PID=$!
trap 'kill "$PORT_FORWARD_PID" >/dev/null 2>&1 || true; cleanup' EXIT

for _ in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:3001/health | grep -q '"status":"ok"'; then
    curl --fail --silent http://127.0.0.1:3001/ready | grep -q '"status":"ready"'
    echo "CGN Helm base chart staging smoke passed."
    exit 0
  fi
  sleep 1
done

cat /tmp/cgn-helm-port-forward.log >&2 || true
kubectl -n "$NAMESPACE" get pods -o wide >&2 || true
exit 1
