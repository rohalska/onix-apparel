# cloud-run-service

Creates a Cloud Run v2 service that runs a digest-pinned image as a supplied
service account.

Two inputs are validated so a bad value fails at plan time:

- `image` must end in `@sha256:` plus 64 hex characters. A mutable tag can
  change the running revision without a plan.
- `service_account_email` must not be a default compute service account
  (`...-compute@developer.gserviceaccount.com`).

Public access is opt-in. `allow_public_access = true` adds `allUsers` to
`roles/run.invoker` with `google_cloud_run_v2_service_iam_member`, which adds
one member without touching other invokers.

The defaults for CPU, memory, max instances, ingress, startup CPU boost and
container port (8080) match the service this module replaces, so adopting it
changes the name and identity and nothing about how the app runs.

## Inputs

| Name                    | Description                                                            | Default   |
| ----------------------- | ---------------------------------------------------------------------- | --------- |
| `project_id`            | Project that owns the service.                                         | required  |
| `region`                | Cloud Run region.                                                      | required  |
| `name`                  | Service name. Immutable: changing it replaces the service and its URL. | required  |
| `image`                 | Container image, pinned by digest.                                     | required  |
| `service_account_email` | Runtime identity. Never the default compute account.                   | required  |
| `env`                   | Plain environment variables for the container.                         | `{}`      |
| `labels`                | Labels applied to the service.                                         | `{}`      |
| `allow_public_access`   | Grant `allUsers` `roles/run.invoker`.                                  | `false`   |
| `cpu`                   | CPU limit per container.                                               | `"1000m"` |
| `memory`                | Memory limit per container.                                            | `"512Mi"` |
| `min_instance_count`    | Minimum instances.                                                     | `0`       |
| `max_instance_count`    | Maximum instances.                                                     | `100`     |
| `deletion_protection`   | Block deletion of the service.                                         | `false`   |

## Outputs

| Name           | Description              |
| -------------- | ------------------------ |
| `url`          | The service's HTTPS URL. |
| `service_name` | Service name.            |
