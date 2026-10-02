include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../modules/wif-github"
}

dependencies {
  paths = ["../project-services"]
}

dependency "deployer" {
  config_path = "../iam-deployer"

  mock_outputs                            = { email = "mock-deploy@example.iam.gserviceaccount.com" }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

dependency "planner" {
  config_path = "../iam-planner"

  mock_outputs                            = { email = "mock-plan@example.iam.gserviceaccount.com" }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

inputs = {
  project_number = "835936341567"
  repository     = "onix-net/gecx-shopping-agent-demo"
  repository_id  = "1388249424"

  # Both are impersonable from this repository, but not from the same places.
  # The planner is repo-wide so plans run on pull requests. The deployer is
  # pinned to main, so a workflow edited on a pushed branch cannot assume it.
  service_account_emails = [
    dependency.planner.outputs.email,
  ]

  service_account_refs = {
    (dependency.deployer.outputs.email) = "refs/heads/main"
  }
}
