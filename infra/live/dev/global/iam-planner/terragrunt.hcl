include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../modules/service-account"
}

dependencies {
  paths = ["../project-services"]
}

dependency "plan_reader_role" {
  config_path = "../iam-plan-reader"

  mock_outputs                            = { role_name = "projects/mock/roles/mockRole" }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

dependency "staging_bucket" {
  config_path = "../../us-central1/catalog-staging"

  mock_outputs                            = { name = "mock-retail-catalog-staging" }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

# The pull-request plan job impersonates this account, not the deployer. It is
# read-only on purpose: the Workload Identity provider trusts the repository
# rather than a branch, so a plan identity holding run.admin or
# artifactregistry.writer would let anyone who can open a pull request deploy a
# revision or push an image.
#
# The planner can read bucket IAM but cannot write to any bucket. It is
# impersonable from any branch and a plan executes untrusted configuration, so
# it gets no storage role at project level.
inputs = {
  account_id   = "gecx-shop-plan"
  display_name = "GECX shopping agent demo CI planner"

  project_roles = [
    # Read everything a plan needs to refresh.
    "roles/viewer",
    "roles/serviceusage.serviceUsageConsumer",
  ]

  # Read-only on both buckets: objectViewer can read state but cannot write
  # objects, including the lock object. The custom plan-reader role adds
  # storage.buckets.get and storage.buckets.getIamPolicy, which roles/viewer
  # lacks and a refresh of the bucket and bucket IAM resources needs. It is
  # bound by its full projects/<project>/roles/<id> name.
  #
  # REQUIRED: every `terragrunt plan` run as this identity MUST pass
  # `-lock=false`. Taking the state lock writes an object, which this role
  # cannot do, so the pull-request plan job will fail without `-lock=false`.
  # A plan does not write state, so skipping the lock is safe here.
  bucket_roles = {
    "tfstate-onx-dev-int-shop-demo-qes8"     = ["roles/storage.objectViewer", dependency.plan_reader_role.outputs.role_name]
    (dependency.staging_bucket.outputs.name) = [dependency.plan_reader_role.outputs.role_name]
  }
}
