variable "project_id" {
  description = "Project that owns the role."
  type        = string
}

variable "role_id" {
  description = "Role ID. Must be camelCase or underscored; IAM rejects hyphens."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9_.]{3,64}$", var.role_id))
    error_message = "role_id must be 3-64 chars of letters, digits, underscores or dots. IAM does not accept hyphens in a custom role ID."
  }
}

variable "title" {
  description = "Human-readable role title."
  type        = string
}

variable "permissions" {
  description = "Exact permissions this role grants. No wildcards."
  type        = list(string)

  validation {
    condition     = length([for p in var.permissions : p if can(regex("\\*", p))]) == 0
    error_message = "permissions must be named individually; a wildcard is not least privilege and IAM rejects it."
  }

  validation {
    condition     = length(var.permissions) > 0
    error_message = "a role granting nothing is a configuration mistake, not a least-privilege role."
  }
}
