output "provider_name" {
  description = "Fully qualified provider name, passed verbatim to google-github-actions/auth."
  value       = "projects/${var.project_number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/providers/${google_iam_workload_identity_pool_provider.github.workload_identity_pool_provider_id}"
}

output "pool_name" {
  description = "Pool resource name."
  value       = google_iam_workload_identity_pool.github.name
}
