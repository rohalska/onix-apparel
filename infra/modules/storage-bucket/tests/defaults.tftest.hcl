# Plan-only tests must not need credentials: CI runs them with no Application
# Default Credentials, and without this the google provider aborts before any
# assertion runs. No API call is made, so the token is never used.
provider "google" {
  access_token = "fake-token-for-plan-only-tests"
  project      = "test-project"
}

run "creates_a_locked_down_bucket" {
  command = plan

  variables {
    project_id = "test-project"
    name       = "test-project-staging"
    location   = "us-central1"
    labels     = { env = "test" }
  }

  assert {
    condition     = google_storage_bucket.this.name == "test-project-staging" && google_storage_bucket.this.location == "US-CENTRAL1"
    error_message = "name or location was not passed through"
  }

  assert {
    condition     = google_storage_bucket.this.uniform_bucket_level_access == true
    error_message = "uniform bucket-level access must be on"
  }

  assert {
    condition     = google_storage_bucket.this.public_access_prevention == "enforced"
    error_message = "public access prevention must be enforced"
  }

  assert {
    condition     = google_storage_bucket.this.force_destroy == false
    error_message = "force_destroy must default to false"
  }

  assert {
    condition     = google_storage_bucket.this.labels["env"] == "test"
    error_message = "labels were not passed through"
  }
}

run "allows_force_destroy_when_asked" {
  command = plan

  variables {
    project_id    = "test-project"
    name          = "test-project-scratch"
    location      = "us-central1"
    force_destroy = true
  }

  assert {
    condition     = google_storage_bucket.this.force_destroy == true
    error_message = "force_destroy was not passed through"
  }
}
