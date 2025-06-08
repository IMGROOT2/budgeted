set -euo pipefail

FUNCTION_NAME="generateBudget"
REGION="us-central1"
RUNTIME="nodejs20"    
ENTRY_POINT="generateBudget"


GOOGLE_GENAI_API_KEY=$(grep ^GOOGLE_GENAI_API_KEY .env | cut -d'=' -f2-)

echo "Deploying Cloud Function $FUNCTION_NAME to $REGION..."

gcloud functions deploy "$FUNCTION_NAME" \
  --gen2 \
  --region "$REGION" \
  --runtime "$RUNTIME" \
  --entry-point "$ENTRY_POINT" \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_GENAI_API_KEY=$GOOGLE_GENAI_API_KEY"

echo "Done. Function $FUNCTION_NAME deployed successfully."
