locals {
  prometheus_name = "prometheus"
}

resource "kubernetes_namespace" "prometheus" {
  depends_on = [time_sleep.wait_for_ad]

  metadata {
    name = local.prometheus_name
  }
}

resource "helm_release" "prometheus" {
  atomic     = true
  chart      = "prometheus"
  name       = local.prometheus_name
  namespace  = kubernetes_namespace.prometheus.metadata[0].name
  repository = "https://prometheus-community.github.io/helm-charts"
  version    = "22.6.2"
  wait       = true
}
