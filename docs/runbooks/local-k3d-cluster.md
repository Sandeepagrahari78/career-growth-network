# CGN Local Kubernetes Cluster

Ticket: **CGN-41**

CGN uses k3d/K3s for the current ₹0 non-production Kubernetes environment.

## Pinned local stack

- k3d: `v5.9.0`
- K3s image: `rancher/k3s:v1.35.9-k3s1`
- Kubernetes API: `127.0.0.1:6550`
- local HTTP ingress: `127.0.0.1:8080`
- local HTTPS ingress: `127.0.0.1:8443`

Docker, k3d, kubectl and Node.js are prerequisites. No AWS account or cloud credential is required.

## Windows / PowerShell

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\infra\k3d-up.ps1
powershell -ExecutionPolicy Bypass -File scripts\infra\k3d-smoke.ps1
powershell -ExecutionPolicy Bypass -File scripts\infra\k3d-down.ps1
```

The first command is idempotent: if `cgn-local` already exists, it reuses the cluster and reapplies the approved baseline.

## Bash / CI

```bash
bash scripts/infra/k3d-up.sh
bash scripts/infra/k3d-smoke.sh
bash scripts/infra/k3d-down.sh
```

## What the smoke proves

The smoke test verifies:

1. `cgn-system`, `cgn-apps` and `cgn-data` exist.
2. CoreDNS and Traefik are ready.
3. the Traefik IngressClass exists.
4. API/HTTP/HTTPS host ports are bound only to `127.0.0.1`.
5. a pod in `cgn-apps` can resolve a service in `cgn-data`.
6. the default-deny NetworkPolicy blocks cross-namespace HTTP traffic.
7. a temporary explicit allow policy restores only the expected test path.

Smoke resources are removed automatically. The permanent baseline remains deny-by-default.

## Safety and portability

Do not add `--disable-network-policy`, public host bindings, cloud load balancers or cloud-specific annotations to this local cluster without a separately approved Jira scope.

Product workloads should depend on Kubernetes Services, ConfigMaps, Secrets, Ingress/Gateway APIs and persistent-volume abstractions rather than k3d-specific behavior. That keeps a later managed-Kubernetes migration possible.
