resource "azuread_application" "sys" {
  display_name = module.rg_default.name
  owners       = [data.azuread_client_config.this.object_id]
}

resource "azuread_application_password" "sys_password" {
  application_object_id = azuread_application.sys.object_id
}

resource "azuread_service_principal" "sys_spn" {
  application_id = azuread_application.sys.application_id
  owners         = [data.azuread_client_config.this.object_id]
}

resource "azurerm_role_assignment" "sys_admin_user" {
  principal_id         = data.azuread_client_config.this.object_id
  role_definition_name = "Azure Kubernetes Service RBAC Cluster Admin"
  scope                = azurerm_kubernetes_cluster.this.id
}

resource "azurerm_role_assignment" "sys_admin_spn" {
  principal_id                     = azuread_service_principal.sys_spn.object_id
  role_definition_name             = "Azure Kubernetes Service RBAC Cluster Admin"
  scope                            = azurerm_kubernetes_cluster.this.id
  skip_service_principal_aad_check = true
}

# SPN and roles propagation can last long so waiting 1 min before creating Kubernetes assets
resource "time_sleep" "wait_for_ad" {
  create_duration = "1m"
  depends_on      = [azurerm_role_assignment.sys_admin_spn]
}
