# google_project_iam_member, not _binding: _binding is authoritative for a role
# and would strip every other member from it on a shared project.
resource "google_service_account" "this" {
  project      = var.project_id
  account_id   = var.account_id
  display_name = var.display_name
}

resource "google_project_iam_member" "this" {
  for_each = toset(var.project_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.this.email}"
}

# Granted ON this account, not project-wide, so the member can act as this
# account and no other.
resource "google_service_account_iam_member" "user" {
  for_each = toset(var.service_account_users)

  service_account_id = google_service_account.this.name
  role               = "roles/iam.serviceAccountUser"
  member             = each.value
}

# Bucket-scoped grants, so an identity can reach one bucket instead of every
# bucket in the project. One resource per (bucket, role) pair.
resource "google_storage_bucket_iam_member" "bucket" {
  for_each = {
    for pair in flatten([
      for bucket, roles in var.bucket_roles : [
        for role in roles : { bucket = bucket, role = role }
      ]
    ]) : "${pair.bucket}|${pair.role}" => pair
  }

  bucket = each.value.bucket
  role   = each.value.role
  member = "serviceAccount:${google_service_account.this.email}"
}
