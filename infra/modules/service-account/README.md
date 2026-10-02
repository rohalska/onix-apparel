# service-account

Creates a service account and grants it project-level roles.

Roles are granted with `google_project_iam_member`, which adds one member to a
role without touching anyone else. `google_project_iam_binding` would replace
the role's whole member list, so it is deliberately not used.

Bucket roles use `google_storage_bucket_iam_member`, so an account can reach one
bucket instead of every bucket in the project.

## Inputs

| Name            | Description                                                          | Default  |
| --------------- | -------------------------------------------------------------------- | -------- |
| `project_id`    | Project that owns the service account.                               | required |
| `account_id`    | Service account ID (6-30 chars, lowercase letters, digits, hyphens). | required |
| `display_name`  | Human-readable name shown in the console.                            | required |
| `project_roles` | Project-level roles to grant. Keep this minimal.                     | `[]`     |
| `bucket_roles`  | Map of bucket name to roles granted on that bucket only.             | `{}`     |

## Outputs

| Name    | Description                                              |
| ------- | -------------------------------------------------------- |
| `email` | Service account email.                                   |
| `name`  | Fully qualified `projects/.../serviceAccounts/...` name. |
