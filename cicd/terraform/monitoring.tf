resource "azurerm_log_analytics_workspace" "this" {
  location            = module.rg_monitoring.location
  name                = module.rg_monitoring.name
  resource_group_name = module.rg_monitoring.name
  retention_in_days   = 30
  sku                 = "PerGB2018"

  lifecycle {
    ignore_changes = [tags]
  }
}

resource "azurerm_log_analytics_solution" "container_insights" {
  location              = module.rg_monitoring.location
  resource_group_name   = module.rg_monitoring.name
  solution_name         = "ContainerInsights"
  workspace_name        = azurerm_log_analytics_workspace.this.name
  workspace_resource_id = azurerm_log_analytics_workspace.this.id

  plan {
    product   = "OMSGallery/ContainerInsights"
    publisher = "Microsoft"
  }

  lifecycle {
    ignore_changes = [tags]
  }
}
