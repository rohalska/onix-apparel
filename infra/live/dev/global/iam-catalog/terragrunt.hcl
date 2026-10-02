include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../modules/service-account"
}

dependencies {
  paths = ["../project-services"]
}

dependency "staging_bucket" {
  config_path = "../../us-central1/catalog-staging"

  mock_outputs                            = { name = "mock-retail-catalog-staging" }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

# Catalog import needs roles/retail.editor, which carries product deletion and
# model tuning. The identity the public storefront runs as must never hold it,
# so the import duty gets its own account. The catalog-import workflow assumes
# it, and the wif-github leaf pins it to refs/heads/main, so an import cannot be
# run from a modified copy on a branch. It is not in service_account_emails,
# which is the repository-wide list.
inputs = {
  account_id   = "gecx-shop-catalog"
  display_name = "GECX shopping agent demo catalog importer"

  project_roles = [
    # Catalog import and product writes. Separated from the runtime identity so
    # a compromise of the public service cannot delete the catalog.
    "roles/retail.editor",
  ]

  # The import script uploads the feed and reads it back, so it needs object
  # create as well as read, but only on the staging bucket. The bucket is
  # created by the catalog-staging leaf, not by the script.
  #
  # objectAdmin alone cannot describe a bucket (it has no storage.buckets.*
  # permissions), and the import script's guard runs `gcloud storage buckets
  # describe`. legacyBucketReader supplies storage.buckets.get, which is why the
  # second role is present.
  bucket_roles = {
    (dependency.staging_bucket.outputs.name) = ["roles/storage.objectAdmin", "roles/storage.legacyBucketReader"]
  }
}
