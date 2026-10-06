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

variable "subject_prefix" {
  description = <<-EOT
    The prefix GitHub puts on this repository's OIDC subject claim, required when
    service_account_environments is used because the binding is composed as
    "<subject_prefix>:environment:<name>". Read it, do not guess it:

      gh api repos/<owner>/<repo>/actions/oidc/customization/sub

    With immutable subject claims on, that returns a prefix carrying the numeric
    owner and repository ids, such as
    repo:acme@144174065/widget@1388249424. With them off it is the plain
    repo:<owner>/<repo>. The two are not interchangeable: a binding built from
    the wrong one never matches, and the deploy fails at the token exchange.
  EOT
  type        = string
  default     = null

  validation {
    condition     = var.subject_prefix == null || can(regex("^repo:[^:]+$", var.subject_prefix))
    error_message = "subject_prefix must look like repo:<owner>/<repo> or repo:<owner>@<id>/<repo>@<id>, with no colon after the repo part."
  }
}

variable "service_account_environments" {
  description = "Service accounts impersonable only from a job that declared a GitHub Environment, as a map of account email to environment name. Use for accounts whose use must be approved: a ref pin cannot express that, because every job on the pinned branch satisfies it whether or not it went through the gate. Requires subject_prefix."
  type        = map(string)
  default     = {}

  validation {
    condition     = length(var.service_account_environments) == 0 || var.subject_prefix != null
    error_message = "service_account_environments requires subject_prefix; without it the binding cannot be composed and would silently never match."
  }

  validation {
    condition     = alltrue([for e in values(var.service_account_environments) : can(regex("^[A-Za-z0-9._-]+$", e))])
    error_message = "each environment must be a plain GitHub Environment name."
  }

  validation {
    condition = length(setintersection(
      keys(var.service_account_environments),
      setunion(toset(var.service_account_emails), keys(var.service_account_refs)),
    )) == 0
    error_message = "an account must not be in service_account_environments as well as service_account_emails or service_account_refs; the looser binding would defeat the environment gate."
  }
}
