output "bootstrap" {
  description = "Machine-readable evidence of the active zero-budget Terraform bootstrap."
  value       = terraform_data.bootstrap.output
}
