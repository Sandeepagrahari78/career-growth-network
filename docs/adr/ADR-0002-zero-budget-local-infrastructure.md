# ADR-0002 - Zero-Budget Local Infrastructure Before Cloud

Status: Accepted

Ticket: CGN-39 / CGN-40

## Context

CGN needs production-shaped infrastructure practices while the current project constraint is ₹0. The previous infrastructure backlog contained cloud-shaped wording that could incorrectly force paid AWS resources before they are needed or approved.

## Decision

The current infrastructure phase is local-first and zero-budget.

Terraform establishes repository layout, environment inputs, validation and local state discipline without a cloud provider or remote backend. CGN-40 defines the local network/security baseline, and CGN-41 instantiates it on a local Kubernetes cluster.

Cloud infrastructure remains a future migration path, not a current implicit dependency. Any managed provider, remote Terraform backend or paid resource requires an explicitly approved ticket and Sandeep review.

## Consequences

Positive:
- current infrastructure work can be implemented and tested at ₹0;
- CI can enforce infrastructure invariants before cloud spend exists;
- Kubernetes/application contracts stay portable to a later managed cluster.

Trade-offs:
- local Terraform state is not suitable for a multi-operator production environment;
- no cloud IAM, remote state locking or managed-network behavior is exercised yet;
- migration to managed infrastructure requires a separate reviewed design and state-migration plan.
