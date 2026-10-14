# Promotion

How a released version reaches `prd`.

Dev is deployed automatically. Prd is deployed by promoting a version that is
already running in dev, behind an approval. No version reaches prd without
having been released first, and no image is ever built twice.

## The two paths

```
merge to main ──▶ release-please release PR ──▶ merge ──▶ tag vX.Y.Z
                                                            │
                                            release.yml ────┤ builds the image,
                                                            │ pushes it to the dev
                                                            │ registry, applies dev
                                                            ▼
                                                        dev is running vX.Y.Z

promote.yml (manual) ──▶ tag prd-vX.Y.Z ──▶ deploy-env.yml ──▶ plan ──▶ ⏸ approval ──▶ apply
                                                                                        │
                                                                                        ▼
                                                                            prd is running vX.Y.Z
```

## Promoting

Run the **Promote** workflow from `main`, with the released version and the
target environment:

```bash
gh workflow run promote.yml -f version=v0.4.0 -f environment=prd
```

It cuts the `prd-v0.4.0` tag and calls the deploy in the same run. Watch it:

```bash
gh run list --workflow=promote.yml --limit 1
gh run watch "$(gh run list --workflow=promote.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
```

The run plans the whole environment, then waits. Read the plan in the run
summary, then approve the `prd` deployment to let the apply proceed.

### It must be run from main

A dispatch carries the ref it was started from, and so does the OIDC token the
deploy presents, so the code that deploys is the reviewed copy on main even
though the code it deploys is an older release tag.

Where that is enforced differs by environment, and it is worth knowing which.
Dev's deployer is pinned to `refs/heads/main` in its Workload Identity binding,
so IAM refuses a token minted from a branch. Prd's deployer is bound to the
subject of a job that declared the `prd` environment, and that subject carries
no ref, so IAM does not check prd's branch. See "What makes the gate real"
below for what does.

### Versions released before prd existed cannot be promoted

The deploy checks out the release tag and plans the environment as that tag
defines it. A version cut before `infra/live/prd/` was added has no prd
environment to plan, so the deploy refuses it by name rather than planning an
empty directory and reporting success. `v0.4.0` was the first promotable
version and is what prd runs.

## What the tag is for

`prd-v0.4.0` is provenance. It records that `v0.4.0` was dispatched at prd, and
it always points at the same commit the release tag points at.

It is cut before the plan, the approval and the apply, so it records an attempt,
not an outcome. A tag whose deploy was rejected or failed still exists. Read the
workflow run, or the environment's deployment history, to see whether the attempt
landed. What the tag guarantees is the other direction: the deploy refuses to run
without it, so prd cannot be deployed except through a promotion.

Nothing triggers on it. The deploy is a reusable workflow that `promote.yml`
calls directly, so a promotion and its deploy are one run and cannot drift
apart. A promotion tag therefore never exists for a deploy that was never
started, which is the failure the design is guarding against. A deploy that
started and then failed does leave its tag behind.

The deploy still requires the tag and refuses to run without it, which keeps the
deploy promotion-driven: a release tag on its own is not enough to deploy to
prd.

Re-promoting the same version moves no tag and re-runs the deploy, which is how
a failed deploy is retried. It fails only when the tag already exists at a
different commit than the version now resolves to, because that means the
release tag was moved underneath it.

## What gets deployed

The image is the one the release built. `release.yml` pushes
`<dev registry>/app:vX.Y.Z` when it cuts the release; the promotion reads that
tag's digest, copies the digest into the prd registry with `crane copy`, and
pins Cloud Run to it.

Nothing is rebuilt. A rebuild from the same source can produce a different
image, and then prd would be running something dev never ran. The apply reads
the service back afterwards and fails if the running image is not the digest it
promoted.

The copy needs read on the dev registry and write on the prd one. Both are the
same Artifact Registry host, so one token covers both. The read is granted in
`infra/live/dev/env.hcl` under `env_inputs.registry_readers`, which names prd's
deployer and prd's planner.

## What gets applied, and what does not

The plan covers the whole environment. The apply covers
`us-central1/cloud-run`.

The prd deployer holds `roles/run.admin`, writer on its registry, and object
admin on its state bucket. It cannot create service accounts, administer
Workload Identity pools, or enable APIs, so it cannot apply the IAM and
project-level stacks. Those are bootstrap: a human with elevated rights applies
them, and they then change rarely.

