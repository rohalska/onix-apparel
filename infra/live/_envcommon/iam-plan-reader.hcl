terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../modules/custom-role"
}

dependencies {
  paths = ["../project-services"]
}

# roles/viewer covers every getIamPolicy a plan refresh needs (project, service
# account, Artifact Registry, Cloud Run) except the bucket ones. It has no
# storage.buckets.get or storage.buckets.getIamPolicy, and neither do
# roles/storage.objectViewer or roles/storage.legacyBucketReader. This role
# supplies just those two, and the planner leaf binds it on the specific
# buckets rather than project-wide.
inputs = {
  role_id = "gecxShoppingAgentPlanReader"
  title   = "GECX shopping agent demo plan reader"

  permissions = [
    # Refresh google_storage_bucket (catalog-staging leaf).
    "storage.buckets.get",
    # Refresh google_storage_bucket_iam_member.
    "storage.buckets.getIamPolicy",
  ]
}
