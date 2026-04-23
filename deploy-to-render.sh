#!/bin/bash
# Deploy Bhubezi to Render using Blueprint

set -e

# Get the Render API key from environment
RENDER_API_KEY="${RENDER_API_KEY}"

if [ -z "$RENDER_API_KEY" ]; then
    echo "Error: RENDER_API_KEY not set"
    exit 1
fi

echo "Deploying Bhubezi to Render..."

# Create the blueprint deployment
response=$(curl -s -X POST \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    https://api.render.com/v1/blueprints \
    -d "{
        \"repo\": \"https://github.com/youngstunners88/Bhubezi\",
        \"branch\": \"main\",
        \"name\": \"bhubezi\",
        \"ownerId\": \"usr-xxx\"
    }")

echo "Response: $response"
