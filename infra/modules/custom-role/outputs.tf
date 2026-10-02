output "role_name" {
  description = "Role name in the form an IAM binding accepts."
  value       = "projects/${var.project_id}/roles/${google_project_iam_custom_role.this.role_id}"
}
