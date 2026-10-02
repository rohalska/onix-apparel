# Plan-only tests must not need credentials: CI runs them with no Application
# Default Credentials, and without this the google provider aborts before any
# assertion runs. No API call is made, so the token is never used.
provider "google" {
  access_token = "fake-token-for-plan-only-tests"
  project      = "test-project"
}

run "composes_the_repository_url_the_way_docker_expects" {
  command = plan

  variables {
    project_id = "test-project"
    region     = "us-central1"
    name       = "gecx-shopping-agent-demo"
    labels     = { env = "dev" }
    writers    = ["serviceAccount:deployer@test-project.iam.gserviceaccount.com"]
    readers    = []
  }

  assert {
    condition     = output.repository_url == "us-central1-docker.pkg.dev/test-project/gecx-shopping-agent-demo"
    error_message = "repository_url was '${output.repository_url}', which docker push will not accept"
  }

  assert {
    condition     = google_artifact_registry_repository.this.format == "DOCKER"
    error_message = "format must be DOCKER"
  }

  assert {
    condition     = length(google_artifact_registry_repository_iam_member.writer) == 1
    error_message = "expected one writer binding"
  }

  assert {
    condition     = length(google_artifact_registry_repository_iam_member.reader) == 0
    error_message = "an empty reader list must produce no bindings"
  }
}

run "keeps_cleanup_policies_dry_run_until_asked" {
  command = plan

  variables {
    project_id = "test-project"
    region     = "us-central1"
    name       = "gecx-shopping-agent-demo"
    labels     = {}
    writers    = []
    readers    = []
  }

  # A cleanup policy that deletes on its first run can remove the digest the
  # live service is pinned to. It stays in dry-run until someone has read the
  # dry-run output.
  assert {
    condition     = google_artifact_registry_repository.this.cleanup_policy_dry_run == true
    error_message = "cleanup policies must start in dry-run"
  }
}

run "keeps_anything_recent_whether_or_not_it_is_tagged" {
  command = plan

  variables {
    project_id = "test-project"
    region     = "us-central1"
    name       = "gecx-shopping-agent-demo"
    labels     = {}
    writers    = []
    readers    = []
  }

  # Without this, the untagged-delete policy can collect a digest a deployment
  # is pinned to, because the version-count KEEP policy ignores tags.
  assert {
    condition = anytrue([
      for p in google_artifact_registry_repository.this.cleanup_policies :
      p.action == "KEEP" && length(p.condition) > 0 && p.condition[0].tag_state == "ANY"
    ])
    error_message = "a KEEP policy with tag_state = ANY must exist so recent untagged digests are protected"
  }

  assert {
    condition     = var.keep_recent_duration != ""
    error_message = "keep_recent_duration must default to a non-empty window"
  }
}
