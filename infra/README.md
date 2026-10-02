# infra

OpenTofu modules and Terragrunt live configuration for the dev GCP project
`onx-dev-int-shop-demo-qes8` (number `835936341567`), region `us-central1`.

## Layout

- `live/root.hcl`: shared remote state, generated provider and version files, and the `project_id`, `env` and `labels` inputs every leaf receives.
- `live/<env>/env.hcl`: per-environment values.
- `live/<env>/<region>/region.hcl`: per-region values.
- `modules/`: the reusable modules. Each has its own README and a `tests/` directory run by `make -C infra test`.

Only `dev` exists. There is no `prd` tree and no promotion job yet.

| Leaf                                | What it owns                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `dev/global/project-services`       | API enablement for the project.                                                  |
| `dev/global/iam-custom-role`        | `gecxShoppingAgentRuntime`, the two-permission runtime role.                     |
| `dev/global/iam-plan-reader`        | `gecxShoppingAgentPlanReader`, two bucket read permissions `roles/viewer` omits. |
| `dev/global/iam-runtime`            | `gecx-shop-run` and the deployer's `serviceAccountUser` grant on it.             |
| `dev/global/iam-deployer`           | `gecx-shop-deploy`.                                                              |
| `dev/global/iam-planner`            | `gecx-shop-plan`.                                                                |
| `dev/global/iam-catalog`            | `gecx-shop-catalog`.                                                             |
| `dev/global/wif-github`             | The `github` pool and provider, and who may impersonate what.                    |
| `dev/us-central1/artifact-registry` | The `gecx-shopping-agent-demo` Docker repository.                                |
| `dev/us-central1/catalog-staging`   | The `<project>-retail-catalog-staging` bucket.                                   |
| `dev/us-central1/cloud-run`         | The `gecx-shopping-agent-demo` service, public, image pinned by digest.          |

Tool versions are pinned in `.opentofu-version` and `.terragrunt-version`.

## Identities

Four accounts, split by duty. The split is the point: no one of them can do
another's job.

| Account             | Holds                                                                                                                                                                                                                                    | Impersonable from   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `gecx-shop-run`     | Only the custom role `gecxShoppingAgentRuntime`: `retail.servingConfigs.search` and `retail.userEvents.create`.                                                                                                                          | nothing (runtime)   |
| `gecx-shop-deploy`  | `roles/run.admin`, `roles/serviceusage.serviceUsageConsumer`, `objectAdmin` on the state bucket only, `artifactregistry.writer` on the one repository, `serviceAccountUser` on `gecx-shop-run` only.                                     | `refs/heads/main`   |
| `gecx-shop-plan`    | `roles/viewer`, `roles/serviceusage.serviceUsageConsumer`, `roles/storage.objectViewer` on the state bucket, and `gecxShoppingAgentPlanReader` (`storage.buckets.get`, `storage.buckets.getIamPolicy`) on the state and staging buckets. | any ref in the repo |
| `gecx-shop-catalog` | `roles/retail.editor`, plus `objectAdmin` and `legacyBucketReader` on the staging bucket only.                                                                                                                                           | `refs/heads/main`   |

The planner is impersonable repository-wide, which is why it holds nothing that
can write. Anyone who can open a pull request can run code as it. The deployer
and the catalog importer are pinned to `refs/heads/main`, so a workflow edited
on a branch cannot assume either.

## Workload Identity Federation

Pool and provider are both `github`. The provider's condition requires
`assertion.repository == 'onix-net/gecx-shopping-agent-demo'` **and**
`assertion.repository_id == '1388249424'`, so a renamed or re-registered
repository of the same name is rejected. There are no service account keys
anywhere in this project.

### Constraints the plan and deploy workflows must honour

These are not optional. The Workload Identity bindings assume them, and nothing
in `infra/` can enforce them from the outside.

- **Use `pull_request`, never `pull_request_target`.** The deployer is bound to
  `attribute.repo_ref` for `refs/heads/main`, which stops a workflow running on a
  branch from impersonating it. It does not stop a `pull_request_target` workflow,
  because that event's token carries the _base_ ref, so a `pull_request_target`
  job on a pull request would present `refs/heads/main` and satisfy the binding.
- **Never check out pull request code in a workflow that can reach the deployer.**
  Combined with the point above, checking out and executing contributor code in
  such a job hands it the deployer's credentials.
- **Run `terragrunt plan` with `-lock=false` in the plan job**, because the
  planner cannot write the lock object. Taking the state lock writes an object,
  and the planner has no bucket write access, so the job fails without it. A
  plan does not write state, so skipping the lock is safe. The deployer runs
  `apply`, keeps write access, and keeps the lock.
- Prefer a GitHub environment with required reviewers, or a `job_workflow_ref`
  binding, for the deploy job. Either makes the boundary explicit rather than
  relying on branch protection alone.

## Gate

Run from the repo root:

```bash
make -C infra fmt-check validate   # format and Terragrunt HCL validation
make -C infra check                # adds tflint and tofu test over modules/
make -C infra fmt                  # apply formatting
```

`.github/workflows/infra-ci.yml` runs the same checks on every pull request that
touches `infra/**`, and on push to main: Terragrunt `hcl validate`, then
`make -C infra fmt-check lint test`. It needs no cloud credentials.

`.github/workflows/infra-plan.yml` plans dev on pull requests that touch
`infra/**`, impersonating `gecx-shop-plan`, and posts the output as a pull
request comment. It reads the deployed digest first so the plan diffs against
what is running rather than against the leaf's committed placeholder.

The dev apply lives in the `deploy-dev` job of `.github/workflows/release.yml`,
which runs only when release-please cut a tag. It builds and pushes the image,
reads the digest back from the push, applies
`live/dev/us-central1/cloud-run` with that digest as `IMAGE_DIGEST`, then reads
the service back and fails if the deployed image is not the one it built.

`.github/workflows/catalog-import.yml` imports the Retail catalog. It is
`workflow_dispatch` only, takes a `confirm` input that must be the literal
string `import`, must be dispatched from `main` because of the ref pin on
`gecx-shop-catalog`, and runs `scripts/importToGcpRetail.sh`.

## Bootstrap

The state bucket `tfstate-<project>` has to exist before any leaf can run `terragrunt init`. It is created by a one-time, idempotent script rather than a stack, because a stack cannot hold the bucket its own state lives in. The script also enables the APIs that Workload Identity Federation needs (`sts`, `iam`, `iamcredentials`, `cloudresourcemanager`).

```bash
infra/scripts/bootstrap-state.sh onx-dev-int-shop-demo-qes8
infra/scripts/tests/test-bootstrap-state.sh onx-dev-int-shop-demo-qes8   # runs the script twice, then asserts versioning, UBLA, public access prevention, the 90-day lifecycle rule and the APIs
```

It needs an authenticated `gcloud` with rights to enable services and administer storage on the target project. Run it with the target project ID for each new environment.
