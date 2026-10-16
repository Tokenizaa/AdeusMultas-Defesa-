#!/bin/bash
set -e

# Read .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Get variables
API_KEY="${NVIDIA_API_KEY}"
MODEL="${NVIDIA_IMAGE_MODEL}"
BASE_URL="${NVIDIA_BASE_URL}"

# Define endpoints
declare -A endpoints
endpoints["a"]="https://ai.api.nvidia.com/v1/genai/<model>"
endpoints["b"]="https://ai.api.nvidia.com/v1/genai/<model>/infer"
endpoints["c"]="https://integrate.api.nvidia.com/v1/images/generations"
endpoints["d"]="https://ai.api.nvidia.com/v1/<model>"
endpoints["e"]="https://ai.api.nvidia.com/v1/<model>/infer"
endpoints["f"]="https://ai.api.nvidia.com/v1/genai/<model>?width=512&height=512"
endpoints["g"]="https://ai.api.nvidia.com/v1/<model>?width=512&height=512"

# We'll loop over the keys a to g
results=()
working=()

for key in a b c d e f g; do
  url="${endpoints[$key]}"

  # Replace <model> if present
  if [[ "$url" == *"<model>"* ]]; then
    url=${url//<model>/$MODEL}
  fi

  # If BASE_URL is set and key is in c d e f g, replace the base
  if [ -n "$BASE_URL" ] && [[ "c d e f g" =~ $key ]]; then
    # Replace the base (protocol and host) with BASE_URL
    url=$(echo $url | sed -E "s|^https://[^/]*|$BASE_URL|")
  fi

  # Make the request
  # We'll use curl with timeout? We'll set a timeout of 10 seconds.
  http_response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{"prompt":"teste","width":512","height":512}' \
    --max-time 10)

  # Extract status and body
  status=$(echo "$http_response" | tail -n1)
  body=$(echo "$http_response" | sed '$d')

  # Get first 200 chars of body
  body_snippet=${body:0:200}

  # Escape for JSON: use jq if available, else fallback
  if command -v jq >/dev/null 2>&1; then
    body_snippet_escaped=$(echo "$body_snippet" | jq -s -R -r @json)
  else
    # Fallback: escape quotes and backslashes, replace newlines and tabs with spaces
    body_snippet_escaped=$(echo "$body_snippet" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | tr '\n\t' '  ')
  fi

  # Record
  results+=("{\"endpoint\":\"$url\",\"status\":$status,\"responseSnippet\":$body_snippet_escaped}")

  # Check if status is not 404
  if [ "$status" != "404" ]; then
    working+=("\"$url\"")
  fi
done

# Join results and working arrays with commas
results_str=$(IFS=,; echo "${results[*]}")
working_str=$(IFS=,; echo "${working[*]}")

# Output JSON
echo "{"
echo "  \"tested\": [$results_str],"
echo "  \"workingEndpoints\": [$working_str]"
echo "}"
