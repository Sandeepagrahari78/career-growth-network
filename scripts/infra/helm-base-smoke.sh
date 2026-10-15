#!/usr/bin/env bash
set -euo pipefail

RELEASE="cgn-health-demo"
NAMESPACE="cgn-apps"
IMAGE="cgn-health-demo:helm-smoke"
CHART="infra/helm/cgn-service"
VALUES="infra/helm/values/health-demo-staging.yaml"
INVALID_PROBE_VALUES="tests/fixtures/helm/invalid-probe-path.yaml"
AUTOSCALING_SMOKE_VALUES="tests/fixtures/helm/hpa-pdb-smoke.yaml"
INVALID_AUTOSCALING_VALUES="tests/fixtures/helm/invalid-autoscaling-target.yaml"
MISSING_AUTOSCALING_BOUNDS_VALUES="tests/fixtures/helm/missing-autoscaling-bounds.yaml"
SERVICE_ACCOUNT_SMOKE_VALUES="tests/fixtures/helm/service-account-smoke.yaml"
IRSA_TEMPLATE_VALUES="tests/fixtures/helm/irsa-template-smoke.yaml"
MISSING_IRSA_ROLE_VALUES="tests/fixtures/helm/missing-irsa-role.yaml"
MISSING_EXTERNAL_SERVICE_ACCOUNT_VALUES="tests/fixtures/helm/missing-external-service-account-name.yaml"
IRSA_EXTERNAL_SERVICE_ACCOUNT_VALUES="tests/fixtures/helm/irsa-external-service-account.yaml"
INVALID_TOKEN_AUTOMOUNT_VALUES="tests/fixtures/helm/invalid-token-automount.yaml"
RAW_IRSA_BYPASS_VALUES="tests/fixtures/helm/raw-irsa-annotation-bypass.yaml"

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

if helm lint "$CHART" -f "$INVALID_PROBE_VALUES"; then
  echo "Invalid probe path unexpectedly passed Helm schema validation." >&2
  exit 1
fi
echo "Invalid probe path rejected as expected."

if helm lint "$CHART" -f "$INVALID_AUTOSCALING_VALUES"; then
  echo "Invalid autoscaling target unexpectedly passed Helm schema validation." >&2
  exit 1
fi
echo "Invalid autoscaling target rejected as expected."

if helm template "$RELEASE" "$CHART" -n "$NAMESPACE" -f "$MISSING_AUTOSCALING_BOUNDS_VALUES" >/dev/null; then
  echo "Missing autoscaling replica bounds unexpectedly rendered." >&2
  exit 1
fi
echo "Missing autoscaling replica bounds rejected as expected."

if helm lint "$CHART" -f "$INVALID_TOKEN_AUTOMOUNT_VALUES"; then
  echo "ServiceAccount token automount=true unexpectedly passed schema validation." >&2
  exit 1
fi
echo "ServiceAccount token automount=true rejected as expected."

if helm lint "$CHART" -f "$RAW_IRSA_BYPASS_VALUES"; then
  echo "Raw IRSA annotation bypass unexpectedly passed schema validation." >&2
  exit 1
fi
echo "Raw IRSA annotation bypass rejected as expected."

if helm template "$RELEASE" "$CHART" -n "$NAMESPACE" -f "$MISSING_EXTERNAL_SERVICE_ACCOUNT_VALUES" >/dev/null; then
  echo "External ServiceAccount without a name unexpectedly rendered." >&2
  exit 1
fi
echo "External ServiceAccount without a name rejected as expected."

if helm template "$RELEASE" "$CHART" -n "$NAMESPACE" -f "$MISSING_IRSA_ROLE_VALUES" >/dev/null; then
  echo "IRSA without a role ARN unexpectedly rendered." >&2
  exit 1
fi
echo "IRSA without a role ARN rejected as expected."

if helm template "$RELEASE" "$CHART" -n "$NAMESPACE" -f "$IRSA_EXTERNAL_SERVICE_ACCOUNT_VALUES" >/dev/null; then
  echo "IRSA on an external ServiceAccount unexpectedly rendered." >&2
  exit 1
fi
echo "IRSA on an external ServiceAccount rejected as expected."

