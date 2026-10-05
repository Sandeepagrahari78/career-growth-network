$ErrorActionPreference = "Stop"

$ClusterName = "cgn-local"
$ConfigPath = "infra/k8s/local/k3d.yaml"

foreach ($Command in @("docker", "k3d", "kubectl", "node")) {
  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    throw "Required command is missing: $Command"
  }
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker is not running."
}

node scripts/ci/validate-local-network.mjs
if ($LASTEXITCODE -ne 0) {
  throw "Local network baseline validation failed."
}

$Clusters = k3d cluster list --no-headers 2>$null
$Exists = $Clusters | Where-Object { ($_ -split "\s+")[0] -eq $ClusterName }

if ($Exists) {
  Write-Host "k3d cluster $ClusterName already exists; reusing it."
} else {
  k3d cluster create --config $ConfigPath
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create k3d cluster."
  }
}

kubectl config use-context "k3d-$ClusterName" *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Unable to select cluster context."
}

kubectl apply -f infra/k8s/base
if ($LASTEXITCODE -ne 0) {
  throw "Failed to apply Kubernetes baseline."
}

kubectl wait --for=condition=Ready nodes --all --timeout=180s
if ($LASTEXITCODE -ne 0) {
  throw "Cluster nodes did not become Ready."
}

kubectl -n kube-system rollout status deployment/coredns --timeout=180s
if ($LASTEXITCODE -ne 0) {
  throw "CoreDNS did not become ready."
}

$TraefikFound = $false
for ($Attempt = 1; $Attempt -le 60; $Attempt++) {
  kubectl -n kube-system get deployment traefik *> $null
  if ($LASTEXITCODE -eq 0) {
    $TraefikFound = $true
    break
  }
  Start-Sleep -Seconds 2
}

if (-not $TraefikFound) {
  throw "Traefik deployment did not appear."
}

kubectl -n kube-system rollout status deployment/traefik --timeout=180s
if ($LASTEXITCODE -ne 0) {
  throw "Traefik did not become ready."
}

kubectl get ingressclass traefik *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Traefik IngressClass is unavailable."
}

Write-Host "CGN local k3d cluster is ready."
