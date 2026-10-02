#!/usr/bin/env bash
# Asserts the bootstrap script is idempotent and leaves the bucket safe.
# Requires an authenticated gcloud with storage.admin on the target project.
set -euo pipefail

PROJECT="${1:?usage: test-bootstrap-state.sh PROJECT_ID}"
BUCKET="tfstate-${PROJECT}"
HERE="$(cd "$(dirname "$0")" && pwd)"

fail() { echo "FAIL: $*" >&2; exit 1; }

# Running twice must succeed: the second run is the one that proves idempotency.
"$HERE/../bootstrap-state.sh" "$PROJECT" || fail "first run exited non-zero"
"$HERE/../bootstrap-state.sh" "$PROJECT" || fail "second run exited non-zero"

versioning=$(gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT" --format="value(versioning_enabled)")
[ "$versioning" = "True" ] || fail "versioning is '$versioning', expected True"

ubla=$(gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT" --format="value(uniform_bucket_level_access)")
[ "$ubla" = "True" ] || fail "uniform bucket-level access is '$ubla', expected True"

pap=$(gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT" --format="value(public_access_prevention)")
[ "$pap" = "enforced" ] || fail "public access prevention is '$pap', expected enforced"

lifecycle=$(gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT" --format="value(lifecycle_config)")
echo "$lifecycle" | grep -q "daysSinceNoncurrentTime.: 90" || fail "no 90-day noncurrent rule found in: $lifecycle"

for api in sts.googleapis.com iam.googleapis.com cloudresourcemanager.googleapis.com; do
  gcloud services list --enabled --project "$PROJECT" --format="value(config.name)" | grep -qx "$api" \
    || fail "$api is not enabled"
done

echo "PASS"
