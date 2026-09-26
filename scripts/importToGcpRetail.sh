#!/usr/bin/env bash
# ==============================================================================
# ONIX APPAREL - Vertex AI Search for Retail Catalog Ingestion Script
# For Google Forward Deployment Engineers (FDEs) & DevOps
# ==============================================================================

set -euo pipefail

# Configuration variables (override via environment or arguments)
PROJECT_ID="${1:-${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}}"
LOCATION="${2:-${GCP_LOCATION:-global}}"
CATALOG_ID="${3:-${GCP_CATALOG_ID:-default_catalog}}"
BRANCH_ID="${4:-default_branch}"
CATALOG_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/vertex-retail-catalog.json"

echo "============================================================"
echo "🛍️  ONIX APPAREL - Vertex AI Retail Catalog Ingestion"
echo "============================================================"
echo "Project ID:       ${PROJECT_ID}"
echo "Location:         ${LOCATION}"
echo "Catalog ID:       ${CATALOG_ID}"
echo "Branch ID:        ${BRANCH_ID}"
echo "Local Catalog:    ${CATALOG_FILE}"
echo "============================================================"

if [ -z "${PROJECT_ID}" ] || [ "${PROJECT_ID}" = "(unset)" ]; then
  echo "❌ Error: Google Cloud Project ID is not set."
  echo "   Usage: ./scripts/importToGcpRetail.sh <PROJECT_ID> [LOCATION] [CATALOG_ID] [BRANCH_ID]"
  echo "   Or set: export GCP_PROJECT_ID=your-project-id"
  exit 1
fi

if [ ! -f "${CATALOG_FILE}" ]; then
  echo "❌ Error: Catalog file not found at ${CATALOG_FILE}"
  exit 1
fi

# 1. Enable Vertex AI Retail API
echo ""
echo "⚙️  1. Ensuring Retail API is enabled..."
gcloud services enable retail.googleapis.com --project="${PROJECT_ID}"

# 2. Check or create Cloud Storage staging bucket
BUCKET_NAME="gs://${PROJECT_ID}-retail-catalog-staging"
echo ""
echo "📦 2. Verifying staging GCS bucket: ${BUCKET_NAME}..."
if ! gsutil ls -b "${BUCKET_NAME}" >/dev/null 2>&1; then
  echo "   Creating bucket ${BUCKET_NAME}..."
  gsutil mb -p "${PROJECT_ID}" -l "${LOCATION === 'global' ? 'us-central1' : LOCATION}" "${BUCKET_NAME}" || true
fi

# 3. Upload catalog JSON to GCS
REMOTE_URI="${BUCKET_NAME}/vertex-retail-catalog.json"
echo ""
echo "⬆️  3. Uploading catalog to ${REMOTE_URI}..."
gsutil cp "${CATALOG_FILE}" "${REMOTE_URI}"

# 4. Trigger Retail Product Import
echo ""
echo "🚀 4. Triggering Vertex AI Retail import job..."
PARENT="projects/${PROJECT_ID}/locations/${LOCATION}/catalogs/${CATALOG_ID}/branches/${BRANCH_ID}"

IMPORT_PAYLOAD=$(cat <<EOF
{
  "inputConfig": {
    "gcsSource": {
      "inputUris": ["${REMOTE_URI}"],
      "dataSchema": "product"
    }
  },
  "reconciliationMode": "INCREMENTAL"
}
EOF
)

TOKEN=$(gcloud auth print-access-token)

RESPONSE=$(curl -s -X POST \
  "https://retail.googleapis.com/v2/${PARENT}/products:import" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "X-Goog-User-Project: ${PROJECT_ID}" \
  -d "${IMPORT_PAYLOAD}")

echo "Response from Retail API:"
echo "${RESPONSE}" | jq . 2>/dev/null || echo "${RESPONSE}"

echo ""
echo "✅ Catalog import operation initiated successfully!"
echo "   Monitor progress at: https://console.cloud.google.com/ai/retail/catalogs?project=${PROJECT_ID}"
