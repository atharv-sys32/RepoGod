#!/usr/bin/env bash
# Deploy script for RepoGod – pulls pre-built images from GHCR and runs them on EC2

# Exit on any error and treat unset variables as an error
set -euo pipefail

# ----------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------
COMPOSE_FILE="docker-compose.prod.yml"

# ----------------------------------------------------------------------
# Authenticate to GitHub Container Registry (Optional for Public Repos)
# ----------------------------------------------------------------------
if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "Logging in to ghcr.io..."
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR:-}" --password-stdin
else
  echo "No GHCR_TOKEN provided. Assuming the ghcr.io images are public and skipping docker login."
fi

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
