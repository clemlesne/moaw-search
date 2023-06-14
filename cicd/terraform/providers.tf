terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
    }
    azuread = {
      source  = "hashicorp/azuread"
    }
    azapi = {
      source  = "Azure/azapi"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
    }
    helm = {
      source  = "hashicorp/helm"
    }
    random = {
      source  = "hashicorp/random"
    }
    time = {
      source  = "hashicorp/time"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = false
    }
  }
}

provider "azuread" {
  tenant_id = data.azurerm_subscription.this.tenant_id
}

provider "kubernetes" {
  client_certificate     = base64decode(azurerm_kubernetes_cluster.this.kube_config.0.client_certificate)
  client_key             = base64decode(azurerm_kubernetes_cluster.this.kube_config.0.client_key)
  cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.this.kube_config.0.cluster_ca_certificate)
  host                   = azurerm_kubernetes_cluster.this.kube_config.0.host

  # Using kubelogin to get an AAD token for the cluster
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "kubelogin"
    args = [
      "get-token",
      "--client-id", azuread_service_principal.sys_spn.application_id,
      "--client-secret", azuread_application_password.sys_password.value,
      "--environment", "AzurePublicCloud",
      "--server-id", data.azuread_service_principal.this.application_id,
      "--tenant-id", data.azurerm_subscription.this.tenant_id,
      "--login", "spn"
    ]
  }
}

provider "helm" {
  kubernetes {
    client_certificate     = base64decode(azurerm_kubernetes_cluster.this.kube_config.0.client_certificate)
    client_key             = base64decode(azurerm_kubernetes_cluster.this.kube_config.0.client_key)
    cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.this.kube_config.0.cluster_ca_certificate)
    host                   = azurerm_kubernetes_cluster.this.kube_config.0.host

    # Using kubelogin to get an AAD token for the cluster
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "kubelogin"
      args = [
        "get-token",
        "--client-id", azuread_service_principal.sys_spn.application_id,
        "--client-secret", azuread_application_password.sys_password.value,
        "--environment", "AzurePublicCloud",
        "--server-id", data.azuread_service_principal.this.application_id,
        "--tenant-id", data.azurerm_subscription.this.tenant_id,
        "--login", "spn"
      ]
    }
  }
}
