locals {
  traefik_name = "traefik"
}

resource "kubernetes_namespace" "traefik" {
  metadata {
    name = local.traefik_name
  }
  depends_on = [time_sleep.wait_for_ad]
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
          service.beta.kubernetes.io/azure-load-balancer-resource-group: ${azurerm_resource_group.this.name}
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
  domain_name_label   = "${var.prefix}-${random_string.dns_suffix.result}"
  location            = var.location
  name                = "${var.prefix}-${local.traefik_name}"
  resource_group_name = azurerm_resource_group.this.name
  sku                 = "Standard"
  zones               = var.zones
}

# add to the kubernetes cluster identity the role Network Contributor on the resource group
resource "azurerm_role_assignment" "this" {
  principal_id         = azurerm_kubernetes_cluster.this.identity.0.principal_id
  role_definition_name = "Network Contributor"
  scope                = azurerm_resource_group.this.id
}

# generate a ssl certificate for the public ip
