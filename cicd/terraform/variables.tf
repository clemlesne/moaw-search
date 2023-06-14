variable "location" {
  type        = string
  description = "Azure region"
}

variable "prefix" {
  type        = string
  description = "Prefix to apply to all resources"
}

variable "zones" {
  default     = [1, 2, 3]
  description = "Availability zones to use"
  type        = list(number)
}