If the plan finds changes in any other stack, the run fails before the approval
rather than asking somebody to approve an apply that would only half happen.
The message names the stacks. Apply them with `terragrunt apply` against
`infra/live/prd/<stack>` using credentials that can, then promote again.

Widening the apply to the whole environment would mean giving a CI identity
service account and Workload Identity administration on a production project.
That is a decision to take deliberately, not a gap to close by default.

## What makes the gate real

The approval is a GitHub Environment with required reviewers. On its own that is
a repository setting and nothing more: referencing an environment GitHub has
never seen creates it with no protection rules, so a missing or emptied `prd`
environment would mean a promotion plans and then applies with nobody approving.

What stops that is where prd's credentials are bound. Prd's deployer and catalog
importer are not reachable from a branch at all. They are bound to the OIDC
subject of a job that declared the `prd` environment:

```
principal://iam.googleapis.com/projects/<n>/locations/global/workloadIdentityPools/github/subject/repo:onix-net@144174065/gecx-shopping-agent-demo@1388249424:environment:prd
```

A job can only present that subject by declaring `environment: prd`, and GitHub
will not start such a job until the environment's protection rules are
satisfied. So an ungated workflow on main cannot mint prd's deployer, however it
is written. A branch pin could not express this: every job on main satisfies
`refs/heads/main`, gated or not.

**The environment binding does not constrain the branch.** GitHub's subject
carries one context segment, so an environment-scoped `sub` has no `ref`
component and IAM is not checking which branch is deploying. Moving prd's
deployer onto it bought the approval and gave up the branch, so the branch is
constrained in three other places instead:

- `promote.yml` refuses a dispatch from anything but main, as its first step.
- `deploy-env.yml` checks the same thing in `resolve`, because it is a reusable
  workflow and another caller would not inherit that guard.
- The `prd` GitHub Environment allows deployments from `main` only.

The first two are in this repository and tested. The third is a repository
setting that a pull request cannot edit, and it is the one that holds if a
workflow is ever added that reaches the deployer another way, so check it:

```bash
gh api repos/onix-net/gecx-shopping-agent-demo/environments/prd/deployment-branch-policies \
  --jq '.branch_policies[].name'
```

It should print `main` and nothing else. It is a named branch policy rather than
"protected branches" on purpose: protecting another branch later would otherwise
quietly make that branch able to deploy production.

Dev keeps the branch pin, because dev deploys on every release and has no
approval to pass.

Prd's planner stays on the branch pin too, pinned to main. The plan job is
deliberately ungated so an approver can read the plan before approving, so it
cannot present an environment subject. The planner can write nothing anywhere,
which is what makes that acceptable.

Two things follow from this, and both will bite if missed:

- **The subject prefix is read from GitHub, not guessed.** This repository has
  immutable subject claims on, so the prefix carries numeric owner and
  repository ids. The plain `repo:<owner>/<repo>` form would never match and
  every gated deploy would fail at the token exchange. Check it with
  `gh api repos/onix-net/gecx-shopping-agent-demo/actions/oidc/customization/sub`;
  it lives in `infra/live/_envcommon/wif-github.hcl` and changing that setting
  means changing it there and re-applying.
- **The environment name is the directory name.** `deploy-env.yml` uses the same
  input for the Terragrunt directory and the `environment:` gate, and the
  binding is built from `env_inputs.gated_environment`. All three have to agree
  or the token exchange fails.

Reviewers are still worth checking by hand when setting an environment up, since
the binding proves a gate was declared rather than that anybody had to approve:

```bash
gh api repos/onix-net/gecx-shopping-agent-demo/environments/prd \
  --jq '[.protection_rules[] | select(.type == "required_reviewers") | .reviewers[]?] | length'
```

As of this writing `prd` requires the `gecx-shopping-agent-demo` team or
`quiteDEADlee`, and allows deployments from `main` only.

## What the approval is binding on

The gate sits after the plan, so an approver reads the plan before approving.
The wait is then unbounded. Three things could differ by the time the apply
runs, and they are not equally well handled.

**The image: bound.** The promotion copies by digest, and before copying it
re-resolves the source tag and refuses if that tag no longer gives the digest
that was planned.

**Another Terraform operation: bound.** The plan job saves the plan with `-out`
and records its checksum; the apply downloads it, checks the checksum, and
applies that file rather than computing a new one. OpenTofu refuses a saved plan
whose state has moved since it was made:

