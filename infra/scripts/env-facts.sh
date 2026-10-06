#!/usr/bin/env bash
# Prints what a deploy workflow needs to know about one environment, read from
# that environment's own live/<env>/env.hcl and region.hcl.
#
# The point is that a workflow never carries a project id, a project number or a
# service account address of its own. Those are declared once for Terragrunt and
# read back here, so a workflow cannot deploy to one project while Terragrunt
# writes state for another. Adding an environment needs no workflow edit.
#
# Output is KEY=VALUE lines, one per line, safe to append to $GITHUB_OUTPUT or
# to read with `while IFS='=' read -r k v`.
#
# usage: env-facts.sh ENV
set -euo pipefail

ENV_NAME="${1:?usage: env-facts.sh ENV}"
HERE="$(cd "$(dirname "$0")" && pwd)"
LIVE="$HERE/../live"
ENV_FILE="$LIVE/${ENV_NAME}/env.hcl"

# The account ids and the repository name are repository-wide constants: every
# environment uses the same ones, and they are declared for Terragrunt in
# live/_envcommon. tests/test-env-facts.sh asserts these three still match what
# _envcommon declares, so a rename there cannot silently desync this script.
DEPLOYER_ACCOUNT_ID="gecx-shop-deploy"
PLANNER_ACCOUNT_ID="gecx-shop-plan"
CATALOG_ACCOUNT_ID="gecx-shop-catalog"
REGISTRY_NAME="gecx-shopping-agent-demo"

if [ ! -f "$ENV_FILE" ]; then
  echo "no such environment '${ENV_NAME}': ${ENV_FILE} does not exist" >&2
  exit 1
fi

# Reads one `name = "value"` local out of an HCL file into REPLY. The match is
# anchored to the whole line so a commented-out or interpolated occurrence
# cannot win, and the caller pins the value charset so a malformed file fails
# here rather than downstream inside a gcloud or terragrunt argument.
#
# This sets REPLY instead of echoing because a failure inside a command
# substitution would only exit the subshell, and the caller would carry on with
# an empty value.
REPLY=""
read_hcl_local() {
  local file="$1" key="$2" pattern="$3"
  REPLY="$(sed -n "s|^[[:space:]]*${key}[[:space:]]*=[[:space:]]*\"\(${pattern}\)\"[[:space:]]*\$|\1|p" "$file" | head -1)"
  if [ -z "$REPLY" ]; then
    echo "${file} has no usable '${key}'" >&2
    return 1
  fi
}

read_hcl_local "$ENV_FILE" project_id '[a-z][a-z0-9-]*' || exit 1
project_id="$REPLY"

read_hcl_local "$ENV_FILE" project_number '[0-9][0-9]*' || exit 1
project_number="$REPLY"

# The region comes from the one region.hcl under the environment rather than
# being spelled again here. More than one means this script needs a region
# argument, so say so instead of picking one.
mapfile -t region_files < <(find "$LIVE/${ENV_NAME}" -mindepth 2 -maxdepth 2 -name region.hcl | sort)
if [ "${#region_files[@]}" -ne 1 ]; then
  echo "expected exactly one region.hcl under live/${ENV_NAME}, found ${#region_files[@]}" >&2
  exit 1
fi

read_hcl_local "${region_files[0]}" region '[a-z][a-z0-9-]*' || exit 1
region="$REPLY"

cat <<FACTS
project_id=${project_id}
project_number=${project_number}
region=${region}
wif_provider=projects/${project_number}/locations/global/workloadIdentityPools/github/providers/github
deployer_sa=${DEPLOYER_ACCOUNT_ID}@${project_id}.iam.gserviceaccount.com
planner_sa=${PLANNER_ACCOUNT_ID}@${project_id}.iam.gserviceaccount.com
catalog_sa=${CATALOG_ACCOUNT_ID}@${project_id}.iam.gserviceaccount.com
image_repo=${region}-docker.pkg.dev/${project_id}/${REGISTRY_NAME}/app
service_name=${REGISTRY_NAME}
FACTS
