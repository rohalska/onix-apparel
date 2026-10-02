variable "project_id" {
  description = "Project that owns the service."
  type        = string
}

variable "region" {
  description = "Cloud Run region."
  type        = string
}

variable "name" {
  description = "Service name. Immutable: changing it replaces the service and its URL."
  type        = string
}

variable "image" {
  description = "Container image, pinned by digest."
  type        = string

  validation {
    condition     = can(regex("@sha256:[0-9a-f]{64}$", var.image))
    error_message = "image must be pinned by digest (…@sha256:<64 hex>), not by a tag. A tag can move without a plan."
  }
}

variable "service_account_email" {
  description = "Runtime identity. Never the default compute service account."
  type        = string

  validation {
    condition     = !can(regex("compute@developer\\.gserviceaccount\\.com$", var.service_account_email))
    error_message = "the default compute service account is too broadly privileged to run a public service."
  }
}

variable "env" {
  description = "Plain environment variables for the container."
  type        = map(string)
  default     = {}
}

variable "labels" {
  description = "Labels applied to the service."
  type        = map(string)
  default     = {}
}

variable "allow_public_access" {
  description = "Grant allUsers roles/run.invoker. Required for a public demo storefront."
  type        = bool
  default     = false
}

variable "cpu" {
  description = "CPU limit per container."
  type        = string
  default     = "1000m"
}

variable "memory" {
  description = "Memory limit per container."
  type        = string
  default     = "512Mi"
}

variable "min_instance_count" {
  description = "Minimum instances. 0 lets the service scale to zero."
  type        = number
  default     = 0
}

variable "max_instance_count" {
  description = "Maximum instances."
  type        = number
  default     = 100
}

variable "deletion_protection" {
  description = "Block deletion of the service."
  type        = bool
  default     = false
}
