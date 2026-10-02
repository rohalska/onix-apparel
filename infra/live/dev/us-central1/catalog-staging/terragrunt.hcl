include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../modules/storage-bucket"
}

dependencies {
  paths = ["../../global/project-services"]
}

locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  region_vars = read_terragrunt_config(find_in_parent_folders("region.hcl"))
}

# Staging area for scripts/importToGcpRetail.sh. The script used to create this
# bucket itself; it is managed here so the access settings and the catalog
# identity's grant are reviewed. The name matches what the script expects.
inputs = {
  name     = "${local.env_vars.locals.project_id}-retail-catalog-staging"
  location = local.region_vars.locals.region
}
