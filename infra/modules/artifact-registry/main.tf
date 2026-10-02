# The IAM resources are _iam_member, not _binding or _policy: those are
# authoritative for the role and would strip every other member from it.
resource "google_artifact_registry_repository" "this" {
  project       = var.project_id
  location      = var.region
  repository_id = var.name
  format        = "DOCKER"
  description   = "Container images for ${var.name}"
  labels        = var.labels

  # Dry run first. A policy that deletes immediately can collect the digest the
  # running service is pinned to, which takes the service down on its next
  # cold start.
  cleanup_policy_dry_run = true

  cleanup_policies {
    id     = "keep-recent-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = var.keep_version_count
    }
  }

  # Backstop that does not depend on tags: anything pushed within the window is
  # kept, so a digest-pinned deployment cannot lose its image to the DELETE
  # policy below just because nothing tagged it.
  cleanup_policies {
    id     = "keep-anything-recent"
    action = "KEEP"
    condition {
      tag_state  = "ANY"
      newer_than = var.keep_recent_duration
    }
  }

  cleanup_policies {
    id     = "delete-untagged-after-30d"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "2592000s"
    }
  }
}

resource "google_artifact_registry_repository_iam_member" "writer" {
  for_each = toset(var.writers)

  project    = var.project_id
  location   = google_artifact_registry_repository.this.location
  repository = google_artifact_registry_repository.this.name
  role       = "roles/artifactregistry.writer"
  member     = each.value
}

resource "google_artifact_registry_repository_iam_member" "reader" {
  for_each = toset(var.readers)

  project    = var.project_id
  location   = google_artifact_registry_repository.this.location
  repository = google_artifact_registry_repository.this.name
  role       = "roles/artifactregistry.reader"
  member     = each.value
}
