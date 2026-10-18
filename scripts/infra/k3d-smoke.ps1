$ErrorActionPreference = "Stop"

$Probe = "infra/k8s/smoke/network-policy-probe.yaml"
$Allow = "infra/k8s/smoke/network-policy-probe-allow.yaml"
$ServiceUrl = "http://netpol-target.cgn-data.svc.cluster.local:8080/"
$Ingress = "infra/k8s/local/health-demo-ingress.yaml"
$IngressAllow = "infra/k8s/local/health-demo-ingress-allow.yaml"
$TlsDirectory = ".local/k3d/tls"
$TlsCertificate = "$TlsDirectory/health.cgn.localhost.crt"
$TlsKey = "$TlsDirectory/health.cgn.localhost.key"
$HostName = "health.cgn.localhost"
$SmokeNamespace = "cgn-cgn63-ingress-$PID"
$IngressRendered = ".local/k3d/health-demo-ingress.yaml"
$IngressAllowRendered = ".local/k3d/health-demo-ingress-allow.yaml"
$Release = "cgn-health-demo"
$Image = "cgn-health-demo:cgn63-ingress-smoke"

foreach ($Command in @("docker", "helm", "openssl", "curl.exe")) {
  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    throw "Required command is missing: $Command"
  }
}

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

  New-Item -ItemType Directory -Force -Path $TlsDirectory | Out-Null
  if (-not (Test-Path $TlsCertificate) -or -not (Test-Path $TlsKey)) {
    & openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
      -keyout $TlsKey -out $TlsCertificate `
      -subj "/CN=$HostName" `
      -addext "subjectAltName=DNS:$HostName" `
      -addext "basicConstraints=critical,CA:TRUE"
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create the local development certificate."
    }
  }
  & icacls.exe $TlsKey /inheritance:r /grant:r "$($env:USERDOMAIN)\$($env:USERNAME):(F)" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to restrict local development key permissions."
  }

  New-Item -ItemType Directory -Force -Path ".local/k3d" | Out-Null
  $IngressContent = (Get-Content $Ingress -Raw).Replace("namespace: cgn-apps", "namespace: $SmokeNamespace")
  $IngressAllowContent = (Get-Content $IngressAllow -Raw).Replace("namespace: cgn-apps", "namespace: $SmokeNamespace")
  [System.IO.File]::WriteAllText($IngressRendered, $IngressContent)
  [System.IO.File]::WriteAllText($IngressAllowRendered, $IngressAllowContent)

  docker build -f services/health-demo/Dockerfile -t $Image .
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to build the health-demo image."
  }
  k3d image import $Image --cluster cgn-local
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to import the health-demo image into k3d."
  }
  kubectl create namespace $SmokeNamespace
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create the temporary ingress smoke namespace."
  }
  helm upgrade --install $Release infra/helm/cgn-service `
    --namespace $SmokeNamespace `
    --set nameOverride=cgn-health-demo `
    --values infra/helm/values/health-demo-staging.yaml `
    --set image.tag=cgn63-ingress-smoke `
    --wait --timeout 180s
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to install the health-demo service."
  }
  kubectl -n $SmokeNamespace create secret tls cgn-local-development-tls `
    --cert $TlsCertificate --key $TlsKey --dry-run=client -o yaml |
    kubectl apply -f -
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create the local TLS secret."
  }
  kubectl apply -f $IngressAllowRendered
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to apply the ingress network policy."
  }
  kubectl apply -f $IngressRendered
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to apply the local ingress route."
  }
  kubectl -n $SmokeNamespace rollout status deployment/cgn-health-demo --timeout=180s
  if ($LASTEXITCODE -ne 0) {
    throw "The health-demo service did not become ready."
  }

  $TlsReady = $false
  for ($Attempt = 1; $Attempt -le 30; $Attempt++) {
    $Health = & curl.exe --fail --silent --show-error --cacert $TlsCertificate `
      --resolve "${HostName}:8443:127.0.0.1" "https://${HostName}:8443/health" 2>$null
    if ($LASTEXITCODE -eq 0 -and $Health -match '"status":"ok"') {
      $TlsReady = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $TlsReady) {
    throw "HTTPS ingress did not serve health-demo with the trusted local certificate."
  }
  $Ready = & curl.exe --fail --silent --show-error --cacert $TlsCertificate `
    --resolve "${HostName}:8443:127.0.0.1" "https://${HostName}:8443/ready"
  if ($LASTEXITCODE -ne 0 -or $Ready -notmatch '"status":"ready"') {
    throw "HTTPS readiness route failed."
  }
  $HttpStatus = & curl.exe --silent --output NUL --write-out "%{http_code}" `
    --resolve "${HostName}:8080:127.0.0.1" "http://${HostName}:8080/health"
  if ($LASTEXITCODE -ne 0 -or $HttpStatus.Trim() -ne "200") {
    throw "HTTP ingress route failed."
  }
  $PathStatus = & curl.exe --insecure --silent --output NUL --write-out "%{http_code}" `
    --resolve "${HostName}:8443:127.0.0.1" "https://${HostName}:8443/not-a-cgn-route"
  if ($LASTEXITCODE -ne 0 -or $PathStatus.Trim() -ne "404") {
    throw "Unknown ingress path did not return 404."
  }
  $HostStatus = & curl.exe --insecure --silent --output NUL --write-out "%{http_code}" `
    --resolve "unknown.cgn.localhost:8443:127.0.0.1" `
    "https://unknown.cgn.localhost:8443/health"
  if ($LASTEXITCODE -ne 0 -or $HostStatus.Trim() -ne "404") {
    throw "Unknown ingress host did not return 404."
  }
  Write-Host "Local HTTP/HTTPS ingress, trusted development certificate and unknown host/path checks passed."

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

  kubectl delete -f $IngressRendered --wait=true
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to remove the local ingress route for rollback verification."
  }
  $RollbackStatus = & curl.exe --insecure --silent --output NUL --write-out "%{http_code}" `
    --resolve "${HostName}:8443:127.0.0.1" "https://${HostName}:8443/health"
  if ($LASTEXITCODE -ne 0 -or $RollbackStatus.Trim() -ne "404") {
    throw "Removing the ingress route did not restore the expected default 404."
  }
  Write-Host "Ingress rollback returned the expected default 404."
  Write-Host "CGN local Kubernetes smoke passed."
}
finally {
  kubectl delete namespace $SmokeNamespace --ignore-not-found --wait=true --timeout=180s *> $null
  kubectl delete -f $Allow --ignore-not-found *> $null
  kubectl delete -f $Probe --ignore-not-found *> $null
}
