# wif-github

Creates a workload identity pool and an OIDC provider for GitHub Actions, and
lets one repository impersonate the service accounts you name. No service
account keys are involved.

Trust is pinned in two places. The provider's `attribute_condition` is
`assertion.repository == '<repository>' && assertion.repository_id == '<repository_id>'`,
so tokens from any other repository are rejected at the pool. The numeric id is
pinned because the name is mutable: a renamed, transferred or deleted
repository's old name can be re-registered by someone else, but not its id.
Each impersonation binding is then a `principalSet` scoped to this repository
rather than to the pool root. Removing either pin widens access, and the tests
fail if the condition is empty or does not name the repository, or if a member
string stops being repository-scoped.

Impersonation comes in two forms, and which one an account gets is a security
decision:

- `service_account_emails` binds on `attribute.repository`, so any workflow in
  the repository can assume the account, including one running on a pull
  request from a fork's branch. Reserve it for read-only identities such as the
  plan account.
- `service_account_refs` binds on `attribute.repo_ref`, so only a workflow
  running on the named ref can assume the account, which stops a workflow edited
  on a pushed branch from assuming it. A `workflow_dispatch` carries the ref it
  was dispatched from, so the pin also forces a dispatched job to come from that
  ref. Use it for an identity that changes infrastructure in an environment with
  no approval to pass; in this repository that is dev's deployer and catalog
  importer, both on `refs/heads/main`.

- `service_account_environments` binds on the OIDC subject of a job that
  declared a GitHub Environment, so only a job that satisfied that
  environment's protection rules can assume the account. A ref pin cannot
  express this: every job on the pinned branch satisfies it whether or not it
  went through the gate, so a ref-pinned account can be reached by any workflow
  on that branch without an approval being spent. Use it for identities whose
  use has to be approved.

  This binds the subject rather than a mapped attribute, because
  `google.subject` is already `assertion.sub`, so the provider is untouched and
  no existing binding changes. Mapping an attribute from
  `assertion.environment` would mean a CEL expression over a claim that is
  absent for every job without an environment, on the provider every other
  identity here shares.

  It needs `subject_prefix`, because the subject is only
  `repo:<owner>/<repo>:environment:<name>` when the repository uses the default
  subject claim. With immutable subject claims the prefix carries numeric owner
  and repository ids instead. Read it rather than composing it:

  ```bash
  gh api repos/<owner>/<repo>/actions/oidc/customization/sub
  ```

  A binding built from the wrong form never matches, and the deploy fails at the
  token exchange rather than anywhere useful.

  **It does not constrain the branch.** GitHub's subject carries one context
  segment, so an environment-scoped `sub` has no `ref` component: this binding
  says "a job that declared this environment", not "on this branch". Moving an
  account from `service_account_refs` to here therefore trades a branch
  constraint for an approval constraint rather than adding one. If both matter,
  constrain the branch elsewhere: a guard in the workflow, and the
  environment's own deployment branch policy.

An account in more than one of the three would get the wider binding as well as
the narrower one, so validations reject that. `service_account_environments`
without `subject_prefix` is rejected too, since the member would be composed
from a null and silently match nobody.

The provider resource name uses the project number, not the ID, which is why
both are inputs.

## Inputs

| Name                           | Description                                                                         | Default  |
| ------------------------------ | ----------------------------------------------------------------------------------- | -------- |
| `project_id`                   | Project that owns the pool.                                                         | required |
| `project_number`               | Project number, used in the provider resource name.                                 | required |
| `repository`                   | GitHub repository allowed to mint tokens, as `owner/name`.                          | required |
| `repository_id`                | Numeric GitHub repository id (`gh api repos/<owner>/<name> --jq .id`), digits only. | required |
| `pool_id`                      | Workload identity pool ID.                                                          | `github` |
| `provider_id`                  | Workload identity pool provider ID.                                                 | `github` |
| `service_account_emails`       | Accounts any workflow in the repository may impersonate.                            | `[]`     |
| `service_account_refs`         | Map of account email to the one git ref it may be impersonated from.                | `{}`     |
| `subject_prefix`               | This repository's OIDC subject prefix, required by `service_account_environments`.  | `null`   |
| `service_account_environments` | Map of account email to the GitHub Environment it may be impersonated from.         | `{}`     |

## Outputs

| Name            | Description                                                                     |
| --------------- | ------------------------------------------------------------------------------- |
| `provider_name` | Fully qualified provider name, passed verbatim to `google-github-actions/auth`. |
| `pool_name`     | Pool resource name.                                                             |
