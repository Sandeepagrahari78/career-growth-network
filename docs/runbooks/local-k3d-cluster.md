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
The ingress acceptance smoke additionally requires Helm, OpenSSL, and curl.

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
8. the `health.cgn.localhost` HTTP and HTTPS routes reach the CGN health-demo service.
9. the local TLS certificate matches the hostname and is trusted when passed as a CA file.
10. an unknown host and path return 404, and deleting the route rolls back to the default 404.

Smoke workloads, ingress, TLS Secret and temporary policies are removed automatically. The
generated development certificate and key remain in the ignored `.local/k3d/tls/` directory
for local trust setup; the smoke restricts the private key to the current user on Windows and
to owner-only permissions on Unix. Never commit or share the private key. The permanent baseline remains
deny-by-default, with a narrow local ingress policy for the health-demo selector and port.

## Trust the local development certificate

The first smoke run creates a self-signed certificate for `health.cgn.localhost`. The smoke
uses `curl --cacert` so it verifies both the certificate chain and hostname without changing
your machine-wide trust store. For browser testing, import
`.local/k3d/tls/health.cgn.localhost.crt` into your **user** trust store only if desired:

- Windows (Current User Root): `certutil -user -addstore Root .local\k3d\tls\health.cgn.localhost.crt`
- macOS (login keychain): `security add-trusted-cert -r trustRoot -k ~/Library/Keychains/login.keychain-db .local/k3d/tls/health.cgn.localhost.crt`
- Debian/Ubuntu system trust (requires sudo): copy the certificate to `/usr/local/share/ca-certificates/health-cgn-localhost.crt`, then run `sudo update-ca-certificates`.

Remove a Windows user trust entry with `certutil -user -delstore Root health.cgn.localhost`.
For macOS/Linux, remove the imported certificate from that same trust store. The hostname
uses the reserved `.localhost` suffix and resolves locally; HTTPS is available on port 8443
while the smoke's temporary health-demo workload is installed.

## Safety and portability

Do not add `--disable-network-policy`, public host bindings, cloud load balancers or cloud-specific annotations to this local cluster without a separately approved Jira scope.

Product workloads should depend on Kubernetes Services, ConfigMaps, Secrets, Ingress/Gateway APIs and persistent-volume abstractions rather than k3d-specific behavior. That keeps a later managed-Kubernetes migration possible.
