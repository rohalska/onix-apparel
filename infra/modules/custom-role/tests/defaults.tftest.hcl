# Plan-only tests must not need credentials: CI runs them with no Application
# Default Credentials, and without this the google provider aborts before any
# assertion runs. No API call is made, so the token is never used.
provider "google" {
  access_token = "fake-token-for-plan-only-tests"
  project      = "test-project"
}

variables {
  project_id = "test-project"
  role_id    = "gecxShoppingAgentRuntime"
  title      = "GECX shopping agent demo runtime"
  permissions = [
    "retail.servingConfigs.search",
    "retail.userEvents.create",
  ]
}

run "grants_exactly_the_permissions_given" {
  command = plan

  assert {
    condition     = length(google_project_iam_custom_role.this.permissions) == 2
    error_message = "expected exactly 2 permissions, got ${length(google_project_iam_custom_role.this.permissions)}"
  }

  assert {
    condition     = contains(google_project_iam_custom_role.this.permissions, "retail.servingConfigs.search")
    error_message = "search permission missing: the storefront cannot query the catalog"
  }

  assert {
    condition     = contains(google_project_iam_custom_role.this.permissions, "retail.userEvents.create")
    error_message = "userEvents.create missing: event ingestion fails silently in live mode"
  }
}

run "composes_the_role_name_a_binding_accepts" {
  command = plan

  assert {
    condition     = output.role_name == "projects/test-project/roles/gecxShoppingAgentRuntime"
    error_message = "role_name was '${output.role_name}'; an IAM binding needs the projects/<p>/roles/<id> form"
  }
}

run "refuses_a_wildcard_permission" {
  command = plan

  variables {
    permissions = ["retail.*"]
  }

  # A wildcard in a custom role is not least privilege, and IAM rejects it at
  # apply time. Failing at plan time says so with a readable message.
  expect_failures = [var.permissions]
}