helm template "$RELEASE" "$CHART"   -n "$NAMESPACE"   -f "$IRSA_TEMPLATE_VALUES"   >/tmp/cgn-irsa-rendered.yaml
grep -q "kind: ServiceAccount" /tmp/cgn-irsa-rendered.yaml
grep -Eq 'eks\.amazonaws\.com/role-arn:.*cgn-irsa-smoke' /tmp/cgn-irsa-rendered.yaml
if grep -q "kind: Secret" /tmp/cgn-irsa-rendered.yaml; then
  echo "IRSA template unexpectedly rendered a Secret." >&2
  exit 1
fi

helm lint "$CHART" -f "$VALUES" -f "$AUTOSCALING_SMOKE_VALUES" -f "$SERVICE_ACCOUNT_SMOKE_VALUES"
helm template "$RELEASE" "$CHART" \
  -n "$NAMESPACE" \
  -f "$VALUES" \
  -f "$AUTOSCALING_SMOKE_VALUES" \
  -f "$SERVICE_ACCOUNT_SMOKE_VALUES" \
  >/tmp/cgn-helm-rendered.yaml

grep -q "kind: HorizontalPodAutoscaler" /tmp/cgn-helm-rendered.yaml
grep -q "kind: PodDisruptionBudget" /tmp/cgn-helm-rendered.yaml
grep -q "averageUtilization: 70" /tmp/cgn-helm-rendered.yaml
grep -q "averageUtilization: 75" /tmp/cgn-helm-rendered.yaml

docker build -f services/health-demo/Dockerfile -t "$IMAGE" .
k3d image import "$IMAGE" -c cgn-local

helm upgrade --install "$RELEASE" "$CHART" \
  --namespace "$NAMESPACE" \
  --values "$VALUES" \
  --values "$AUTOSCALING_SMOKE_VALUES" \
  --values "$SERVICE_ACCOUNT_SMOKE_VALUES" \
  --wait \
  --timeout 180s

kubectl -n "$NAMESPACE" rollout status deployment/cgn-health-demo --timeout=180s

test "$(kubectl -n "$NAMESPACE" get deployment cgn-health-demo -o jsonpath='{.spec.template.spec.containers[0].startupProbe.httpGet.path}')" = "/health"
test "$(kubectl -n "$NAMESPACE" get deployment cgn-health-demo -o jsonpath='{.spec.template.spec.containers[0].readinessProbe.httpGet.path}')" = "/ready"
test "$(kubectl -n "$NAMESPACE" get deployment cgn-health-demo -o jsonpath='{.spec.template.spec.containers[0].livenessProbe.httpGet.path}')" = "/health"
test "$(kubectl -n "$NAMESPACE" get hpa cgn-health-demo -o jsonpath='{.spec.minReplicas}')" = "2"
test "$(kubectl -n "$NAMESPACE" get hpa cgn-health-demo -o jsonpath='{.spec.maxReplicas}')" = "4"
test "$(kubectl -n "$NAMESPACE" get hpa cgn-health-demo -o jsonpath='{.spec.metrics[?(@.resource.name=="cpu")].resource.target.averageUtilization}')" = "70"
test "$(kubectl -n "$NAMESPACE" get hpa cgn-health-demo -o jsonpath='{.spec.metrics[?(@.resource.name=="memory")].resource.target.averageUtilization}')" = "75"
test "$(kubectl -n "$NAMESPACE" get pdb cgn-health-demo -o jsonpath='{.spec.minAvailable}')" = "1"
test "$(kubectl -n "$NAMESPACE" get serviceaccount cgn-health-demo -o jsonpath='{.automountServiceAccountToken}')" = "false"
test "$(kubectl -n "$NAMESPACE" get deployment cgn-health-demo -o jsonpath='{.spec.template.spec.serviceAccountName}')" = "cgn-health-demo"
test "$(kubectl -n "$NAMESPACE" get deployment cgn-health-demo -o jsonpath='{.spec.template.spec.automountServiceAccountToken}')" = "false"
test "$(kubectl -n "$NAMESPACE" get pods -l app.kubernetes.io/name=cgn-health-demo -o jsonpath='{.items[0].spec.serviceAccountName}')" = "cgn-health-demo"

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
