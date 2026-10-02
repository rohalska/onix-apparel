variable "project_id" {
  description = "Project that owns the pool."
  type        = string
}

variable "project_number" {
  description = "Project number. The provider resource name uses the number, not the ID."
  type        = string
}

variable "repository" {
  description = "GitHub repository allowed to mint tokens, as owner/name."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.repository))
    error_message = "repository must be owner/name, e.g. onix-net/gecx-shopping-agent-demo."
  }
}

variable "repository_id" {
  description = "Numeric GitHub repository id (gh api repos/<owner>/<name> --jq .id). Unlike the name it survives renames and cannot be re-registered by someone else."
  type        = string

  validation {
    condition     = can(regex("^[0-9]+$", var.repository_id))
    error_message = "repository_id must be all digits; a wrong-shaped value never matches and locks CI out."
  }
}

variable "pool_id" {
  description = "Workload identity pool ID."
  type        = string
  default     = "github"
}

variable "provider_id" {
  description = "Workload identity pool provider ID."
  type        = string
  default     = "github"
}

variable "service_account_emails" {
  description = "Service accounts this repository's workflows may impersonate."
  type        = list(string)
  default     = []
}

variable "service_account_refs" {
  description = "Service accounts impersonable only from one git ref, as a map of account email to ref (for example refs/heads/main). Use for accounts that can change infrastructure."
  type        = map(string)
  default     = {}

  validation {
    condition     = alltrue([for r in values(var.service_account_refs) : startswith(r, "refs/")])
    error_message = "each ref must be a full git ref such as refs/heads/main."
  }

  validation {
    condition     = length(setintersection(keys(var.service_account_refs), toset(var.service_account_emails))) == 0
    error_message = "an account must not be in both service_account_emails and service_account_refs; the repository-wide binding would defeat the ref pin."
  }
}
