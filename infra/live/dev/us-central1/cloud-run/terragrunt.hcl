include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../modules/cloud-run-service"
}

dependencies {
  paths = ["../../global/project-services"]
}

dependency "runtime_sa" {
  config_path = "../../global/iam-runtime"

  mock_outputs                            = { email = "mock@example.iam.gserviceaccount.com" }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

dependency "registry" {
  config_path = "../artifact-registry"

  mock_outputs                            = { repository_url = "us-central1-docker.pkg.dev/mock/mock" }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  region_vars = read_terragrunt_config(find_in_parent_folders("region.hcl"))

  # The digest currently serving onix-apparel, copied into the new repository
  # during bootstrap. It is the fallback so a local plan is never empty-handed.
  # The digest currently deployed. It is only a placeholder for read-only
  # commands; `apply` requires IMAGE_DIGEST explicitly. Kept in step with the
  # deployed image so a plain `terragrunt plan` does not propose reverting the
  # service, and so manual drift shows up as a real diff rather than hiding
  # behind a stale constant.
  default_digest = "sha256:6edce977d51f2d702438c2a09aec82bdbc1f84e21944dcafcff681f3faa71f96"

  # The deploy job exports IMAGE_DIGEST for the image it just built. A leaf
  # input would otherwise win over any TF_VAR_, so the override has to be read
  # here rather than passed as a variable. The strict branch is apply-only on
  # purpose: an apply without IMAGE_DIGEST would redeploy the bootstrap image,
  # which is stale after the first release, so it must fail. Every other
  # command takes the placeholder, so a read-only command never fails for a
  # missing deploy-time variable.
  image_digest = contains(["apply"], get_terraform_command()) ? get_env("IMAGE_DIGEST") : get_env("IMAGE_DIGEST", local.default_digest)
}

inputs = {
  region                = local.region_vars.locals.region
  name                  = "gecx-shopping-agent-demo"
  image                 = "${dependency.registry.outputs.repository_url}/app@${local.image_digest}"
  service_account_email = dependency.runtime_sa.outputs.email
  allow_public_access   = true
  min_instance_count    = local.env_vars.locals.env_inputs.min_instance_count
  deletion_protection   = local.env_vars.locals.env_inputs.deletion_protection

  env = {
    GCP_PROJECT_ID        = local.env_vars.locals.project_id
    GCP_LOCATION          = "global"
    GCP_CATALOG_ID        = "default_catalog"
    GCP_SERVING_CONFIG_ID = "default_search"
  }
}
