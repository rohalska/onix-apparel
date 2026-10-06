# Plan-only tests must not need credentials: CI runs them with no Application
# Default Credentials, and without this the google provider aborts before any
# assertion runs. No API call is made, so the token is never used.
provider "google" {
  access_token = "fake-token-for-plan-only-tests"
  project      = "test-project"
}

variables {
  project_id             = "test-project"
  project_number         = "835936341567"
  repository             = "onix-net/gecx-shopping-agent-demo"
  repository_id          = "1388249424"
  service_account_emails = ["gecx-shop-deploy@test-project.iam.gserviceaccount.com"]
}

run "pins_trust_to_one_repository" {
  command = plan

  # Without the repository claim in the condition, this pool mints tokens for
  # any repository on GitHub.
  assert {
    condition     = google_iam_workload_identity_pool_provider.github.attribute_condition != null && google_iam_workload_identity_pool_provider.github.attribute_condition != ""
    error_message = "attribute_condition must not be empty"
  }

  assert {
    condition     = strcontains(google_iam_workload_identity_pool_provider.github.attribute_condition, "onix-net/gecx-shopping-agent-demo")
    error_message = "attribute_condition does not name the repository: '${google_iam_workload_identity_pool_provider.github.attribute_condition}'"
  }

  assert {
    condition     = google_iam_workload_identity_pool_provider.github.attribute_condition == "assertion.repository == 'onix-net/gecx-shopping-agent-demo' && assertion.repository_id == '1388249424'"
    error_message = "attribute_condition must compare the repository and repository id claims exactly, got '${google_iam_workload_identity_pool_provider.github.attribute_condition}'"
  }

  assert {
    condition     = google_iam_workload_identity_pool_provider.github.oidc[0].issuer_uri == "https://token.actions.githubusercontent.com"
    error_message = "issuer must be GitHub's OIDC issuer"
  }
}

run "pins_the_numeric_repository_id_and_drops_the_dead_ref_mapping" {
  command = plan

  assert {
    condition     = strcontains(google_iam_workload_identity_pool_provider.github.attribute_condition, "assertion.repository == 'onix-net/gecx-shopping-agent-demo'") && strcontains(google_iam_workload_identity_pool_provider.github.attribute_condition, "assertion.repository_id == '1388249424'")
    error_message = "attribute_condition must require both the repository and the repository id"
  }

  assert {
    condition     = contains(keys(google_iam_workload_identity_pool_provider.github.attribute_mapping), "attribute.repository_id") && contains(keys(google_iam_workload_identity_pool_provider.github.attribute_mapping), "attribute.repo_ref")
    error_message = "attribute_mapping must define repository_id and repo_ref"
  }

  assert {
    condition     = !contains(keys(google_iam_workload_identity_pool_provider.github.attribute_mapping), "attribute.ref")
    error_message = "nothing binds on a bare attribute.ref, so the mapping must not define it"
  }
}

run "rejects_a_non_numeric_repository_id" {
  command = plan

  variables {
    repository_id = "gecx-shopping-agent-demo"
  }

  expect_failures = [var.repository_id]
}

run "composes_the_provider_name_auth_expects" {
  command = plan

  assert {
    condition     = output.provider_name == "projects/835936341567/locations/global/workloadIdentityPools/github/providers/github"
    error_message = "provider_name was '${output.provider_name}'; google-github-actions/auth needs the fully qualified projects/<number>/... form"
  }
}

run "lets_ci_impersonate_only_the_listed_accounts" {
  command = plan

  assert {
    condition     = length(google_service_account_iam_member.wif) == 1
    error_message = "expected one impersonation binding"
  }

  assert {
    condition     = google_service_account_iam_member.wif["gecx-shop-deploy@test-project.iam.gserviceaccount.com"].role == "roles/iam.workloadIdentityUser"
    error_message = "impersonation must be granted through roles/iam.workloadIdentityUser"
  }
}

run "rejects_a_repository_that_is_not_owner_slash_name" {
  command = plan

  variables {
    repository = "gecx-shopping-agent-demo"
  }

  expect_failures = [var.repository]
}

