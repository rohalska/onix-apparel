include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../modules/artifact-registry"
}

dependencies {
  paths = ["../../global/project-services"]
}

dependency "deployer" {
  config_path = "../../global/iam-deployer"

  mock_outputs                            = { email = "mock@example.iam.gserviceaccount.com" }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

locals {
  region_vars = read_terragrunt_config(find_in_parent_folders("region.hcl"))
}

inputs = {
  region  = local.region_vars.locals.region
  name    = "gecx-shopping-agent-demo"
  writers = ["serviceAccount:${dependency.deployer.outputs.email}"]
}
