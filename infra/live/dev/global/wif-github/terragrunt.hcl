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

dependency "catalog" {
  config_path = "../iam-catalog"

  mock_outputs                            = { email = "mock-catalog@example.iam.gserviceaccount.com" }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

inputs = {
  project_number = "835936341567"
  repository     = "onix-net/gecx-shopping-agent-demo"
  repository_id  = "1388249424"

  # All three are impersonable from this repository, but not from the same
  # places. The planner is repo-wide so plans run on pull requests. The
  # deployer and the catalog importer are pinned to main, so a workflow edited
  # on a pushed branch cannot assume either one.
  #
  # The catalog import workflow is a workflow_dispatch, and a dispatch carries
  # the ref it was dispatched from. Pinning to main means an operator cannot
  # run the import from a modified copy of the workflow on a branch.
  service_account_emails = [
    dependency.planner.outputs.email,
  ]

  service_account_refs = {
    (dependency.deployer.outputs.email) = "refs/heads/main"
    (dependency.catalog.outputs.email)  = "refs/heads/main"
  }
}
