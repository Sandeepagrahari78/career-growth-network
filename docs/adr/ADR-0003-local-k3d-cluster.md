# ADR-0003 - k3d for the Zero-Budget Local Kubernetes Cluster

Status: Accepted

Ticket: CGN-41

## Context

CGN needs a non-production Kubernetes environment that costs ₹0, runs on Docker, preserves Kubernetes-standard application manifests and enforces the network-security intent defined by CGN-40.

The ticket allows kind or k3d. The project also requires service discovery, ingress prerequisites and a real NetworkPolicy enforcement proof before the local baseline can be treated as a security boundary.

## Decision

Use **k3d v5.9.0** with **K3s v1.35.9-k3s1** for the local cluster.

The cluster uses the CGN-40 network contract:

- pod CIDR: `10.244.0.0/16`
- service CIDR: `10.96.0.0/16`
- Kubernetes API: loopback-only
- developer ingress: loopback-only
- CGN namespaces and NetworkPolicy manifests applied after creation

K3s keeps CoreDNS, Traefik and its embedded NetworkPolicy controller enabled. CI proves policy enforcement with a deny-then-explicit-allow connectivity test instead of assuming that applied NetworkPolicy objects are enforced.

Application manifests remain Kubernetes-standard. k3d is a local cluster wrapper, not an application runtime dependency.

## Consequences

Positive:
- zero cloud cost;
- Docker-based local reproducibility;
- real service-discovery, ingress-controller and NetworkPolicy behavior can be exercised in CI;
- later EKS/managed-Kubernetes migration does not require rewriting application manifests.

Trade-offs:
- k3d/K3s is not the production control plane;
- local Docker networking differs from managed-cloud networking and IAM;
- public load balancers, cloud storage classes and managed identity are intentionally not modeled here;
- cloud migration needs a separately approved infrastructure ticket.
