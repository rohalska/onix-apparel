# This stack owns the runtime identity only. The deployer lives next door in
# iam-deployer, because the two change for different reasons and a mistake in
# the deployer's roles must not reach the runtime account.
terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../modules/service-account"
}

dependency "services" {
  config_path = "../project-services"

  mock_outputs                            = { enabled = [] }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

dependency "runtime_role" {
  config_path = "../iam-custom-role"

  mock_outputs                            = { role_name = "projects/mock/roles/mockRole" }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

dependency "deployer" {
  config_path = "../iam-deployer"

  mock_outputs                            = { email = "mock-deploy@example.iam.gserviceaccount.com" }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

inputs = {
  account_id   = "gecx-shop-run"
  display_name = "GECX shopping agent demo runtime"

  # The custom role from the neighbouring stack, not a predefined one.
  # roles/retail.viewer lacks retail.userEvents.create, which the event
  # ingestion path at server/proxy.mjs:865 needs; roles/retail.editor has it but
  # also grants product deletion and catalog import.
  project_roles = [dependency.runtime_role.outputs.role_name]

  # The deployer may act as this account and no other, so it can deploy a
  # revision that runs as the runtime identity but cannot impersonate the
  # catalog importer.
  service_account_users = ["serviceAccount:${dependency.deployer.outputs.email}"]
}
