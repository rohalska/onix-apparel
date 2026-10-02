resource "google_project_service" "this" {
  for_each = toset(var.services)

  project = var.project_id
  service = each.value

  # Leave the API on if this stack is destroyed: other things in the project
  # depend on these, and disabling retail or run would break them.
  disable_on_destroy = false
}
