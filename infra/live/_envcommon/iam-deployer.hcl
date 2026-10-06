terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../modules/service-account"
}

dependencies {
  paths = ["../project-services"]
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

inputs = {
  account_id   = "gecx-shop-deploy"
  display_name = "GECX shopping agent demo CI deployer"

  project_roles = [
    # Project-wide, which is acceptable for a single-service project. Revisit if
    # this project ever hosts a second service.
    "roles/run.admin", # deploy revisions
    "roles/serviceusage.serviceUsageConsumer",
  ]

  # Pushing images needs no project role: the artifact-registry leaf grants
  # this account writer on its one repository. State access is limited to the
  # state bucket rather than every bucket in the project.
  bucket_roles = {
    "tfstate-${local.env_vars.locals.project_id}" = ["roles/storage.objectAdmin"]
  }
}
