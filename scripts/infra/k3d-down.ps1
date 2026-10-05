$ErrorActionPreference = "Stop"

$ClusterName = "cgn-local"

if (-not (Get-Command k3d -ErrorAction SilentlyContinue)) {
  throw "Required command is missing: k3d"
}

$Clusters = k3d cluster list --no-headers 2>$null
$Exists = $Clusters | Where-Object { ($_ -split "\s+")[0] -eq $ClusterName }

if ($Exists) {
  k3d cluster delete $ClusterName
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to delete k3d cluster."
  }
} else {
  Write-Host "k3d cluster $ClusterName does not exist; nothing to delete."
}
