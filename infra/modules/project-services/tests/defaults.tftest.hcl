# Plan-only tests must not need credentials: CI runs them with no Application
# Default Credentials, and without this the google provider aborts before any
# assertion runs. No API call is made, so the token is never used.
provider "google" {
  access_token = "fake-token-for-plan-only-tests"
  project      = "test-project"
}

run "never_disables_an_api_on_destroy" {
  command = plan

  variables {
    project_id = "test-project"
    services   = ["run.googleapis.com", "retail.googleapis.com"]
  }

  assert {
    condition     = alltrue([for s in values(google_project_service.this) : s.disable_on_destroy == false])
    error_message = "disabling an API on destroy would break unrelated things in the project"
  }

  assert {
    condition     = length(google_project_service.this) == 2
    error_message = "expected 2 services"
  }
}
