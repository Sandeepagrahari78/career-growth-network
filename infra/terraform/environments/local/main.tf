locals {
  network_baseline = jsondecode(file("${path.module}/../../../../config/infra/local-network.v1.json"))
}

resource "terraform_data" "bootstrap" {
  input = {
    environment             = var.environment
    execution_mode          = var.execution_mode
    state_backend           = "local"
    cloud_resources_enabled = false
    network_contract        = local.network_baseline.contract
    pod_subnet              = local.network_baseline.cluster.podSubnet
    service_subnet          = local.network_baseline.cluster.serviceSubnet
    ingress_bind_address    = local.network_baseline.ingress.bindAddress
  }

  lifecycle {
    precondition {
      condition     = local.network_baseline.cloudResourcesEnabled == false
      error_message = "The zero-budget local Terraform bootstrap cannot enable cloud resources."
    }
  }
}
