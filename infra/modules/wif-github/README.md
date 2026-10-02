# wif-github

Creates a workload identity pool and an OIDC provider for GitHub Actions, and
lets one repository impersonate the listed service accounts. No service account
keys are involved.

Trust is pinned in two places. The provider's `attribute_condition` is
`assertion.repository == '<repository>' && assertion.repository_id == '<repository_id>'`,
so tokens from any other repository are rejected at the pool. The numeric id is
pinned because the name is mutable: a renamed, transferred or deleted
repository's old name can be re-registered by someone else, but not its id. Each impersonation binding is a `principalSet` on
`attribute.repository/<repository>`, not on the pool root, so only that
repository's identities can use the service account. Removing either one
widens access; the tests fail if the condition is empty or does not name the
repository, or if the member string stops being repository-scoped.

The provider resource name uses the project number, not the ID, which is why
both are inputs.

## Inputs

| Name                     | Description                                                                         | Default  |
| ------------------------ | ----------------------------------------------------------------------------------- | -------- |
| `project_id`             | Project that owns the pool.                                                         | required |
| `project_number`         | Project number, used in the provider resource name.                                 | required |
| `repository`             | GitHub repository allowed to mint tokens, as `owner/name`.                          | required |
| `repository_id`          | Numeric GitHub repository id (`gh api repos/<owner>/<name> --jq .id`), digits only. | required |
| `pool_id`                | Workload identity pool ID.                                                          | `github` |
| `provider_id`            | Workload identity pool provider ID.                                                 | `github` |
| `service_account_emails` | Service accounts the repository's workflows may impersonate.                        | `[]`     |

## Outputs

| Name            | Description                                                                     |
| --------------- | ------------------------------------------------------------------------------- |
| `provider_name` | Fully qualified provider name, passed verbatim to `google-github-actions/auth`. |
| `pool_name`     | Pool resource name.                                                             |
