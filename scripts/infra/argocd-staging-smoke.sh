#!/usr/bin/env bash
set -euo pipefail

ARGOCD_VERSION="${ARGOCD_VERSION:-v2.13.3}"
ARGOCD_NAMESPACE="argocd"
ARGOCD_MANIFEST_URL="https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml"

for command in curl kubectl node; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Required command is missing: $command" >&2
    exit 1
  }
done

node scripts/ci/validate-argocd-staging.mjs
kubectl config current-context | grep -qx "k3d-cgn-local"

kubectl create namespace "$ARGOCD_NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
curl --fail --location --silent --show-error "$ARGOCD_MANIFEST_URL" | kubectl apply -n "$ARGOCD_NAMESPACE" -f -

kubectl -n "$ARGOCD_NAMESPACE" rollout status deployment/argocd-repo-server --timeout=300s
kubectl -n "$ARGOCD_NAMESPACE" rollout status deployment/argocd-server --timeout=300s
kubectl -n "$ARGOCD_NAMESPACE" rollout status deployment/argocd-applicationset-controller --timeout=300s
kubectl -n "$ARGOCD_NAMESPACE" rollout status statefulset/argocd-application-controller --timeout=300s

kubectl apply -k infra/gitops/argocd
kubectl -n "$ARGOCD_NAMESPACE" get appproject cgn-staging >/dev/null
kubectl -n "$ARGOCD_NAMESPACE" get applicationset cgn-staging-applications >/dev/null

if kubectl -n "$ARGOCD_NAMESPACE" get secret 2>/dev/null | grep -E "cgn|career-growth-network|repo"; then
  echo "Unexpected committed repository credential or CGN repo secret detected." >&2
  exit 1
fi

echo "CGN-92 local Argo CD staging GitOps smoke passed."
echo "Persistent private-repo sync credentials remain intentionally outside this ticket."
