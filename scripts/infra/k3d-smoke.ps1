$ErrorActionPreference = "Stop"

$Probe = "infra/k8s/smoke/network-policy-probe.yaml"
$Allow = "infra/k8s/smoke/network-policy-probe-allow.yaml"
$ServiceUrl = "http://netpol-target.cgn-data.svc.cluster.local:8080/"

try {
  $Context = kubectl config current-context
  if ($LASTEXITCODE -ne 0 -or $Context.Trim() -ne "k3d-cgn-local") {
    throw "Expected k3d-cgn-local kubectl context."
  }

  kubectl get namespace cgn-system cgn-apps cgn-data *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "CGN namespaces are unavailable."
  }

  kubectl get ingressclass traefik *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Traefik IngressClass is unavailable."
  }

  $ApiPort = docker port k3d-cgn-local-serverlb 6443/tcp
  $HttpPort = docker port k3d-cgn-local-serverlb 80/tcp
  $HttpsPort = docker port k3d-cgn-local-serverlb 443/tcp

  if ($ApiPort.Trim() -ne "127.0.0.1:6550") {
    throw "Kubernetes API is not loopback-only on 127.0.0.1:6550."
  }
  if ($HttpPort.Trim() -ne "127.0.0.1:8080") {
    throw "HTTP ingress is not loopback-only on 127.0.0.1:8080."
  }
  if ($HttpsPort.Trim() -ne "127.0.0.1:8443") {
    throw "HTTPS ingress is not loopback-only on 127.0.0.1:8443."
  }

  kubectl apply -f $Probe
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to apply network-policy probe."
  }

  kubectl -n cgn-data wait --for=condition=Ready pod/netpol-target --timeout=180s
  if ($LASTEXITCODE -ne 0) {
    throw "Network-policy target did not become ready."
  }

  kubectl -n cgn-apps wait --for=condition=Ready pod/netpol-client --timeout=180s
  if ($LASTEXITCODE -ne 0) {
    throw "Network-policy client did not become ready."
  }

  kubectl -n cgn-apps exec netpol-client -- nslookup netpol-target.cgn-data.svc.cluster.local *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Cluster service discovery failed."
  }

  Start-Sleep -Seconds 3

  kubectl -n cgn-apps exec netpol-client -- wget -q -T 2 -O - $ServiceUrl *> $null
  if ($LASTEXITCODE -eq 0) {
    throw "Default-deny NetworkPolicy did not block cross-namespace traffic."
  }

  Write-Host "Default-deny NetworkPolicy enforcement confirmed."

  kubectl apply -f $Allow
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to apply explicit allow NetworkPolicy."
  }

  $Allowed = $false
  for ($Attempt = 1; $Attempt -le 30; $Attempt++) {
    $Response = kubectl -n cgn-apps exec netpol-client -- wget -q -T 2 -O - $ServiceUrl 2>$null
    if ($LASTEXITCODE -eq 0 -and $Response.Trim() -eq "ok") {
      $Allowed = $true
      break
    }
    Start-Sleep -Seconds 1
  }

  if (-not $Allowed) {
    throw "Explicit allow NetworkPolicy did not restore expected traffic."
  }

  Write-Host "Service discovery and explicit NetworkPolicy allow path confirmed."
  Write-Host "CGN local Kubernetes smoke passed."
}
finally {
  kubectl delete -f $Allow --ignore-not-found *> $null
  kubectl delete -f $Probe --ignore-not-found *> $null
}
