variable "project_id" {
  description = "Project that owns the service account."
  type        = string
}

variable "account_id" {
  description = "Service account ID, the part before the @."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.account_id))
    error_message = "account_id must be 6-30 chars, lowercase letters, digits and hyphens, starting with a letter and not ending in a hyphen."
  }
}

variable "display_name" {
  description = "Human-readable name shown in the console."
  type        = string
}

variable "project_roles" {
  description = "Project-level roles to grant this account. Keep this list minimal."
  type        = list(string)
  default     = []
}

variable "service_account_users" {
  description = "Members granted roles/iam.serviceAccountUser ON this account, so a deployer can deploy a workload that runs as it. Each is a full IAM member such as serviceAccount:x@y."
  type        = list(string)
  default     = []
}

variable "bucket_roles" {
  description = "Map of GCS bucket name to the roles this account gets ON that bucket. Exists so an identity can be given access to one bucket instead of every bucket in the project, which a project-level storage role would do."
  type        = map(list(string))
  default     = {}
}
