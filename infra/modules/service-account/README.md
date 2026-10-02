# service-account

Creates a service account, grants it project-level roles, and optionally lets
other members act as it.

Roles are granted with `google_project_iam_member`, which adds one member to a
role without touching anyone else. `google_project_iam_binding` would replace
the role's whole member list, so it is deliberately not used.

Bucket roles use `google_storage_bucket_iam_member`, so an account can reach one
bucket instead of every bucket in the project.

`service_account_users` grants `roles/iam.serviceAccountUser` **on this
account**, not project-wide. Cloud Run requires that of a deploying identity
before it will start a service under an explicit runtime account. Scoping the
grant to one account means the deployer can run a workload as the runtime
identity and cannot impersonate the catalog importer.

## Inputs

| Name                    | Description                                                          | Default  |
| ----------------------- | -------------------------------------------------------------------- | -------- |
| `project_id`            | Project that owns the service account.                               | required |
| `account_id`            | Service account ID (6-30 chars, lowercase letters, digits, hyphens). | required |
| `display_name`          | Human-readable name shown in the console.                            | required |
| `project_roles`         | Project-level roles to grant. Keep this minimal.                     | `[]`     |
| `service_account_users` | Members granted `roles/iam.serviceAccountUser` on this account.      | `[]`     |
| `bucket_roles`          | Map of bucket name to roles granted on that bucket only.             | `{}`     |

## Outputs

| Name    | Description                                              |
| ------- | -------------------------------------------------------- |
| `email` | Service account email.                                   |
| `name`  | Fully qualified `projects/.../serviceAccounts/...` name. |
