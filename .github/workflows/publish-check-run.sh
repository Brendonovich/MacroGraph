#!/bin/bash
set -e

IMAGE_NAME="$1"
SHORT_SHA="$2"
REPO="$3"
TOKEN="$4"
SHA="$5"

SUMMARY="## Docker Image Published

The Docker image for this PR has been built and published to GitHub Container Registry.

### Image Details

- **Registry**: GitHub Container Registry (ghcr.io)
- **Repository**: ${IMAGE_NAME}
- **Image SHA**: \`${SHORT_SHA}\`

### Using this Image

To pull this image, use:

\`\`\`
docker pull ${IMAGE_NAME}:${SHORT_SHA}
\`\`\`

This SHA can be used to reference this specific build in deployments or other workflows."

jq -n \
  --arg name "Docker Image" \
  --arg head_sha "$SHA" \
  --arg title "Docker Image Built" \
  --arg summary "Docker image published with SHA: ${SHORT_SHA}" \
  --arg text "$SUMMARY" \
  '{
    name: $name,
    head_sha: $head_sha,
    status: "completed",
    conclusion: "success",
    output: {
      title: $title,
      summary: $summary,
      text: $text
    }
  }' | curl -s -X POST "https://api.github.com/repos/${REPO}/check-runs" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  --data @-
