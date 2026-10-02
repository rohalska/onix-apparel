# storage-bucket

Creates one Cloud Storage bucket with uniform bucket-level access on and public
access prevention enforced. Access is granted elsewhere, with bucket-scoped
IAM, for example through the `bucket_roles` input of the `service-account`
module.

`force_destroy` defaults to `false`, so a destroy fails while the bucket still
holds objects.

## Inputs

| Name            | Description                                               | Default  |
| --------------- | --------------------------------------------------------- | -------- |
| `project_id`    | Project that owns the bucket.                             | required |
| `name`          | Bucket name. Globally unique.                             | required |
| `location`      | Bucket location, such as `US` or `us-central1`.           | required |
| `labels`        | Labels applied to the bucket.                             | `{}`     |
| `force_destroy` | Allow destroying the bucket while it still holds objects. | `false`  |

## Outputs

| Name   | Description |
| ------ | ----------- |
| `name` | Bucket name |
