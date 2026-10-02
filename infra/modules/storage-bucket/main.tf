resource "google_storage_bucket" "this" {
  project  = var.project_id
  name     = var.name
  location = var.location
  labels   = var.labels

  force_destroy = var.force_destroy

  # Access is granted by IAM only, never by object ACLs, and the bucket can
  # never be made public.
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
}
