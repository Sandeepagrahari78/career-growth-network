variable "environment" {
  description = "Approved zero-budget CGN environment."
  type        = string

  validation {
    condition     = contains(["local-dev", "local-staging"], var.environment)
    error_message = "environment must be local-dev or local-staging during the zero-budget phase."
  }
}

variable "execution_mode" {
  description = "Infrastructure execution mode. Cloud modes require a separately approved Jira scope."
  type        = string
  default     = "zero-budget-local"

  validation {
    condition     = var.execution_mode == "zero-budget-local"
    error_message = "Only zero-budget-local mode is allowed until cloud infrastructure is explicitly approved."
  }
}
