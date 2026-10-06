# _envcommon

One file per stack, holding everything about that stack that does not vary by
environment: the module source, the dependency wiring, and the inputs. The
leaves under `live/<env>/` are includes with no body of their own.

Terragrunt evaluates an included file in the context of the leaf that includes
it, which is what makes this work:

- `find_in_parent_folders("env.hcl")` finds the including leaf's environment, so
  `local.env_vars.locals.project_id` is that environment's project.
- A relative `dependency.config_path` resolves against the leaf's directory, so
  `"../project-services"` means `live/<env>/global/project-services`.

Anything that genuinely differs between environments belongs in
`live/<env>/env.hcl` under `env_inputs`, read from here. Adding an environment
is then a new `env.hcl`, a state bucket, and a set of include-only leaves.