run "scopes_impersonation_to_the_repository_attribute" {
  command = plan

  # The pool's name is computed, so pin it to see the member string in a plan.
  override_resource {
    target = google_iam_workload_identity_pool.github
    values = {
      name = "projects/835936341567/locations/global/workloadIdentityPools/github"
    }
  }

  assert {
    condition     = google_service_account_iam_member.wif["gecx-shop-deploy@test-project.iam.gserviceaccount.com"].member == "principalSet://iam.googleapis.com/projects/835936341567/locations/global/workloadIdentityPools/github/attribute.repository/onix-net/gecx-shopping-agent-demo"
    error_message = "member must be a principalSet on attribute.repository/<repository>, got '${google_service_account_iam_member.wif["gecx-shop-deploy@test-project.iam.gserviceaccount.com"].member}'"
  }
}

run "pins_the_deployer_to_a_ref_and_leaves_the_planner_repo_wide" {
  command = plan

  variables {
    service_account_emails = ["gecx-shop-plan@test-project.iam.gserviceaccount.com"]
    service_account_refs   = { "gecx-shop-deploy@test-project.iam.gserviceaccount.com" = "refs/heads/main" }
  }

  override_resource {
    target = google_iam_workload_identity_pool.github
    values = {
      name = "projects/835936341567/locations/global/workloadIdentityPools/github"
    }
  }

  assert {
    condition     = google_service_account_iam_member.wif_ref["gecx-shop-deploy@test-project.iam.gserviceaccount.com"].member == "principalSet://iam.googleapis.com/projects/835936341567/locations/global/workloadIdentityPools/github/attribute.repo_ref/onix-net/gecx-shopping-agent-demo:refs/heads/main"
    error_message = "deployer must be bound on attribute.repo_ref/<repository>:<ref>, got '${google_service_account_iam_member.wif_ref["gecx-shop-deploy@test-project.iam.gserviceaccount.com"].member}'"
  }

  assert {
    condition     = strcontains(google_service_account_iam_member.wif_ref["gecx-shop-deploy@test-project.iam.gserviceaccount.com"].member, "onix-net/gecx-shopping-agent-demo:refs/heads/main")
    error_message = "the ref binding must name the repository as well as the ref"
  }

  assert {
    condition     = google_iam_workload_identity_pool_provider.github.attribute_mapping["attribute.repo_ref"] == "assertion.repository + ':' + assertion.ref"
    error_message = "attribute_mapping must define repo_ref as repository and ref combined"
  }

  assert {
    condition     = strcontains(google_service_account_iam_member.wif["gecx-shop-plan@test-project.iam.gserviceaccount.com"].member, "attribute.repository/")
    error_message = "planner must stay bound repository-wide"
  }

  assert {
    condition     = length(google_service_account_iam_member.wif) == 1 && length(google_service_account_iam_member.wif_ref) == 1
    error_message = "each account must get exactly one binding, in the right resource"
  }
}

run "rejects_an_account_in_both_lists" {
  command = plan

  variables {
    service_account_refs = { "gecx-shop-deploy@test-project.iam.gserviceaccount.com" = "refs/heads/main" }
  }

  expect_failures = [var.service_account_refs]
}

