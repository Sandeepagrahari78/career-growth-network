resource "terraform_data" "bootstrap" {
  input = {
    environment             = var.environment
    execution_mode          = var.execution_mode
    state_backend           = "local"
    cloud_resources_enabled = false
  }
}
