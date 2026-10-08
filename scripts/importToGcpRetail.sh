#!/usr/bin/env bash
# ==============================================================================
# ONIX WARES - Vertex AI Search for Retail Catalog Ingestion Script
# For Google Forward Deployment Engineers (FDEs) & DevOps
# ==============================================================================

set -euo pipefail

# Configuration variables (override via environment or arguments)
PROJECT_ID="${1:-${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}}"
LOCATION="${2:-${GCP_LOCATION:-global}}"
CATALOG_ID="${3:-${GCP_CATALOG_ID:-default_catalog}}"
BRANCH_ID="${4:-default_branch}"
CATALOG_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/vertex-retail-catalog.jsonl"

echo "============================================================"
echo "🛍️  ONIX WARES - Vertex AI Retail Catalog Ingestion"
echo "============================================================"
echo "Project ID:       ${PROJECT_ID}"
echo "Location:         ${LOCATION}"
echo "Catalog ID:       ${CATALOG_ID}"
echo "Branch ID:        ${BRANCH_ID}"
echo "Local Catalog:    ${CATALOG_FILE}"
echo "============================================================"

if [ -z "${PROJECT_ID}" ] || [ "${PROJECT_ID}" = "(unset)" ]; then
  echo "❌ Error: Google Cloud Project ID is not set." >&2
  echo "   Usage: ./scripts/importToGcpRetail.sh <PROJECT_ID> [LOCATION] [CATALOG_ID] [BRANCH_ID]" >&2
  echo "   Or set: export GCP_PROJECT_ID=your-project-id" >&2
  exit 1
fi

if [ ! -f "${CATALOG_FILE}" ]; then
  echo "❌ Error: Catalog file not found at ${CATALOG_FILE}" >&2
  exit 1
fi

# 1. The Retail API is enabled by infra/live/<env>/global/project-services, which
# owns API enablement. The catalog identity cannot enable services.

# 2. Verify the Cloud Storage staging bucket exists
# The bucket is managed by OpenTofu, not created here, so its access settings
# and the catalog identity's bucket-scoped grant stay under review.
BUCKET_NAME="gs://${PROJECT_ID}-retail-catalog-staging"
echo ""
echo "📦 2. Verifying staging GCS bucket: ${BUCKET_NAME}..."
if ! gcloud storage buckets describe "${BUCKET_NAME}" >/dev/null 2>&1; then
  echo "❌ Staging bucket ${BUCKET_NAME} does not exist or is not readable." >&2
  echo "   It is managed in infra/live/<env>/us-central1/catalog-staging and must be applied first." >&2
  exit 1
fi

# 3. Upload catalog JSONL to GCS
REMOTE_URI="${BUCKET_NAME}/vertex-retail-catalog.jsonl"
echo ""
echo "⬆️  3. Uploading catalog to ${REMOTE_URI}..."
gcloud storage cp "${CATALOG_FILE}" "${REMOTE_URI}"

# 4. Trigger Retail Product Import
echo ""
echo "🚀 4. Triggering Vertex AI Retail import job..."
PARENT="projects/${PROJECT_ID}/locations/${LOCATION}/catalogs/${CATALOG_ID}/branches/${BRANCH_ID}"

  ERRORS_PREFIX="${BUCKET_NAME}/errors"

  IMPORT_PAYLOAD=$(cat <<EOF
{
  "inputConfig": {
    "gcsSource": {
      "inputUris": ["${REMOTE_URI}"],
      "dataSchema": "product"
    }
  },
  "errorsConfig": {
    "gcsPrefix": "${ERRORS_PREFIX}"
  },
  "reconciliationMode": "INCREMENTAL"
}
EOF
)

  TOKEN=$(gcloud auth print-access-token)

  if ! RESPONSE=$(curl -sS --fail-with-body -X POST \
    "https://retail.googleapis.com/v2/${PARENT}/products:import" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json; charset=utf-8" \
    -H "X-Goog-User-Project: ${PROJECT_ID}" \
    -d "${IMPORT_PAYLOAD}"); then
    echo "❌ Error: Failed to trigger Retail product import." >&2
    exit 1
  fi

  echo "Response from Retail API:"
  echo "${RESPONSE}" | jq . 2>/dev/null || echo "${RESPONSE}"

if command -v jq >/dev/null 2>&1; then
  OPERATION_NAME=$(echo "${RESPONSE}" | jq -r '.name // empty')
else
  OPERATION_NAME=$(echo "${RESPONSE}" | grep -o '"name": *"[^"]*"' | head -n 1 | cut -d '"' -f 4 || true)
fi

if [ -z "${OPERATION_NAME}" ]; then
  echo "❌ Error: Operation name not found in API response." >&2
  exit 1
fi

# 5. Poll the returned operation
POLL_TIMEOUT_SECS="${POLL_TIMEOUT_SECS:-300}"
POLL_INTERVAL_SECS="${POLL_INTERVAL_SECS:-5}"
ELAPSED=0

echo ""
echo "⏳ 5. Polling operation until completion (timeout: ${POLL_TIMEOUT_SECS}s): ${OPERATION_NAME}..."

while [ "${ELAPSED}" -lt "${POLL_TIMEOUT_SECS}" ]; do
  if ! OP_STATUS=$(curl -sS --fail-with-body \
    "https://retail.googleapis.com/v2/${OPERATION_NAME}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "X-Goog-User-Project: ${PROJECT_ID}"); then
    echo "❌ Error: Failed to fetch operation status." >&2
    exit 1
  fi

  if command -v jq >/dev/null 2>&1; then
    IS_DONE=$(echo "${OP_STATUS}" | jq -r '.done // false')
    HAS_ERROR=$(echo "${OP_STATUS}" | jq -r '.error // empty')
  else
    if echo "${OP_STATUS}" | grep -q '"done": *true'; then
      IS_DONE="true"
    else
      IS_DONE="false"
    fi
    if echo "${OP_STATUS}" | grep -q '"error":'; then
      HAS_ERROR="true"
    else
      HAS_ERROR=""
    fi
  fi

  if [ "${IS_DONE}" = "true" ]; then
    if [ -n "${HAS_ERROR}" ]; then
      echo "❌ Catalog import operation failed with error:" >&2
      echo "${OP_STATUS}" | jq .error 2>/dev/null || echo "${OP_STATUS}" >&2
      exit 1
    fi

    echo ""
    echo "✅ Catalog import operation completed successfully!"
    if command -v jq >/dev/null 2>&1; then
      echo "${OP_STATUS}" | jq '.response // .metadata // .' 2>/dev/null || true
    fi
    echo ""
    echo "   Monitor catalog status at: https://console.cloud.google.com/ai/retail/catalogs?project=${PROJECT_ID}"
    exit 0
  fi

  sleep "${POLL_INTERVAL_SECS}"
  ELAPSED=$(( ELAPSED + POLL_INTERVAL_SECS ))
  echo "   Import operation in progress... (${ELAPSED}s / ${POLL_TIMEOUT_SECS}s elapsed, checking again in ${POLL_INTERVAL_SECS}s)"
done

echo ""
echo "❌ Error: Operation timed out after ${POLL_TIMEOUT_SECS}s without completing." >&2
echo "   Operation Name: ${OPERATION_NAME}" >&2
echo "   Monitor or inspect at: https://console.cloud.google.com/ai/retail/catalogs?project=${PROJECT_ID}" >&2
exit 1
