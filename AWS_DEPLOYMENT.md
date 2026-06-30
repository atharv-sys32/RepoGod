# AWS EC2 Deployment Guide

Deploying RepoGod to an AWS EC2 instance is fully automated using the provided `deploy.sh` script, which now pulls directly from your GitHub repository.

## Step 1: Launch an EC2 Instance
1. Go to your AWS Console and launch a new EC2 Instance.
2. **OS:** Select **Ubuntu Server 24.04 LTS** (or 22.04 LTS).
3. **Instance Type:** `t3.medium` or higher is recommended (the build process and databases require a bit of RAM).
4. **Key Pair:** Select an existing key pair or create a new one (download the `.pem` file).
5. **Network Settings:**
   - Allow **SSH traffic** from your IP (Port 22).
   - Allow **HTTP traffic** from the internet (Port 80).
6. **Storage:** At least 20 GB of gp3 storage.

## Step 2: Run the Deployment Script
Once the instance is running, note its **Public IPv4 Address**.

From your local machine, run the deploy script:
```bash
./deploy.sh ubuntu@<EC2_PUBLIC_IP> /path/to/your/key.pem
```

*Example:*
```bash
./deploy.sh ubuntu@54.123.45.67 ~/.ssh/aws-key.pem
```

### What the script does:
1. SSHs into the server and installs `git`, `docker`, and `docker-compose` if they aren't already installed.
2. Clones the `RepoGod` repository directly from GitHub (or pulls the latest changes if it already exists).
3. Sets up a default `.env` file from the example template.
4. Builds all images and starts the PostgreSQL, Redis, FastAPI, Spring Boot, and React/Nginx containers.

## Step 3: Add Your Gemini API Key
The application is running, but it needs your Gemini API Key to function.

1. SSH into the server manually:
   ```bash
   ssh -i /path/to/your/key.pem ubuntu@<EC2_PUBLIC_IP>
   ```
2. Edit the `.env` file:
   ```bash
   cd ~/RepoGod
   nano .env
   ```
3. Update the `GOOGLE_API_KEY` value, save, and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).
4. Restart the AI backend so it picks up the key:
   ```bash
   sudo docker compose restart backend-fastapi
   ```

## Step 4: Access RepoGod
Open your browser and navigate to the public IP of your EC2 instance:
`http://<EC2_PUBLIC_IP>`

You can now register an account and start importing repositories!