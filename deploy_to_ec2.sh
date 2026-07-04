#!/bin/bash
scp -i /home/atharv/Downloads/RepoGod.pem docker-compose.prod.yml deploy.sh ubuntu@35.154.155.41:~/.
ssh -i /home/atharv/Downloads/RepoGod.pem ubuntu@35.154.155.41 << 'REMOTE_COMMANDS'
  chmod +x deploy.sh
  # Run deploy.sh, make sure to pass the required tokens via env!
  # e.g., GHCR_TOKEN=your_token ./deploy.sh
REMOTE_COMMANDS
