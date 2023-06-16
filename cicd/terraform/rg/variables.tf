variable "location" {
  type        = string
  description = "Azure region for compute and storage"
}

variable "prefix" {
  type        = string
  description = "Prefix to apply to all resources"
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
}