```
Error: Saved plan is stale
```

So an elevated out-of-band apply during the wait stops the deploy rather than
being clobbered by it.

The run summary shows that saved plan, rendered with `terragrunt show`, under
"The plan this deploy will apply". Read that one. The longer whole-environment
plan beside it is a different computation, run earlier in the same job, and it
is there because the unexpected-stack guard needs it; it is not what executes.
The checksum proves the saved file was not altered after it was written, which
is not the same as proving it matches something else you were shown, so the
thing to approve is the rendered saved plan.

**A change made by hand: not bound.** This is the limit worth understanding.
The stale check compares the plan's prior-state lineage and serial against the
backend state. A `gcloud run services update-traffic` never touches that state,
so the serial does not move, the saved plan is not stale, and it applies
cleanly. Its recorded `after` for the service carries
`traffic = TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST`, so applying it sends that.
Nothing about the saved plan stops a hand-made change being reverted.

One such change is detectable, and it is the one this document tells you to
make: traffic moved off the latest revision. The apply reads the live service
before applying and **refuses** unless the split is exactly one target,
`latestRevision`, at 100 percent, which is what the stack manages. A full pin, a
90/10 canary and a latest-at-zero-percent split all refuse, because all of them
mean somebody moved traffic by hand and applying would move it back. Dispatching
with `acknowledge_traffic_pin` is how you proceed anyway. So:

- A pending promotion approved while a rollback is pinned fails instead of
  silently undoing it.
- Promoting the fix that ends the incident is `acknowledge_traffic_pin: true`,
  which says "yes, return traffic to this version".

Other hand-made edits to the service, such as an environment variable changed in
the console, are not detected and will be reverted by the apply. Detecting those
would mean comparing a refresh-only plan after the gate against the approved
one, which is not done.

A service that genuinely does not exist, which is a first deploy, proceeds. A
read that merely fails is retried three times and then **refuses**: a 403, a 429
or a 500 must not be mistaken for an absent service, because that would proceed
to overwrite a split it could not read. Re-running the promotion after that
costs another approval and nothing else, since the image is already in the
target registry and the service was never touched.

The saved plan travels as its own artifact, kept for one day, separate from the
readable `plan.txt` that is kept for thirty. A binary plan holds the unit's full
prior state and shows anything a provider marks sensitive in the clear, so it is
not something to leave lying around for everyone with repository read access.
There is nothing secret in it today, because the Cloud Run module takes plain
environment values and has no Secret Manager plumbing, and a test fails if that
changes.

An earlier version compared the plan's resource counts across the gate. It was
removed: the stack is a single `google_cloud_run_v2_service`, so an image change
and a hand-made traffic pin are both
`Plan: 0 to add, 1 to change, 0 to destroy`, and counts could not tell them
apart.

## Rolling back

Rolling back means promoting an older release, and it is not unconditional.

The deploy plans the whole environment as the older tag defines it. If any stack
other than Cloud Run differs from what is applied, the plan reports changes in a
stack the deployer cannot apply and the run stops before the gate. So a rollback
across a release that also changed IAM, enabled a service, or moved an
`env_inputs` value is refused, and clearing it needs an elevated apply out of
band. A version cut before `infra/live/prd/env.hcl` existed is refused as well.

A rollback also restores that release's configuration, not only its image. Both
the plan and the apply check out the release commit, so promoting v0.4.0 after
v0.6.0 also restores v0.4.0's environment variables, scaling limits and module
code. An image and the configuration it expects belong together, so that is
deliberate, but it means a promotion is never image-only.

That is the right default for a planned rollback and the wrong one during an
incident, so do not reach for it then. Move traffic to the previous revision:

```bash
# Newest first, with readiness and the digest each revision runs. Without
# --sort-by the order is not guaranteed, and a revision that never served can
# sit between two releases.
gcloud run revisions list --service gecx-shopping-agent-demo \
  --region us-central1 --project onx-prod-int-shop-demo-gml8 \
  --sort-by='~metadata.creationTimestamp' \
  --format='table(metadata.name, metadata.creationTimestamp, status.conditions[0].status, spec.containers[0].image)'

# What is serving now, before changing it.
gcloud run services describe gecx-shopping-agent-demo \
  --region us-central1 --project onx-prod-int-shop-demo-gml8 --format='value(status.traffic)'

# Pick a revision whose STATUS is True and whose digest you recognise.
gcloud run services update-traffic gecx-shopping-agent-demo \
  --region us-central1 --project onx-prod-int-shop-demo-gml8 \
  --to-revisions <previous-revision>=100

# Confirm it took, then check the service actually answers.
gcloud run services describe gecx-shopping-agent-demo \
  --region us-central1 --project onx-prod-int-shop-demo-gml8 --format='value(status.traffic)'
curl -fsS -o /dev/null -w '%{http_code}\n' https://gecx-shopping-agent-demo-210812903728.us-central1.run.app/api/health
```

