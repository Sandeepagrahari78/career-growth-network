# Local Network and Kubernetes Security Baseline

Ticket: **CGN-40**

CGN's current infrastructure phase is zero-budget and local-first. This runbook defines the network/security contract that CGN-41 will instantiate in a local Kubernetes cluster.

## Source of truth

Machine-readable baseline:

`config/infra/local-network.v1.json`

Kubernetes-standard security manifests:

`infra/k8s/base/`

## Network plan

- Kubernetes API server: loopback-only (`127.0.0.1`)
- Pod CIDR: `10.244.0.0/16`
- Service CIDR: `10.96.0.0/16`
- Developer HTTP ingress: `127.0.0.1:8080`
- Developer HTTPS ingress: `127.0.0.1:8443`
- Public-by-default exposure: disabled

The pod and service CIDRs are private RFC1918 ranges and are validated not to overlap.

## Namespace zones

- `cgn-system`: platform and cluster support components
- `cgn-apps`: CGN application workloads
- `cgn-data`: PostgreSQL/cache/messaging workloads

Data services are internal-only and must use `ClusterIP` unless a later Jira ticket explicitly approves a different exposure model.

## Network policy intent

The baseline applies deny-by-default ingress and egress intent to `cgn-apps` and `cgn-data`, then adds explicit DNS egress.

Application-to-application and application-to-data allow rules are deliberately not invented here. They must be added by the owning service ticket using the real service contract.

The local cluster ticket must use a CNI/network-policy implementation that actually enforces Kubernetes NetworkPolicy before this is treated as an enforcement boundary.

## Validate

From the repository root:

```bash
node scripts/ci/validate-local-network.mjs
node --test tests/contracts/local-network-baseline.contract.test.mjs
```

PR CI and Main CI run the baseline validator automatically.

## Cloud rule

This baseline must not create an AWS VPC, subnet, NAT gateway, load balancer, security group, Azure/GCP network, or any paid cloud resource.

If public/cloud networking is needed later, create an explicit reviewed cloud-infrastructure ticket rather than modifying this local baseline silently.
