resource "google_project_iam_custom_role" "this" {
  project     = var.project_id
  role_id     = var.role_id
  title       = var.title
  description = "Least-privilege runtime role, managed by Terragrunt"
  permissions = var.permissions
}
