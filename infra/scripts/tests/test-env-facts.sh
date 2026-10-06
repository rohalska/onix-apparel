#!/usr/bin/env bash
# Offline. Asserts env-facts.sh agrees with the HCL it claims to read, and that
# it refuses input it cannot vouch for.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
FACTS="$HERE/../env-facts.sh"
LIVE="$HERE/../../live"

failures=0
fail() { echo "FAIL: $*" >&2; failures=$((failures + 1)); }

fact() { # fact ENV KEY -> value
  "$FACTS" "$1" | sed -n "s/^$2=//p"
}

# Every environment with an env.hcl must be describable, so adding one cannot
# leave the deploy workflow unable to resolve it.
mapfile -t envs < <(find "$LIVE" -mindepth 2 -maxdepth 2 -name env.hcl -printf '%h\n' | xargs -n1 basename | sort)
[ "${#envs[@]}" -ge 2 ] || fail "expected at least dev and prd under live/, found: ${envs[*]}"

for env in "${envs[@]}"; do
  if ! out="$("$FACTS" "$env" 2>&1)"; then
    fail "env-facts.sh $env exited non-zero: $out"
    continue
  fi

  # The project id and number must be the ones env.hcl declares, not a copy.
  want_id="$(sed -n 's|^[[:space:]]*project_id[[:space:]]*=[[:space:]]*"\([^"]*\)".*|\1|p' "$LIVE/$env/env.hcl" | head -1)"
  want_num="$(sed -n 's|^[[:space:]]*project_number[[:space:]]*=[[:space:]]*"\([^"]*\)".*|\1|p' "$LIVE/$env/env.hcl" | head -1)"
  got_id="$(echo "$out" | sed -n 's/^project_id=//p')"
  got_num="$(echo "$out" | sed -n 's/^project_number=//p')"
  [ -n "$want_id" ] || fail "$env: could not read project_id out of env.hcl to compare against"
  [ "$got_id" = "$want_id" ] || fail "$env: project_id is '$got_id', env.hcl says '$want_id'"
  [ "$got_num" = "$want_num" ] || fail "$env: project_number is '$got_num', env.hcl says '$want_num'"

  # The WIF provider the workflow authenticates with must name the same project
  # number the wif-github stack builds its principalSet from.
  want_provider="projects/${want_num}/locations/global/workloadIdentityPools/github/providers/github"
  got_provider="$(echo "$out" | sed -n 's/^wif_provider=//p')"
  [ "$got_provider" = "$want_provider" ] || fail "$env: wif_provider is '$got_provider', expected '$want_provider'"

  # Each service account address must be that environment's project.
  for key in deployer_sa planner_sa catalog_sa; do
    got="$(echo "$out" | sed -n "s/^$key=//p")"
    case "$got" in
      *"@${want_id}.iam.gserviceaccount.com") ;;
      *) fail "$env: $key is '$got', which is not an account in ${want_id}" ;;
    esac
  done
done

# The account ids are duplicated between env-facts.sh and live/_envcommon
# because the workflow cannot parse Terragrunt. Assert the two still agree, so a
# rename in _envcommon fails here instead of at deploy time.
for pair in "iam-deployer:deployer_sa" "iam-planner:planner_sa" "iam-catalog:catalog_sa"; do
  stack="${pair%%:*}"
  key="${pair##*:}"
  declared="$(sed -n 's|^[[:space:]]*account_id[[:space:]]*=[[:space:]]*"\([^"]*\)".*|\1|p' "$LIVE/_envcommon/${stack}.hcl" | head -1)"
  [ -n "$declared" ] || { fail "could not read account_id from _envcommon/${stack}.hcl"; continue; }
  got="$(fact dev "$key")"
  case "$got" in
    "${declared}@"*) ;;
    *) fail "_envcommon/${stack}.hcl declares account_id '${declared}' but env-facts.sh reports ${key}='${got}'" ;;
  esac
done

# The image repository must name the registry the artifact-registry stack
# creates, in the region region.hcl declares.
reg_name="$(sed -n 's|^[[:space:]]*name[[:space:]]*=[[:space:]]*"\([^"]*\)".*|\1|p' "$LIVE/_envcommon/artifact-registry.hcl" | head -1)"
[ -n "$reg_name" ] || fail "could not read the repository name from _envcommon/artifact-registry.hcl"
got_repo="$(fact dev image_repo)"
got_region="$(fact dev region)"
[ "$got_repo" = "${got_region}-docker.pkg.dev/$(fact dev project_id)/${reg_name}/app" ] \
  || fail "image_repo is '$got_repo', which does not match registry '${reg_name}' in '${got_region}'"

# An unknown environment must fail rather than emit a half-built fact set that
# would send a deploy at the wrong project.
if "$FACTS" definitely-not-an-env >/dev/null 2>&1; then
  fail "env-facts.sh accepted an environment that has no env.hcl"
fi
if "$FACTS" >/dev/null 2>&1; then
  fail "env-facts.sh accepted a missing environment argument"
fi

if [ "$failures" -ne 0 ]; then
  echo "$failures assertion(s) failed" >&2
  exit 1
fi
echo "PASS"
