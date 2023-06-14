# Reference to the current subscription
data "azurerm_subscription" "this" {}

# Reference to the current client config
data "azurerm_client_config" "this" {}

# Reference to the current tenant ID
data "azuread_client_config" "this" {}

# Reference to the Azure Active Directory server
data "azuread_service_principal" "this" {
  display_name = "Azure Kubernetes Service AAD Server"
}

resource "azurerm_resource_group" "this" {
  location = var.location
  name     = var.prefix

  tags = {
    deployed-at = timestamp()
    managed-by  = "terraform"
  }
}

resource "azurerm_resource_group" "monitoring" {
  location = var.location_monitoring
  name     = "${var.prefix}-monitoring"

  tags = {
    deployed-at = timestamp()
    managed-by  = "terraform"
  }
}
