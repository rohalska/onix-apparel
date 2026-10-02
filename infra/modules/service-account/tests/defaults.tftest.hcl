# Plan-only tests must not need credentials: CI runs them with no Application
# Default Credentials, and without this the google provider aborts before any
# assertion runs. No API call is made, so the token is never used.
provider "google" {
  access_token = "fake-token-for-plan-only-tests"
  project      = "test-project"
}

# `plan` rather than `apply`: these assertions are about what the module
# composes from its inputs, which a plan settles without touching GCP.
run "grants_exactly_the_roles_requested" {
  command = plan

  variables {
    project_id    = "test-project"
    account_id    = "gecx-shop-run"
    display_name  = "GECX shopping agent demo runtime"
    project_roles = ["roles/retail.viewer"]
  }

  assert {
    condition     = google_service_account.this.account_id == "gecx-shop-run"
    error_message = "account_id was not passed through"
  }

  assert {
    condition     = length(google_project_iam_member.this) == 1
    error_message = "expected exactly one role binding, got ${length(google_project_iam_member.this)}"
  }

  assert {
    condition     = google_project_iam_member.this["roles/retail.viewer"].role == "roles/retail.viewer"
    error_message = "the binding is keyed or roled wrongly"
  }
}

run "rejects_an_account_id_google_will_not_accept" {
  command = plan

  variables {
    project_id    = "test-project"
    account_id    = "Bad_ID"
    display_name  = "invalid"
    project_roles = []
  }

  expect_failures = [var.account_id]
}

run "grants_nothing_when_no_roles_are_given" {
  command = plan

  variables {
    project_id    = "test-project"
    account_id    = "gecx-shop-none"
    display_name  = "no roles"
    project_roles = []
  }

  assert {
    condition     = length(google_project_iam_member.this) == 0
    error_message = "an empty role list must produce no bindings"
  }
}

run "grants_no_account_user_bindings_by_default" {
  command = plan

  variables {
    project_id   = "test-project"
    account_id   = "gecx-shop-run"
    display_name = "GECX shopping agent demo runtime"
  }

  assert {
    condition     = length(google_service_account_iam_member.user) == 0
    error_message = "empty service_account_users must produce zero bindings"
  }
}

run "grants_serviceaccountuser_on_this_account_only" {
  command = plan

  variables {
    project_id            = "test-project"
    account_id            = "gecx-shop-run"
    display_name          = "GECX shopping agent demo runtime"
    service_account_users = ["serviceAccount:gecx-shop-deploy@test-project.iam.gserviceaccount.com"]
  }

  assert {
    condition     = length(google_service_account_iam_member.user) == 1
    error_message = "expected exactly one serviceAccountUser binding"
  }

  assert {
    condition     = google_service_account_iam_member.user["serviceAccount:gecx-shop-deploy@test-project.iam.gserviceaccount.com"].role == "roles/iam.serviceAccountUser"
    error_message = "binding must use roles/iam.serviceAccountUser"
  }
}

run "grants_no_bucket_bindings_by_default" {
  command = plan

  variables {
    project_id   = "test-project"
    account_id   = "gecx-shop-run"
    display_name = "GECX shopping agent demo runtime"
    bucket_roles = {}
  }

  assert {
    condition     = length(google_storage_bucket_iam_member.bucket) == 0
    error_message = "empty bucket_roles must produce zero bucket bindings"
  }
}

run "grants_each_bucket_role_pair_on_that_bucket" {
  command = plan

  variables {
    project_id   = "test-project"
    account_id   = "gecx-shop-run"
    display_name = "GECX shopping agent demo runtime"
    bucket_roles = { "my-bucket" = ["roles/storage.objectViewer", "roles/storage.objectUser"] }
  }

  assert {
    condition     = length(google_storage_bucket_iam_member.bucket) == 2
    error_message = "one bucket with two roles must produce exactly two bindings, got ${length(google_storage_bucket_iam_member.bucket)}"
  }

  assert {
    condition     = google_storage_bucket_iam_member.bucket["my-bucket|roles/storage.objectViewer"].role == "roles/storage.objectViewer" && google_storage_bucket_iam_member.bucket["my-bucket|roles/storage.objectUser"].role == "roles/storage.objectUser"
    error_message = "bindings are keyed or roled wrongly"
  }

  assert {
    condition     = google_storage_bucket_iam_member.bucket["my-bucket|roles/storage.objectViewer"].bucket == "my-bucket"
    error_message = "binding must target the named bucket"
  }
}
