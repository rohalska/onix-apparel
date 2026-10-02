# artifact-registry

Creates a Docker repository in Artifact Registry and grants writer and reader
access to the principals you pass in.

Access is granted with `google_artifact_registry_repository_iam_member`, which
adds one member to a role without touching anyone else. The `_binding` and
`_policy` forms replace the role's whole member list, so they are deliberately
not used.

The repository's cleanup policies start in dry-run mode
(`cleanup_policy_dry_run = true`). A policy that deletes on its first run can
collect the digest a running service is pinned to. Read the dry-run output in
the Cloud Logging audit logs before turning deletion on.

Three policies are defined. Two keep versions: the newest `keep_version_count`
per package, and anything newer than `keep_recent_duration` (90 days) whether
or not it is tagged. One deletes untagged versions older than 30 days.
Artifact Registry does not know what Cloud Run references, so turning dry-run
off is only safe if every deployed digest is either tagged or newer than the
keep window. The deploy pipeline must tag each release. Dry-run is turned off
by a deliberate manual edit; there is no variable for it.

## Inputs

| Name                   | Description                                                                   | Default      |
| ---------------------- | ----------------------------------------------------------------------------- | ------------ |
| `project_id`           | Project that owns the repository.                                             | required     |
| `region`               | Artifact Registry location.                                                   | required     |
| `name`                 | Repository ID.                                                                | required     |
| `labels`               | Labels applied to the repository.                                             | `{}`         |
| `writers`              | Fully qualified IAM members granted `artifactregistry.writer`.                | `[]`         |
| `readers`              | Fully qualified IAM members granted `artifactregistry.reader`.                | `[]`         |
| `keep_version_count`   | Most recent versions per package the cleanup policy keeps, regardless of tag. | `10`         |
| `keep_recent_duration` | Versions newer than this are never deleted, tagged or not.                    | `"7776000s"` |

## Outputs

| Name             | Description                                         |
| ---------------- | --------------------------------------------------- |
| `repository_url` | Host and path a docker push targets, without a tag. |
| `repository_id`  | Repository ID.                                      |
