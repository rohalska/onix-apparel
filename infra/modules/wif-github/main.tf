resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = var.pool_id
  display_name              = "GitHub Actions"
  description               = "OIDC federation for GitHub Actions workflows"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = var.provider_id
  display_name                       = "GitHub"

  # Without this condition the pool trusts every repository on GitHub. The
  # numeric id is pinned as well because the name is mutable: after a rename or
  # transfer, someone else can register the old name, but not the old id.
  attribute_condition = "assertion.repository == '${var.repository}' && assertion.repository_id == '${var.repository_id}'"

  attribute_mapping = {
    "google.subject"          = "assertion.sub"
    "attribute.repository"    = "assertion.repository"
    "attribute.repository_id" = "assertion.repository_id"
    "attribute.repo_ref"      = "assertion.repository + ':' + assertion.ref"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "wif" {
  for_each = toset(var.service_account_emails)

  service_account_id = "projects/${var.project_id}/serviceAccounts/${each.value}"
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.repository}"
}

# Accounts pinned to one git ref. A workflow on any other branch, or a pull
# request, presents a different ref claim and cannot impersonate these. The
# member is the repository and ref combined, so the binding names the
# repository itself instead of relying on the provider's attribute_condition to
# exclude other repositories.
resource "google_service_account_iam_member" "wif_ref" {
  for_each = var.service_account_refs

  service_account_id = "projects/${var.project_id}/serviceAccounts/${each.key}"
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repo_ref/${var.repository}:${each.value}"
}
