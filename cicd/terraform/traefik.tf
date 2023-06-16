locals {
  traefik_name = "traefik"
}

resource "kubernetes_namespace" "traefik" {
  depends_on = [time_sleep.wait_for_ad]

  metadata {
    name = local.traefik_name
  }
}

resource "helm_release" "traefik" {
  atomic     = true
  chart      = "traefik"
  name       = local.traefik_name
  namespace  = kubernetes_namespace.traefik.metadata[0].name
  repository = "https://traefik.github.io/charts"
  version    = "23.1.0"
  wait       = true
  reset_values = true

  values = [
    <<EOF
    service:
      spec:
        loadBalancerIP: ${azurerm_public_ip.traefik.ip_address}
        annotations:
          service.beta.kubernetes.io/azure-load-balancer-resource-group: ${module.rg_default.name}
    ports:
      web:
        redirectTo: websecure
    autoscaling:
      enabled: true
      maxReplicas: 10
      minReplicas: 1
      metrics:
        - type: Resource
          resource:
            name: cpu
            target:
              averageUtilization: 50
              type: Utilization
        - type: Resource
          resource:
            name: memory
            target:
              averageUtilization: 50
              type: Utilization
    EOF
  ]
}

resource "random_string" "dns_suffix" {
  length  = 12
  numeric = true
  special = false
  upper   = false
}

resource "azurerm_public_ip" "traefik" {
  allocation_method   = "Static"
  domain_name_label   = "${module.rg_default.name}-${random_string.dns_suffix.result}"
  location            = module.rg_default.location
  name                = "${module.rg_default.name}-${local.traefik_name}"
  resource_group_name = module.rg_default.name
  sku                 = "Standard"
  zones               = var.zones

  lifecycle {
    ignore_changes = [tags]
  }
}

# add to the kubernetes cluster identity the role Network Contributor on the resource group
resource "azurerm_role_assignment" "this" {
  principal_id         = azurerm_kubernetes_cluster.this.identity.0.principal_id
  role_definition_name = "Network Contributor"
  scope                = module.rg_default.id
}

# generate a ssl certificate for the public ip
