terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../modules/project-services"
}

inputs = {
  services = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "retail.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
  ]
}
