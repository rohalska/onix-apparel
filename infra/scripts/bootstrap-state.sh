#!/usr/bin/env bash
# Creates the OpenTofu state bucket for one project, and enables the APIs that
# Workload Identity Federation needs before any stack can manage it.
#
# Deliberately not a Terragrunt stack: a stack cannot hold the bucket its own
# state lives in without a local-state apply and a hand migration. This runs
# once per environment and is safe to re-run.
set -euo pipefail

PROJECT="${1:?usage: bootstrap-state.sh PROJECT_ID}"
BUCKET="tfstate-${PROJECT}"
LOCATION="us"

echo "==> Enabling APIs required before anything can be managed"
gcloud services enable \
  sts.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iamcredentials.googleapis.com \
  --project "$PROJECT"

if gcloud storage buckets describe "gs://${BUCKET}" --project "$PROJECT" >/dev/null 2>&1; then
  echo "==> gs://${BUCKET} already exists, reconciling settings"
else
  echo "==> Creating gs://${BUCKET}"
  gcloud storage buckets create "gs://${BUCKET}" \
    --project "$PROJECT" \
    --location "$LOCATION" \
    --uniform-bucket-level-access \
    --public-access-prevention
fi

# Applied on every run so a bucket created by hand converges to the same state.
echo "==> Enforcing versioning and access policy"
gcloud storage buckets update "gs://${BUCKET}" \
  --project "$PROJECT" \
  --versioning \
  --uniform-bucket-level-access \
  --public-access-prevention

echo "==> Applying the 90-day noncurrent-version lifecycle rule"
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
cat > "$tmp" <<'JSON'
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": { "daysSinceNoncurrentTime": 90, "isLive": false }
    }
  ]
}
JSON
gcloud storage buckets update "gs://${BUCKET}" --project "$PROJECT" --lifecycle-file="$tmp"

echo "==> Done. State bucket: gs://${BUCKET}"
