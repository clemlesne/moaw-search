locals {
  app_name = "moaw-search"
}

resource "kubernetes_namespace" "app" {
  depends_on = [time_sleep.wait_for_ad]

  metadata {
    name = local.app_name
  }
}

resource "helm_release" "app" {
  atomic     = true
  chart      = "moaw-search"
  name       = local.app_name
  namespace  = kubernetes_namespace.app.metadata[0].name
  repository = "https://clemlesne.github.io/moaw-search"
  version    = "0.9.4"
  wait       = true

  values = [
    <<EOF
    ingress:
      host: ${azurerm_public_ip.traefik.fqdn}
    serviceAccountName: ${kubernetes_service_account.app.metadata[0].name}
    api:
      acs:
        base: ${data.azurerm_cognitive_account.app_acs.endpoint}
        token: ${data.azurerm_cognitive_account.app_acs.primary_access_key}
      oai:
        ada_deploy_id: ${azurerm_cognitive_deployment.app_ada.name}
        base: ${azurerm_cognitive_account.app_oai.endpoint}
        gpt_deploy_id: ${azurerm_cognitive_deployment.app_gpt.name}
    EOF
  ]
}

resource "azurerm_user_assigned_identity" "app" {
  location            = module.rg_default.location
  name                = "${module.rg_default.name}-${local.app_name}"
  resource_group_name = module.rg_default.name

  lifecycle {
    ignore_changes = [tags]
  }
}

resource "azurerm_federated_identity_credential" "app" {
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.this.oidc_issuer_url
  name                = "${module.rg_default.name}-${local.app_name}"
  parent_id           = azurerm_user_assigned_identity.app.id
  resource_group_name = module.rg_default.name
  subject             = "system:serviceaccount:${kubernetes_namespace.app.metadata[0].name}:${kubernetes_namespace.app.metadata[0].name}"
}

resource "kubernetes_service_account" "app" {
  metadata {
    name      = kubernetes_namespace.app.metadata[0].name
    namespace = kubernetes_namespace.app.metadata[0].name
    annotations = {
      "azure.workload.identity/client-id" = azurerm_user_assigned_identity.app.client_id
    }
    labels = {
      "azure.workload.identity/use" = "true"
    }
  }
}

// ContentSafety is not yet available in the Terraform resource azurerm_cognitive_account ; we first create it then get its metadata
resource "azapi_resource" "app_acs" {
  location               = module.rg_default.location
  name                   = "${module.rg_default.name}-${local.app_name}-acs"
  parent_id              = module.rg_default.id
  response_export_values = ["name", "properties.endpoint"]
  type                   = "Microsoft.CognitiveServices/accounts@2022-12-01"

  body = jsonencode({
    kind = "ContentSafety"
    sku = {
      name = "S0"
    }
    properties = {
      customSubDomainName = "${module.rg_default.name}-${local.app_name}-acs"
    }
  })
}

// ContentSafety is not yet available in the Terraform resource azurerm_cognitive_account ; we first create it then get its metadata
data "azurerm_cognitive_account" "app_acs" {
  name                = azapi_resource.app_acs.name
  resource_group_name = module.rg_default.name

  // We need to wait for the resource to be created
  depends_on = [azapi_resource.app_acs]
}

resource "azurerm_cognitive_account" "app_oai" {
  custom_subdomain_name = "${module.rg_default.name}-${local.app_name}-oai"  # Required for OpenAI to work
  kind                  = "OpenAI"
  location              = module.rg_default.location
  name                  = "${module.rg_default.name}-${local.app_name}-oai"
  resource_group_name   = module.rg_default.name
  sku_name              = "S0"  # Only one available for OpenAI as of 14 June 2023

  lifecycle {
    ignore_changes = [tags]
  }
}

resource "azurerm_role_assignment" "app_oai" {
  principal_id         = azurerm_user_assigned_identity.app.principal_id
  role_definition_name = "Cognitive Services OpenAI User"
  scope                = azurerm_cognitive_account.app_oai.id
}

resource "azurerm_cognitive_deployment" "app_ada" {
  cognitive_account_id = azurerm_cognitive_account.app_oai.id
  name                 = "ada"

  model {
    format  = "OpenAI"
    name    = "text-embedding-ada-002"
    version = "2"
  }

  scale {
    type = "Standard"
  }
}

resource "azurerm_cognitive_deployment" "app_gpt" {
  cognitive_account_id = azurerm_cognitive_account.app_oai.id
  name                 = "gpt"

  model {
    format  = "OpenAI"
    name    = "gpt-35-turbo"
    version = "0301"
  }

  scale {
    type = "Standard"
  }
}
