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
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  region_vars = read_terragrunt_config(find_in_parent_folders("region.hcl"))
}

inputs = {
  region  = local.region_vars.locals.region
  name    = "gecx-shopping-agent-demo"
  writers = ["serviceAccount:${dependency.deployer.outputs.email}"]

  # Who may pull a released image out of this environment's registry. Promotion
  # copies the exact digest into the target environment's own registry rather
  # than rebuilding, and the copy runs as the target's deployer, so that account
  # reads here. Declared per environment because it is a deliberate grant across
  # a project boundary, not something every environment should hand out.
  readers = local.env_vars.locals.env_inputs.registry_readers
}