The Cloud Run stack serves `TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST` at 100, so a
pinned revision is drift: the next apply of that stack sends traffic back to the
newest revision. It holds the line rather than fixing anything, so promote a
good version once there is time.

## Bringing up a new environment

1. Declare the project in
   [onix-internal-infra](https://github.com/onix-net/onix-internal-infra/tree/main/gcp/onixnet.com/hierarchy/shopping-agent-demo)
   and let that apply.
2. Create the state bucket: `infra/scripts/bootstrap-state.sh <project-id>`.
3. Accept the Retail data use terms for the project, at
   `https://console.cloud.google.com/ai/retail/start?project=<project-id>`.
   Enabling `retail.googleapis.com` is not enough on its own and there is no API
   or Terraform resource for the terms, so this is a console click. Until it is
   done every Retail call returns `FAILED_PRECONDITION` and the storefront falls
   back to its bundled catalog. Acceptance takes up to a minute to reach the
   API, and the console may show a stale error in the meantime; confirm with
   `gcloud` rather than the page:

   ```bash
   curl -sS -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "x-goog-user-project: <project-id>" \
     "https://retail.googleapis.com/v2/projects/<project-id>/locations/global/catalogs"
   ```

4. Add `infra/live/<env>/env.hcl` with the project id, the project number and
   the `env_inputs`, and `infra/live/<env>/<region>/region.hcl`. Set
   `planner_ref` to `refs/heads/main` for anything that is not continuously
   deployed, so its planner cannot be reached from a pull request, and set
   `gated_environment` to the environment's own name so its deployer and catalog
   importer are bound to the gate rather than to a branch.
5. Add the stacks. Each is an include of the matching file in
   `infra/live/_envcommon`, with no body of its own.

The remaining steps have to happen in this order, because each one creates
something the next needs. All of them want credentials that can create service
accounts and Workload Identity pools; CI holds none of that, by design.

6. Apply every stack of the new environment **except Cloud Run**, in dependency
   order: `global/project-services`, then `<region>/catalog-staging`, then
   `global/iam-custom-role` and `global/iam-plan-reader`, then
   `global/iam-deployer`, then `global/iam-planner` and `global/iam-catalog`,
   then `global/iam-runtime`, then `global/wif-github`, then
   `<region>/artifact-registry`. This is what creates the environment's service
   accounts.
7. Add the new environment's deployer and planner to
   `infra/live/dev/env.hcl` under `env_inputs.registry_readers`, and apply
   `infra/live/dev/us-central1/artifact-registry`. This has to come after step 6:
   an Artifact Registry IAM member naming a service account that does not exist
   yet fails at apply.
8. Copy an image into the new environment's registry, because the Cloud Run
   stack refuses to apply without `IMAGE_DIGEST` and the digest has to be one
   that registry already holds:

   ```bash
   crane copy \
     us-central1-docker.pkg.dev/onx-dev-int-shop-demo-qes8/gecx-shopping-agent-demo/app:<version> \
     <region>-docker.pkg.dev/<project-id>/gecx-shopping-agent-demo/app:<version>
   ```

9. Apply `<region>/cloud-run` with `IMAGE_DIGEST` set to that digest.
10. Create a GitHub Environment with the same name as the directory, with the
    demo team as a required reviewer. The name has to match: `deploy-env.yml`
    uses the environment input for both the Terragrunt directory and the
    `environment:` gate, so there is no mapping table to drift.
11. Add the environment to `promote.yml`'s `environment` choice list.

After that a promotion can run on its own, and steps 6 to 9 are not needed
again: a release-to-release promotion only re-applies Cloud Run.

No workflow carries a project id, a project number or a service account
address. `infra/scripts/env-facts.sh` reads them back out of the environment's
own `env.hcl` and `region.hcl`, so a workflow cannot deploy to one project while
Terragrunt writes state for another.
