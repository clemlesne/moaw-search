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

resource "azurerm_log_analytics_workspace" "this" {
  location            = var.location
  name                = var.prefix
  resource_group_name = azurerm_resource_group.this.name
  retention_in_days   = 30
  sku                 = "PerGB2018"
}
