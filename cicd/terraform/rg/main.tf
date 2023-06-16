locals {
  default_tags = {
    deployed-at = timestamp()
    managed-by  = "terraform"
  }
  all_tags = merge(local.default_tags, var.tags)
}

resource "azurerm_resource_group" "this" {
  location = var.location
  name     = var.prefix
  tags     = local.all_tags

  lifecycle {
    ignore_changes = [tags]
  }
}
