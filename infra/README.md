# infra

OpenTofu modules and Terragrunt live configuration for the dev GCP project
`onx-dev-int-shop-demo-qes8`.

## Layout

- `live/root.hcl`: shared remote state, generated provider and version files, and the `project_id`, `env` and `labels` inputs every leaf receives.
- `live/<env>/env.hcl`: per-environment values.
- `live/<env>/<region>/region.hcl`: per-region values.
- `modules/`: reusable OpenTofu modules (added by later work).

Tool versions are pinned in `.opentofu-version` and `.terragrunt-version`.

## Gate

Run from the repo root:

```bash
make -C infra fmt-check validate   # format and Terragrunt HCL validation
make -C infra check                # adds tflint and tofu test over modules/
make -C infra fmt                  # apply formatting
```

The `infra-ci` workflow (`.github/workflows/infra-ci.yml`) runs the same checks on every pull request that touches `infra/**`: Terragrunt `hcl validate`, then `make -C infra fmt-check lint test`. It needs no cloud credentials. A plan-on-pull-request workflow and the dev deploy step in the release workflow both authenticate through Workload Identity Federation and are added after the first apply, once the pool exists.

The plan job impersonates the `gecx-shop-plan` identity, which can read bucket IAM but cannot write to any bucket. It holds `roles/viewer` project-wide, `roles/storage.objectViewer` on the state bucket, and the `gecxShoppingAgentPlanReader` custom role (`storage.buckets.get` and `storage.buckets.getIamPolicy`) on the state and catalog staging buckets, because `roles/viewer` lacks those two permissions. Taking the state lock writes an object, so the plan workflow MUST run `terragrunt plan` with `-lock=false`; without it the plan job fails when it tries to acquire the lock. The deployer, which runs `apply`, keeps write access and the lock.

### Constraints the plan and deploy workflows must honour

These are not optional. The Workload Identity bindings assume them, and nothing
in `infra/` can enforce them from the outside.

- **Use `pull_request`, never `pull_request_target`.** The deployer is bound to
  `attribute.repo_ref` for `refs/heads/main`, which stops a workflow running on a
  branch from impersonating it. It does not stop a `pull_request_target` workflow,
  because that event's token carries the _base_ ref — so a `pull_request_target`
  job on a pull request would present `refs/heads/main` and satisfy the binding.
- **Never check out pull request code in a workflow that can reach the deployer.**
  Combined with the point above, checking out and executing contributor code in
  such a job hands it the deployer's credentials.
- **Run `terragrunt plan` with `-lock=false` in the plan job**, because the
  planner cannot write the lock object. See the paragraph above.
- Prefer a GitHub environment with required reviewers, or a `job_workflow_ref`
  binding, for the deploy job. Either makes the boundary explicit rather than
  relying on branch protection alone.

## Bootstrap

The state bucket `tfstate-<project>` has to exist before any leaf can run `terragrunt init`. It is created by a one-time, idempotent script rather than a stack, because a stack cannot hold the bucket its own state lives in. The script also enables the APIs that Workload Identity Federation needs (`sts`, `iam`, `iamcredentials`, `cloudresourcemanager`).

```bash
infra/scripts/bootstrap-state.sh onx-dev-int-shop-demo-qes8
infra/scripts/tests/test-bootstrap-state.sh onx-dev-int-shop-demo-qes8   # runs the script twice, then asserts versioning, UBLA, public access prevention, the 90-day lifecycle rule and the APIs
```

It needs an authenticated `gcloud` with rights to enable services and administer storage on the target project. Run it with the target project ID for each new environment, including prd.
