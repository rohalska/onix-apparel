include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../modules/custom-role"
}

dependencies {
  paths = ["../project-services"]
}

inputs = {
  role_id = "gecxShoppingAgentRuntime"
  title   = "GECX shopping agent demo runtime"

  # Exactly what server/proxy.mjs calls: the search at :589 and :1026, and the
  # event write at :865. Nothing else.
  permissions = [
    "retail.servingConfigs.search",
    "retail.userEvents.create",
  ]
}
