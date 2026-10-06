locals {
  env        = "prd"
  project_id = "onx-prod-int-shop-demo-gml8"

  # Read by the wif-github stack. The Workload Identity principalSet is built
  # from the project number, which cannot be derived from the project id.
  project_number = "210812903728"

  env_inputs = {
    # The service a customer is shown must not be removable by an apply that
    # merely stops mentioning it. Removing it is then a deliberate two-step:
    # flip this, apply, then destroy.
    deletion_protection = true

    # Pinned, unlike dev's. This is the control that keeps prd out of reach of a
    # pull request: a pull_request run uses the workflow file from its own
    # branch, so anyone who can push a branch could point infra-plan.yml at prd
    # and pick up this token. The only thing that needs it is deploy-env.yml's
    # plan job, which runs from a promote dispatch on main.
    planner_ref = "refs/heads/main"

    # The deployer and the catalog importer are reachable only from a job that
    # declared this GitHub Environment, which is the only way to require that an
    # approval was actually given. A branch pin would let any workflow on main
    # mint them without passing the gate. The name must match the environment
    # deploy-env.yml and catalog-import.yml declare, which is the directory name.
    gated_environment = "prd"

    # One warm instance. This is the environment a demo is given live, so the
    # first request of the day must not pay a cold start.
    min_instance_count = 1

    # Headroom for a live demo audience without leaving the bill open ended.
    # The service is public, so this is the ceiling on what a scraper or a
    # mistake can spend.
    max_instance_count = 10

    # Nothing is promoted out of prd, so no other project reads this registry.
    registry_readers = []
  }
}
