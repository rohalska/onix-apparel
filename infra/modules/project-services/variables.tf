variable "project_id" {
  description = "Project to enable services on."
  type        = string
}

variable "services" {
  description = "Service names to enable."
  type        = list(string)
}
