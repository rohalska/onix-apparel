locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))

  project_id = local.env_vars.locals.project_id
  env        = local.env_vars.locals.env
}

remote_state {
  backend = "gcs"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    bucket   = "tfstate-${local.project_id}"
    prefix   = path_relative_to_include()
    project  = local.project_id
    location = "us"

    # infra/scripts/bootstrap-state.sh makes the bucket versioned, UBLA-only,
    # public-access-prevented and lifecycle-managed. Without this, Terragrunt
    # would silently create an unhardened bucket if bootstrap was skipped or
    # the name mistyped. Fail instead.
    skip_bucket_creation = true
  }
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "google" {
  project = "${local.project_id}"
}
EOF
}

# Provider requirements are not generated here: every module carries its own
# versions.tf, and terragrunt refuses to overwrite a file it did not generate.

inputs = {
  project_id = local.project_id
  env        = local.env
  labels = {
    env        = local.env
    managed_by = "terragrunt"
    app        = "gecx-shopping-agent-demo"
  }
}
