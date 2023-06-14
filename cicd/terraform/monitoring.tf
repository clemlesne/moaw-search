resource "azurerm_log_analytics_workspace" "this" {
  location            = var.location
  name                = var.prefix
  resource_group_name = azurerm_resource_group.this.name
  retention_in_days   = 30
  sku                 = "PerGB2018"
}

resource "azurerm_log_analytics_solution" "container_insights" {
  location              = var.location
  resource_group_name   = azurerm_resource_group.this.name
  solution_name         = "ContainerInsights"
  workspace_name        = azurerm_log_analytics_workspace.this.name
  workspace_resource_id = azurerm_log_analytics_workspace.this.id

  plan {
    product   = "OMSGallery/ContainerInsights"
    publisher = "Microsoft"
  }
}
