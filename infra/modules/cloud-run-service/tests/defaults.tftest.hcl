# Plan-only tests must not need credentials: CI runs them with no Application
# Default Credentials, and without this the google provider aborts before any
# assertion runs. No API call is made, so the token is never used.
provider "google" {
  access_token = "fake-token-for-plan-only-tests"
  project      = "test-project"
}

variables {
  project_id            = "test-project"
  region                = "us-central1"
  name                  = "gecx-shopping-agent-demo"
  service_account_email = "gecx-shop-run@test-project.iam.gserviceaccount.com"
  image                 = "us-central1-docker.pkg.dev/test-project/gecx-shopping-agent-demo/app@sha256:ada52f4754a4b605b2dcf1d4576bb89ad339d990e1377ac9bd0133f90af822f1"
  env = {
    GCP_PROJECT_ID        = "test-project"
    GCP_LOCATION          = "global"
    GCP_CATALOG_ID        = "default_catalog"
    GCP_SERVING_CONFIG_ID = "default_search"
  }
}

run "runs_as_the_supplied_identity_not_the_default_compute_account" {
  command = plan

  assert {
    condition     = google_cloud_run_v2_service.this.template[0].service_account == "gecx-shop-run@test-project.iam.gserviceaccount.com"
    error_message = "the service did not take the supplied service account"
  }

  assert {
    condition     = !can(regex("compute@developer", google_cloud_run_v2_service.this.template[0].service_account))
    error_message = "the default compute service account must never be the runtime identity"
  }
}

run "passes_every_env_var_through" {
  command = plan

  assert {
    condition     = length(google_cloud_run_v2_service.this.template[0].containers[0].env) == 4
    error_message = "expected 4 env vars, got ${length(google_cloud_run_v2_service.this.template[0].containers[0].env)}"
  }
}

run "is_public_when_asked" {
  command = plan

  variables {
    allow_public_access = true
  }

  assert {
    condition     = length(google_cloud_run_v2_service_iam_member.public) == 1
    error_message = "allow_public_access = true must grant allUsers run.invoker"
  }
}

run "is_private_by_default" {
  command = plan

  assert {
    condition     = length(google_cloud_run_v2_service_iam_member.public) == 0
    error_message = "public access must be opt-in, not the default"
  }
}

run "refuses_an_image_that_is_not_digest_pinned" {
  command = plan

  variables {
    image = "us-central1-docker.pkg.dev/test-project/gecx-shopping-agent-demo/app:latest"
  }

  # Review Focus 1: a mutable tag means the running revision can change
  # without a plan, which defeats build-once-promote-by-digest.
  expect_failures = [var.image]
}

run "refuses_the_default_compute_service_account" {
  command = plan

  variables {
    service_account_email = "835936341567-compute@developer.gserviceaccount.com"
  }

  # The live service runs as this account today. Replacing it with a
  # least-privilege identity is the point of the change, so the module must
  # refuse to deploy a public service as the default compute account.
  expect_failures = [var.service_account_email]
}
