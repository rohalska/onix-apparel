# project-services

Enables a list of APIs on a project.

`disable_on_destroy` is false, so destroying this stack leaves the APIs on.
Other resources in the project depend on them.

## Inputs

| Name         | Description                | Default  |
| ------------ | -------------------------- | -------- |
| `project_id` | Project to enable APIs on. | required |
| `services`   | Service names to enable.   | required |

## Outputs

| Name      | Description                      |
| --------- | -------------------------------- |
| `enabled` | Sorted list of managed services. |
