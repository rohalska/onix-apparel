# custom-role

Creates a project-level custom IAM role from an explicit permission list.

The Cloud Run runtime identity needs two Retail API operations: `servingConfigs:search`
and `userEvents:write`. `roles/retail.viewer` covers the first but not the second. The
narrowest predefined role covering both, `roles/retail.editor`, also grants
`retail.products.delete`, `retail.catalogs.import` and `retail.models.tune`, so a custom
role names the two permissions directly.

`permissions` rejects wildcards and an empty list.

## Inputs

| Name          | Description                                                              |
| ------------- | ------------------------------------------------------------------------ |
| `project_id`  | Project that owns the role.                                              |
| `role_id`     | Role ID, 3-64 chars of letters, digits, underscores or dots. No hyphens. |
| `title`       | Human-readable role title.                                               |
| `permissions` | Exact permissions to grant. No wildcards, at least one.                  |

## Outputs

| Name        | Description                                                            |
| ----------- | ---------------------------------------------------------------------- |
| `role_name` | `projects/<project>/roles/<role_id>`, the form an IAM binding accepts. |
