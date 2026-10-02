output "url" {
  description = "The service's HTTPS URL."
  value       = google_cloud_run_v2_service.this.uri
}

output "service_name" {
  description = "Service name."
  value       = google_cloud_run_v2_service.this.name
}
