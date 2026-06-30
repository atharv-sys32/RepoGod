#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

if [ "$#" -ne 2 ]; then
    echo "Usage: ./deploy.sh <ec2-user@ec2-public-ip> <path-to-pem-file>"
    echo "Example: ./deploy.sh ubuntu@54.123.45.67 ~/.ssh/my-key.pem"
    exit 1
fi

TARGET=$1
PEM_FILE=$2
PROJECT_DIR=$(pwd)

echo "🚀 Starting deployment to $TARGET..."

# 1. Sync files to EC2 (Excluding node_modules, build folders, etc. via .gitignore)
echo "📦 Syncing project files to EC2..."
rsync -avz --exclude-from='.gitignore' --exclude='.git' -e "ssh -i $PEM_FILE -o StrictHostKeyChecking=no" "$PROJECT_DIR/" "$TARGET:~/RepoGod/"

# 2. SSH into EC2, install Docker if missing, and run Docker Compose
echo "⚙️  Setting up server and starting Docker containers..."
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$TARGET" << 'EOF'
    set -e

    # Install Docker if not present (Targeting Ubuntu/Debian)
    if ! command -v docker &> /dev/null; then
        echo "🐳 Installing Docker..."
        sudo apt-get update -y
        sudo apt-get install -y ca-certificates curl
        sudo install -m 0755 -d /etc/apt/keyrings
        sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
        sudo chmod a+r /etc/apt/keyrings/docker.asc
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
          $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update -y
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

        # Add user to docker group
        sudo usermod -aG docker $USER
    fi

    cd ~/RepoGod

    # Set up .env if it doesn't exist
    if [ ! -f .env ]; then
        echo "📝 Creating .env from .env.example..."
        cp .env.example .env
    fi

    # Start the application using sudo to bypass any immediate docker group permission delays
    echo "🏗️  Building and starting containers..."
    sudo docker compose down
    sudo docker compose up -d --build
EOF

echo ""
echo "✅ Deployment successful!"
echo "⚠️  IMPORTANT: SSH into your EC2 instance and update your API key in the .env file:"
echo "   ssh -i $PEM_FILE $TARGET"
echo "   nano ~/RepoGod/.env"
echo "   sudo docker compose restart backend-fastapi"
echo ""
echo "🌐 Your app should now be accessible at http://$(echo $TARGET | cut -d'@' -f2)"
