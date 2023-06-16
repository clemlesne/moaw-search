
data "azurerm_policy_definition" "tagging" {
  display_name = "Inherit a tag from the resource group"
}

resource "azurerm_user_assigned_identity" "tagging" {
  location            = var.location
  name                = "${var.prefix}-tagging"
  resource_group_name = azurerm_resource_group.this.name
  tags                = local.all_tags

  lifecycle {
    ignore_changes = [tags]
  }
}

resource "azurerm_role_assignment" "tagging" {
  principal_id         = azurerm_user_assigned_identity.tagging.principal_id
  role_definition_name = "Tag Contributor"
  scope                = azurerm_resource_group.this.id
}

resource "azurerm_resource_group_policy_assignment" "tagging" {
  for_each = local.all_tags

  location             = var.location
  name                 = "${var.prefix}-tagging-${each.key}"
  policy_definition_id = data.azurerm_policy_definition.tagging.id
  resource_group_id    = azurerm_resource_group.this.id

  parameters = jsonencode({
    tagName = {
      value = each.key
    }
  })

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.tagging.id]
  }
}