run "binds_an_account_to_a_github_environment_subject" {
  command = plan

  variables {
    service_account_emails       = []
    subject_prefix               = "repo:onix-net@144174065/gecx-shopping-agent-demo@1388249424"
    service_account_environments = { "gecx-shop-deploy@test-project.iam.gserviceaccount.com" = "prd" }
  }

  override_resource {
    target = google_iam_workload_identity_pool.github
    values = {
      name = "projects/835936341567/locations/global/workloadIdentityPools/github"
    }
  }

  # google.subject is mapped to assertion.sub, so binding the subject reaches the
  # account only from a job that declared the environment. A ref pin cannot
  # express that: every job on the branch satisfies it.
  #
  # The prefix is the one this repository actually uses. Immutable subject claims
  # are on, so it carries the numeric owner and repository ids; a binding built
  # from the plain repo:<owner>/<repo> form would never match and the deploy
  # would fail at the token exchange.
  assert {
    condition     = google_service_account_iam_member.wif_environment["gecx-shop-deploy@test-project.iam.gserviceaccount.com"].member == "principal://iam.googleapis.com/projects/835936341567/locations/global/workloadIdentityPools/github/subject/repo:onix-net@144174065/gecx-shopping-agent-demo@1388249424:environment:prd"
    error_message = "environment binding must be a principal on subject/<subject_prefix>:environment:<name>, got '${google_service_account_iam_member.wif_environment["gecx-shop-deploy@test-project.iam.gserviceaccount.com"].member}'"
  }

  assert {
    condition     = strcontains(google_service_account_iam_member.wif_environment["gecx-shop-deploy@test-project.iam.gserviceaccount.com"].member, "@1388249424:environment:prd")
    error_message = "the binding must use the immutable subject prefix this repository is configured for, not the plain repo:<owner>/<repo> form"
  }

  # principal, not principalSet: a subject names one identity. principalSet on a
  # subject is rejected by IAM, so getting this wrong fails at apply.
  assert {
    condition     = startswith(google_service_account_iam_member.wif_environment["gecx-shop-deploy@test-project.iam.gserviceaccount.com"].member, "principal://")
    error_message = "a subject binding must use principal://, not principalSet://"
  }
}

run "grants_no_environment_bindings_by_default" {
  command = plan

  override_resource {
    target = google_iam_workload_identity_pool.github
    values = {
      name = "projects/835936341567/locations/global/workloadIdentityPools/github"
    }
  }

  assert {
    condition     = length(google_service_account_iam_member.wif_environment) == 0
    error_message = "no environment binding should exist unless one is asked for"
  }
}

run "rejects_an_account_bound_both_by_environment_and_by_ref" {
  command = plan

  variables {
    service_account_emails       = []
    service_account_refs         = { "gecx-shop-deploy@test-project.iam.gserviceaccount.com" = "refs/heads/main" }
    subject_prefix               = "repo:onix-net@144174065/gecx-shopping-agent-demo@1388249424"
    service_account_environments = { "gecx-shop-deploy@test-project.iam.gserviceaccount.com" = "prd" }
  }

  # The ref binding would let any job on main reach the account without the
  # gate, which is exactly what the environment binding is for.
  expect_failures = [var.service_account_environments]
}

run "rejects_an_account_bound_both_by_environment_and_repository_wide" {
  command = plan

  variables {
    service_account_emails       = ["gecx-shop-deploy@test-project.iam.gserviceaccount.com"]
    subject_prefix               = "repo:onix-net@144174065/gecx-shopping-agent-demo@1388249424"
    service_account_environments = { "gecx-shop-deploy@test-project.iam.gserviceaccount.com" = "prd" }
  }

  expect_failures = [var.service_account_environments]
}

run "rejects_an_environment_name_that_is_not_a_plain_name" {
  command = plan

  variables {
    service_account_emails       = []
    subject_prefix               = "repo:onix-net@144174065/gecx-shopping-agent-demo@1388249424"
    service_account_environments = { "gecx-shop-deploy@test-project.iam.gserviceaccount.com" = "refs/heads/main" }
  }

  expect_failures = [var.service_account_environments]
}

run "refuses_an_environment_binding_without_a_subject_prefix" {
  command = plan

  variables {
    service_account_emails       = []
    service_account_environments = { "gecx-shop-deploy@test-project.iam.gserviceaccount.com" = "prd" }
  }

  # Without the prefix the member would be composed from a null and never match
  # anything, so the gate would look configured and grant nobody.
  expect_failures = [var.service_account_environments]
}

run "rejects_a_subject_prefix_that_is_not_a_repo_prefix" {
  command = plan

  variables {
    service_account_emails = []
    subject_prefix         = "repo:onix-net/gecx-shopping-agent-demo:environment:prd"
  }

  # The environment part is appended by the module; a prefix that already
  # carries one would compose a member with two.
  expect_failures = [var.subject_prefix]
}
