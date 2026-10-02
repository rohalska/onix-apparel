# wif-github

Creates a workload identity pool and an OIDC provider for GitHub Actions, and
lets one repository impersonate the service accounts you name. No service
account keys are involved.

Trust is pinned in two places. The provider's `attribute_condition` is
`assertion.repository == '<repository>' && assertion.repository_id == '<repository_id>'`,
so tokens from any other repository are rejected at the pool. The numeric id is
pinned because the name is mutable: a renamed, transferred or deleted
repository's old name can be re-registered by someone else, but not its id.
Each impersonation binding is then a `principalSet` scoped to this repository
rather than to the pool root. Removing either pin widens access, and the tests
fail if the condition is empty or does not name the repository, or if a member
string stops being repository-scoped.

Impersonation comes in two forms, and which one an account gets is a security
decision:

- `service_account_emails` binds on `attribute.repository`, so any workflow in
  the repository can assume the account, including one running on a pull
  request from a fork's branch. Reserve it for read-only identities such as the
  plan account.
- `service_account_refs` binds on `attribute.repo_ref`, so only a workflow
  running on the named ref can assume the account. The deployer and the catalog
  importer are both pinned to `refs/heads/main`, which stops a workflow edited
  on a pushed branch from assuming either. A `workflow_dispatch` carries the ref
  it was dispatched from, so the pin also forces the catalog import to be
  dispatched from main.

An account in both lists would get the wide binding as well as the narrow one,
so a validation rejects that.

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
| `service_account_emails` | Accounts any workflow in the repository may impersonate.                            | `[]`     |
| `service_account_refs`   | Map of account email to the one git ref it may be impersonated from.                | `{}`     |

## Outputs

| Name            | Description                                                                     |
| --------------- | ------------------------------------------------------------------------------- |
| `provider_name` | Fully qualified provider name, passed verbatim to `google-github-actions/auth`. |
| `pool_name`     | Pool resource name.                                                             |
