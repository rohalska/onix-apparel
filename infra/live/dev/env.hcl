locals {
  env        = "dev"
  project_id = "onx-dev-int-shop-demo-qes8"

  env_inputs = {
    # Dev is rebuildable, so nothing here blocks a destroy. prd will flip both.
    deletion_protection = false
    min_instance_count  = 0
  }
}
