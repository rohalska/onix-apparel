# infra

OpenTofu modules and Terragrunt live configuration, in `us-central1`.

| Environment | Project                       | Number         | Deployed by                       |
| ----------- | ----------------------------- | -------------- | --------------------------------- |
| `dev`       | `onx-dev-int-shop-demo-qes8`  | `835936341567` | `release.yml`, on every release   |
| `prd`       | `onx-prod-int-shop-demo-gml8` | `210812903728` | `promote.yml`, behind an approval |

See [docs/promotion.md](../docs/promotion.md) for how a version moves from dev
to prd.

## Layout

- `live/root.hcl`: shared remote state, generated provider and version files, and the `project_id`, `env` and `labels` inputs every stack receives.
- `live/_envcommon/<stack>.hcl`: everything about one stack that does not vary by environment. Its own [README](live/_envcommon/README.md) explains why this works.
- `live/<env>/env.hcl`: the only file that differs between environments.
- `live/<env>/<region>/region.hcl`: per-region values.
- `live/<env>/{global,<region>}/<stack>/terragrunt.hcl`: an include of the matching `_envcommon` file, with no body of its own.
- `modules/`: the reusable modules. Each has its own README and a `tests/` directory run by `make -C infra test`.
- `scripts/env-facts.sh`: prints an environment's project id, project number, region, service account addresses and image repository, read out of that environment's `env.hcl` and `region.hcl`. The deploy workflows read it so they carry none of those values themselves.

Adding an environment is a new `env.hcl`, a state bucket, and a set of
include-only stacks. Nothing else changes.

Each stack exists once per environment, at the same path under `live/<env>/`.

| Stack                           | What it owns                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `global/project-services`       | API enablement for the project.                                                  |
| `global/iam-custom-role`        | `gecxShoppingAgentRuntime`, the two-permission runtime role.                     |
| `global/iam-plan-reader`        | `gecxShoppingAgentPlanReader`, two bucket read permissions `roles/viewer` omits. |
| `global/iam-runtime`            | `gecx-shop-run` and the deployer's `serviceAccountUser` grant on it.             |
| `global/iam-deployer`           | `gecx-shop-deploy`.                                                              |
| `global/iam-planner`            | `gecx-shop-plan`.                                                                |
| `global/iam-catalog`            | `gecx-shop-catalog`.                                                             |
| `global/wif-github`             | The `github` pool and provider, and who may impersonate what.                    |
| `us-central1/artifact-registry` | The `gecx-shopping-agent-demo` Docker repository.                                |
| `us-central1/catalog-staging`   | The `<project>-retail-catalog-staging` bucket.                                   |
| `us-central1/cloud-run`         | The `gecx-shopping-agent-demo` service, public, image pinned by digest.          |

Tool versions are pinned in `.opentofu-version` and `.terragrunt-version`.

## Identities

Four accounts, split by duty. The split is the point: no one of them can do
another's job.

