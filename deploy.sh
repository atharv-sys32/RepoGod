#!/usr/bin/env bash
# Deploy script for RepoGod – pulls pre‑built images from GHCR and runs them on EC2

# Exit on any error and treat unset variables as an error
set -euo pipefail

# ----------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------
# The GitHub repository name (e.g., "atharv/RepoGod")
REPO="${GITHUB_REPOSITORY:-repo}"

# Registry where images are pushed
REGISTRY="ghcr.io"

# Docker Compose file (assumes the same file is present on the EC2 instance)
COMPOSE_FILE="docker-compose.yml"

# ----------------------------------------------------------------------
# Authenticate to GitHub Container Registry
# ----------------------------------------------------------------------
# A personal access token with `read:packages` permission must be provided
# as an environment variable GHCR_TOKEN. The token is passed to docker login.
if [[ -z "${GHCR_TOKEN:-}" ]]; then
  echo "Error: GHCR_TOKEN environment variable is not set."
  echo "Provide a PAT with read:packages scope and retry."
  exit 1
fi

echo "Logging in to ${REGISTRY}..."
echo "${GHCR_TOKEN}" | docker login "${REGISTRY}" -u "${GITHUB_ACTOR:-}" --password-stdin

# ----------------------------------------------------------------------
# Pull the latest images
# ----------------------------------------------------------------------
echo "Pulling images..."
docker compose -f "${COMPOSE_FILE}" pull

# ----------------------------------------------------------------------
# Recreate and start the stack
# ----------------------------------------------------------------------
echo "Starting services..."
docker compose -f "${COMPOSE_FILE}" up -d

echo "Deployment completed successfully."