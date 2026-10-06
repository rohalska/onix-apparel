locals {
  env        = "dev"
  project_id = "onx-dev-int-shop-demo-qes8"

  # Read by the wif-github stack. The Workload Identity principalSet is built
  # from the project number, which cannot be derived from the project id.
  project_number = "835936341567"

  env_inputs = {
    # Dev is rebuildable, so nothing here blocks a destroy.
    deletion_protection = false

    # Repository-wide, because infra-plan.yml plans dev on pull requests and a
    # pull request runs from its own branch. The planner can write nothing, which
    # is what makes that acceptable.
    planner_ref = null

    # Dev is deployed by every release with no approval to pass, so its deployer
    # and catalog importer are pinned to the branch rather than to an
    # environment. There is no gate here for a binding to enforce.
    gated_environment = null

    # Scale to zero. A cold start on the demo is acceptable here and the
    # project should cost nothing when nobody is looking at it.
    min_instance_count = 0

    # The module's default, stated here so the ceiling is visible rather than
    # implied. It is high for a demo and could come down, which is a change to
    # what dev is running and so belongs in its own commit.
    max_instance_count = 100

    # Releases are built and pushed here, so this registry is where a promoted
    # image is copied from. See docs/promotion.md.
    #
    # The target's deployer does the copy. Its planner is here too so the gated
    # plan can resolve the released digest and show the image change an approver
    # is about to approve, rather than planning a placeholder.
    #
    # ORDERING: these accounts are created by the target environment's own
    # bootstrap, so applying this stack before that happens fails on IAM members
    # naming service accounts that do not exist. A plan will not say so, because
    # a plan does not check that a member resolves. docs/promotion.md spells out
    # the order; the short version is that prd's IAM comes first.
    #
    # Neither grantee is reachable from a pull request. The planner is pinned to
    # refs/heads/main through env_inputs.planner_ref. The deployer is bound to
    # the subject of a job that declared the target environment, which a pull
    # request cannot declare. Loosening either would turn this into read access
    # for anyone who can push a branch, which is the reason not to.
    registry_readers = [
      "serviceAccount:gecx-shop-deploy@onx-prod-int-shop-demo-gml8.iam.gserviceaccount.com",
      "serviceAccount:gecx-shop-plan@onx-prod-int-shop-demo-gml8.iam.gserviceaccount.com",
    ]
  }
}
