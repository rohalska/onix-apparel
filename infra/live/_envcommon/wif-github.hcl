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

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

inputs = {
  project_number = local.env_vars.locals.project_number
  repository     = "onix-net/gecx-shopping-agent-demo"
  repository_id  = "1388249424"

  # The deployer and the catalog importer are pinned to main, so a workflow
  # edited on a pushed branch cannot assume either one.
  #
  # The catalog import workflow is a workflow_dispatch, and a dispatch carries
  # the ref it was dispatched from. Pinning to main means an operator cannot
  # run the import from a modified copy of the workflow on a branch.
  #
  # For an environment that keeps the ref pin, that pin is also what restricts
  # promotion: promote.yml is a dispatch, so its OIDC ref claim is the branch it
  # was started from whatever commit the deploy then checks out, and a promotion
  # run from a branch cannot reach that deployer.
  #
  # It does not restrict a gated environment. A subject binding carries no ref,
  # so for prd the branch is enforced by the prd GitHub Environment's deployment
  # branch policy and by guards in the workflows, not here. See the note on
  # service_account_environments below.
  #
  # The planner goes in one list or the other depending on the environment, and
  # it must not be in both: a repository-wide binding would defeat the pin, and
  # the module rejects that.
  #
  # Dev's planner is repository-wide because infra-plan.yml plans dev on pull
  # requests, and a pull request runs from its own branch.
  #
  # Prd's planner is pinned to main, and that pin is the only thing that
  # actually stops a pull request reaching prd. A pull_request run uses the
  # workflow file from the pull request's own branch, so anyone who can push a
  # branch could edit infra-plan.yml to plan prd. Keeping that file on dev is a
  # convention; this is the control. The only thing that needs prd's planner is
  # deploy-env.yml's plan job, which is reachable only from a promote dispatch
  # on main.
  service_account_emails = local.env_vars.locals.env_inputs.planner_ref == null ? [
    dependency.planner.outputs.email,
  ] : []

  # refs/heads/main is spelled the same way in promote.yml's dispatch guard and
  # deploy-env.yml's ancestor check. Those read it as a constant rather than
  # asking GitHub for the default branch, so that a rename cannot let a guard
  # pass while this binding still refuses the token. Renaming means changing all
  # three and re-applying this stack.
  #
  # An environment whose changes go through an approval binds its deployer and
  # its catalog importer to that environment instead of to the branch. A ref pin
  # cannot express "an approval was given": every job on main satisfies it, so
  # any workflow on main could mint those credentials without the gate being
  # spent. The subject binding reaches them only from a job that declared the
  # environment, which is the thing GitHub will not let a job do without going
  # through its protection rules.
  #
  # Dev has no approval to pass, so dev stays on the branch pin.
  service_account_refs = merge(
    local.env_vars.locals.env_inputs.gated_environment != null ? {} : {
      (dependency.deployer.outputs.email) = "refs/heads/main"
      (dependency.catalog.outputs.email)  = "refs/heads/main"
    },
    local.env_vars.locals.env_inputs.planner_ref == null ? {} : {
      (dependency.planner.outputs.email) = local.env_vars.locals.env_inputs.planner_ref
    },
  )

  # Read from GitHub, not guessed: this repository has immutable subject claims
  # on, so its subject prefix carries the numeric owner and repository ids and
  # the plain repo:<owner>/<repo> form would never match.
  #
  #   gh api repos/onix-net/gecx-shopping-agent-demo/actions/oidc/customization/sub
  #
  # If that setting is ever turned off, this becomes
  # "repo:onix-net/gecx-shopping-agent-demo" and every gated deploy fails at the
  # token exchange until it is changed here and re-applied.
  subject_prefix = "repo:onix-net@144174065/gecx-shopping-agent-demo@1388249424"

  service_account_environments = local.env_vars.locals.env_inputs.gated_environment == null ? {} : {
    (dependency.deployer.outputs.email) = local.env_vars.locals.env_inputs.gated_environment
    (dependency.catalog.outputs.email)  = local.env_vars.locals.env_inputs.gated_environment
  }
}