| Account             | Holds                                                                                                                                                                                                                                    | Impersonable from                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `gecx-shop-run`     | Only the custom role `gecxShoppingAgentRuntime`: `retail.servingConfigs.search` and `retail.userEvents.create`.                                                                                                                          | nothing (runtime)                                                                                                            |
| `gecx-shop-deploy`  | `roles/run.admin`, `roles/serviceusage.serviceUsageConsumer`, `objectAdmin` on the state bucket only, `artifactregistry.writer` on the one repository, `serviceAccountUser` on `gecx-shop-run` only.                                     | `refs/heads/main` in dev; a job declaring the environment in prd (branch held by the Environment's deployment branch policy) |
| `gecx-shop-plan`    | `roles/viewer`, `roles/serviceusage.serviceUsageConsumer`, `roles/storage.objectViewer` on the state bucket, and `gecxShoppingAgentPlanReader` (`storage.buckets.get`, `storage.buckets.getIamPolicy`) on the state and staging buckets. | per `env_inputs.planner_ref`: any ref in dev, `refs/heads/main` in prd                                                       |
| `gecx-shop-catalog` | `roles/retail.editor`, plus `objectAdmin` and `legacyBucketReader` on the staging bucket only.                                                                                                                                           | `refs/heads/main` in dev; a job declaring the environment in prd (branch held by the Environment's deployment branch policy) |

Each environment has its own four accounts in its own project. The table is the
set per environment, not a shared set.

Dev's planner is impersonable repository-wide, which is why it holds nothing
that can write. Anyone who can open a pull request can run code as it. The deployer
and the catalog importer are pinned to `refs/heads/main` **in dev**, so a
workflow edited on a branch cannot assume either, and that pin is what restricts
a dev dispatch to `main`.

In an environment whose changes go through an approval, those two are bound
instead to the OIDC subject of a job that declared the environment, because a
ref pin cannot express that an approval was given: every job on the pinned
branch satisfies it, gated or not. That binding carries no ref, so it does not
restrict the branch. For prd the branch is restricted by the `prd` GitHub
Environment's deployment branch policy, which allows `main` only, together with
guards in `promote.yml` and `deploy-env.yml`. The policy is a repository setting
no pull request can change; [docs/promotion.md](../docs/promotion.md) has the
command to check it.

Two grants reach across a project boundary: prd's deployer and prd's planner
hold `artifactregistry.reader` on dev's repository, so a promotion can copy the
released digest out of dev without rebuilding it. They are declared in
`live/dev/env.hcl` under `env_inputs.registry_readers`, per environment, because
handing out read on a registry is a deliberate act.

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
  relying on branch protection alone. `prd` has one; `dev` does not, because
  dev is deployed by every release.
- **A pull request plan covers dev only, deliberately.** A plan executes the
  pull request's own Terragrunt configuration, and Terragrunt can run commands
  through `run_cmd`, so whichever environment is planned on a pull request has
  its planner credentials and its state handed to unreviewed code. Planning prd
  there would let anyone who can open a pull request read prd state and
  exfiltrate the prd planner's token. `_envcommon` is shared, so a dev plan
  exercises the same files prd will use, and `deploy-env.yml` plans the whole
  target environment and publishes it before the approval gate, which is when
  prd's own state actually needs looking at.

  That file being on dev is a convention, not the control. A `pull_request` run
  uses the workflow file from the pull request's own branch, so anyone who can
  push a branch could point it at prd. What enforces the boundary is prd's
  Workload Identity binding: `env_inputs.planner_ref` pins prd's planner to
  `refs/heads/main`, so a pull request cannot assume it however the workflow is
  edited. Only `deploy-env.yml`'s plan job needs it, and that is reachable only
  from a promote dispatch on main. Set `planner_ref` on every environment that
  is not continuously deployed, and do not add anything to any planner that can
  write.

- What does cover prd on a pull request is `infra-ci.yml`, which needs no
  credentials: `terragrunt hcl validate` runs over all of `live`, so a prd
  `env.hcl` missing a value a stack reads fails the pull request. What it cannot
  tell you is what prd's state would change to. A pull request that touches only
  `infra/live/prd/**` therefore merges without a prd plan, and the first plan of
  it is the one a promotion publishes before its gate. That is late but safe: it
  is read before the approval, and a change the deployer cannot apply stops the
  run there rather than half applying.

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

`.github/workflows/promote.yml` is how prd is deployed. It takes a released
version and a target environment, cuts the `<env>-<version>` provenance tag, and
calls `.github/workflows/deploy-env.yml` in the same run. That workflow plans the
whole environment as the planner, waits on the environment's required reviewers,
then copies the released digest into the target registry and applies the Cloud
Run stack as the deployer. It applies nothing else, and fails before the approval
if the plan says another stack has changes. [docs/promotion.md](../docs/promotion.md)
has the detail.

`.github/workflows/catalog-import.yml` imports the Retail catalog. It is
`workflow_dispatch` only, takes a `confirm` input that must be the literal
string `import`, must be dispatched from `main` because of the ref pin on
`gecx-shop-catalog`, and runs `scripts/importToGcpRetail.sh`.

## Bootstrap

The state bucket `tfstate-<project>` has to exist before any leaf can run `terragrunt init`. It is created by a one-time, idempotent script rather than a stack, because a stack cannot hold the bucket its own state lives in. The script also enables the APIs that Workload Identity Federation needs (`sts`, `iam`, `iamcredentials`, `cloudresourcemanager`).

```bash
infra/scripts/bootstrap-state.sh onx-dev-int-shop-demo-qes8
infra/scripts/bootstrap-state.sh onx-prod-int-shop-demo-gml8
infra/scripts/tests/test-bootstrap-state.sh onx-dev-int-shop-demo-qes8   # runs the script twice, then asserts versioning, UBLA, public access prevention, the 90-day lifecycle rule and the APIs
```

It needs an authenticated `gcloud` with rights to enable services and administer storage on the target project. Run it with the target project ID for each new environment.

The first apply of an environment also has to be done by hand, in dependency
order, with credentials that can create service accounts and Workload Identity
pools. CI cannot do it: the deployer it would authenticate as is created by that
very apply. `docs/promotion.md` lists the steps.
