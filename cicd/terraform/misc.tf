# Reference to the current subscription
data "azurerm_subscription" "this" {}

# Reference to the current client config
data "azurerm_client_config" "this" {}

# Reference to the current tenant ID
data "azuread_client_config" "this" {}

module "rg_default" {
  source = "./rg"

  location = var.location
  prefix   = var.prefix

  tags = {
    usage = "default"
  }
}

module "rg_monitoring" {
  source = "./rg"

  location = var.location_monitoring
  prefix   = "${var.prefix}-monitoring"

  tags = {
    usage = "monitoring"
  }
}
