output "name" {
  description = "Bucket name, for use in bucket-scoped IAM grants."
  value       = google_storage_bucket.this.name
}
