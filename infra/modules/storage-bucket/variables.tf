variable "project_id" {
  description = "Project that owns the bucket."
  type        = string
}

variable "name" {
  description = "Bucket name. Globally unique."
  type        = string
}

variable "location" {
  description = "Bucket location, such as US or us-central1."
  type        = string
}

variable "labels" {
  description = "Labels applied to the bucket."
  type        = map(string)
  default     = {}
}

variable "force_destroy" {
  description = "Allow the bucket to be destroyed while it still holds objects. Leave false unless the contents are disposable."
  type        = bool
  default     = false
}
