output "repository_url" {
  description = "Host and path a docker push targets, without a tag."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.this.repository_id}"
}

output "repository_id" {
  description = "Repository ID."
  value       = google_artifact_registry_repository.this.repository_id
}
