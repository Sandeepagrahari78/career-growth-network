#!/usr/bin/env bash
set -euo pipefail

PROBE="infra/k8s/smoke/network-policy-probe.yaml"
ALLOW="infra/k8s/smoke/network-policy-probe-allow.yaml"
SERVICE_URL="http://netpol-target.cgn-data.svc.cluster.local:8080/"
INGRESS="infra/k8s/local/health-demo-ingress.yaml"
INGRESS_ALLOW="infra/k8s/local/health-demo-ingress-allow.yaml"
TLS_DIR=".local/k3d/tls"
TLS_CERT="$TLS_DIR/health.cgn.localhost.crt"
TLS_KEY="$TLS_DIR/health.cgn.localhost.key"
HOST="health.cgn.localhost"
SMOKE_NAMESPACE="cgn-cgn63-ingress-$$"
INGRESS_RENDERED=".local/k3d/health-demo-ingress.yaml"
INGRESS_ALLOW_RENDERED=".local/k3d/health-demo-ingress-allow.yaml"
RELEASE="cgn-health-demo"
IMAGE="cgn-health-demo:cgn63-ingress-smoke"

cleanup() {
  kubectl delete namespace "$SMOKE_NAMESPACE" --ignore-not-found --wait=true \
    --timeout=180s >/dev/null 2>&1 || true
  kubectl delete -f "$ALLOW" --ignore-not-found >/dev/null 2>&1 || true
  kubectl delete -f "$PROBE" --ignore-not-found >/dev/null 2>&1 || true
}
trap cleanup EXIT

for command in docker helm openssl curl; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Required command is missing: $command" >&2
    exit 1
  }
done

kubectl config current-context | grep -qx "k3d-cgn-local"
kubectl get namespace cgn-system cgn-apps cgn-data >/dev/null
kubectl get ingressclass traefik >/dev/null
kubectl -n kube-system rollout status deployment/coredns --timeout=180s
kubectl -n kube-system rollout status deployment/traefik --timeout=180s

docker port k3d-cgn-local-serverlb 6443/tcp | grep -qx "127.0.0.1:6550"
docker port k3d-cgn-local-serverlb 80/tcp | grep -qx "127.0.0.1:8080"
docker port k3d-cgn-local-serverlb 443/tcp | grep -qx "127.0.0.1:8443"

mkdir -p "$TLS_DIR"
umask 077
if [ ! -s "$TLS_CERT" ] || [ ! -s "$TLS_KEY" ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$TLS_KEY" -out "$TLS_CERT" \
    -subj "/CN=$HOST" \
    -addext "subjectAltName=DNS:$HOST" \
    -addext "basicConstraints=critical,CA:TRUE"
fi
chmod 600 "$TLS_KEY"

mkdir -p .local/k3d
sed "s/namespace: cgn-apps/namespace: $SMOKE_NAMESPACE/" "$INGRESS" \
  > "$INGRESS_RENDERED"
sed "s/namespace: cgn-apps/namespace: $SMOKE_NAMESPACE/" "$INGRESS_ALLOW" \
  > "$INGRESS_ALLOW_RENDERED"

docker build -f services/health-demo/Dockerfile -t "$IMAGE" .
k3d image import "$IMAGE" --cluster cgn-local
kubectl create namespace "$SMOKE_NAMESPACE"
helm upgrade --install "$RELEASE" infra/helm/cgn-service \
  --namespace "$SMOKE_NAMESPACE" \
  --set nameOverride=cgn-health-demo \
  --values infra/helm/values/health-demo-staging.yaml \
  --set image.tag=cgn63-ingress-smoke \
  --wait --timeout 180s
kubectl -n "$SMOKE_NAMESPACE" create secret tls cgn-local-development-tls \
  --cert "$TLS_CERT" --key "$TLS_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f "$INGRESS_ALLOW_RENDERED"
kubectl apply -f "$INGRESS_RENDERED"
kubectl -n "$SMOKE_NAMESPACE" rollout status deployment/cgn-health-demo --timeout=180s

for _ in $(seq 1 30); do
  if curl --fail --silent --show-error --cacert "$TLS_CERT" \
    --resolve "$HOST:8443:127.0.0.1" "https://$HOST:8443/health" \
    | grep -q '"status":"ok"'; then
    break
  fi
  sleep 1
done
curl --fail --silent --show-error --cacert "$TLS_CERT" \
  --resolve "$HOST:8443:127.0.0.1" "https://$HOST:8443/ready" \
  | grep -q '"status":"ready"'
http_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --resolve "$HOST:8080:127.0.0.1" "http://$HOST:8080/health")"
test "$http_status" = "200"
path_status="$(curl --insecure --silent --output /dev/null --write-out '%{http_code}' \
  --resolve "$HOST:8443:127.0.0.1" "https://$HOST:8443/not-a-cgn-route")"
test "$path_status" = "404"
host_status="$(curl --insecure --silent --output /dev/null --write-out '%{http_code}' \
  --resolve "unknown.cgn.localhost:8443:127.0.0.1" \
  "https://unknown.cgn.localhost:8443/health")"
test "$host_status" = "404"
echo "Local HTTP/HTTPS ingress, trusted development certificate and unknown host/path checks passed."

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

kubectl delete -f "$INGRESS_RENDERED" --wait=true
if kubectl -n "$SMOKE_NAMESPACE" get ingress cgn-health-demo-local >/dev/null 2>&1; then
  echo "Ingress route still exists after rollback." >&2
  exit 1
fi
rollback_status="$(curl --max-time 10 --silent --output /dev/null --write-out '%{http_code}' \
  --resolve "$HOST:8080:127.0.0.1" "http://$HOST:8080/health")"
test "$rollback_status" = "404"
echo "Ingress deletion and default HTTP 404 rollback confirmed."
echo "CGN local Kubernetes smoke passed."
