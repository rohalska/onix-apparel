variable "project_id" {
  description = "Project that owns the repository."
  type        = string
}

variable "region" {
  description = "Artifact Registry location."
  type        = string
}

variable "name" {
  description = "Repository ID."
  type        = string
}

variable "labels" {
  description = "Labels applied to the repository."
  type        = map(string)
  default     = {}
}

variable "writers" {
  description = "IAM members granted artifactregistry.writer, as fully qualified member strings."
  type        = list(string)
  default     = []
}

variable "readers" {
  description = "IAM members granted artifactregistry.reader, as fully qualified member strings."
  type        = list(string)
  default     = []
}

variable "keep_version_count" {
  description = "How many of the most recent versions per package the cleanup policy keeps, regardless of tag."
  type        = number
  default     = 10
}

variable "keep_recent_duration" {
  description = "Versions pushed within this window are never deleted, whether or not they are tagged. It is the backstop that stops a digest-pinned deployment losing its image: Artifact Registry does not know what Cloud Run references."
  type        = string
  default     = "7776000s"
}
