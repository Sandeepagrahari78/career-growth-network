# CGN Terraform bootstrap

Ticket: **CGN-39**

This directory is the zero-budget Terraform foundation for CGN.

## Current phase

The current infrastructure phase is deliberately local-only:

- Terraform state uses Terraform's default local backend.
- No AWS, Azure, GCP, Terraform Cloud or other remote backend is configured.
- No cloud provider or cloud resource is declared.
- No cloud credentials are required.
- Local development and local-staging are the only accepted environments.

This keeps the IaC layout portable without creating paid resources before explicit approval.

## Validate

From the repository root:

```bash
terraform fmt -check -recursive infra/terraform
terraform -chdir=infra/terraform/environments/local init -backend=false -input=false
terraform -chdir=infra/terraform/environments/local validate
terraform -chdir=infra/terraform/environments/local plan -input=false -lock=false -refresh=false -var-file=dev.tfvars
terraform -chdir=infra/terraform/environments/local plan -input=false -lock=false -refresh=false -var-file=staging.tfvars
```

The PR workflow executes the same validation using Terraform 1.16.5.

## State safety

Terraform state can contain sensitive infrastructure data even when today's bootstrap contains no secrets. Generated state, plan files and `.terraform/` directories are ignored and must never be committed.

The first future ticket that introduces a managed provider or remote state backend must explicitly define its provider, IAM, encryption, locking, cost and migration/rollback plan. It must not silently extend this local bootstrap.
