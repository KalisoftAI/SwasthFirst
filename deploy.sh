#!/bin/bash

# ===========================================
# GCP Cloud Run Deployment Script
# Single Instance: Backend + Frontend
# Database: Neon PostgreSQL
# ===========================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Swasth Cafe - GCP Cloud Run Deploy${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Configuration
PROJECT_ID="${GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="swasth-order-agent"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
IMAGE_TAG="latest"

# Neon Database Config
NEON_DATABASE_URL="${DATABASE_URL}"

# Validate required environment variables
if [ -z "$GCP_PROJECT_ID" ]; then
    echo -e "${RED}❌ Error: GCP_PROJECT_ID not set${NC}"
    echo -e "${YELLOW}Usage: GCP_PROJECT_ID=my-project GCP_REGION=us-central1 DATABASE_URL=postgres://... ./deploy.sh${NC}"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL not set${NC}"
    echo -e "${YELLOW}Get your Neon connection string from: https://console.neon.tech${NC}"
    exit 1
fi

echo -e "${BLUE}Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service: $SERVICE_NAME"
echo "  Image: $IMAGE_NAME:$IMAGE_TAG"
echo ""

# Step 1: Authenticate with GCP
echo -e "${YELLOW}Step 1: Authenticating with GCP...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}  No active account. Please authenticate...${NC}"
    gcloud auth login
fi
gcloud config set project $PROJECT_ID
echo -e "${GREEN}  ✅ Authentication successful${NC}\n"

# Step 2: Build Docker image
echo -e "${YELLOW}Step 2: Building Docker image...${NC}"
docker build \
    --tag "$IMAGE_NAME:$IMAGE_TAG" \
    --tag "$IMAGE_NAME:$(date +%Y%m%d-%H%M%S)" \
    --build-arg NODE_ENV=production \
    .

if [ $? -ne 0 ]; then
    echo -e "${RED}  ❌ Docker build failed${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ Docker image built successfully${NC}\n"

# Step 3: Configure Docker to use gcloud as credential helper
echo -e "${YELLOW}Step 3: Configuring Docker authentication...${NC}"
gcloud auth configure-docker gcr.io --quiet
echo -e "${GREEN}  ✅ Docker authentication configured${NC}\n"

# Step 4: Push image to GCR
echo -e "${YELLOW}Step 4: Pushing image to Google Container Registry...${NC}"
docker push "$IMAGE_NAME:$IMAGE_TAG"
if [ $? -ne 0 ]; then
    echo -e "${RED}  ❌ Docker push failed${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ Image pushed to GCR${NC}\n"

# Step 5: Deploy to Cloud Run
echo -e "${YELLOW}Step 5: Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image "$IMAGE_NAME:$IMAGE_TAG" \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars "DATABASE_URL=$NEON_DATABASE_URL,NODE_ENV=production,PORT=8080" \
    --memory 1Gi \
    --cpu 1 \
    --timeout 3600 \
    --max-instances 100 \
    --min-instances 1 \
    --no-gen2

if [ $? -ne 0 ]; then
    echo -e "${RED}  ❌ Cloud Run deployment failed${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ Deployment successful${NC}\n"

# Step 6: Get service URL
echo -e "${YELLOW}Step 6: Retrieving service URL...${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --format 'value(status.url)')

echo -e "${GREEN}  ✅ Service deployed and running${NC}\n"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}\n"
echo -e "${GREEN}Your application is now live!${NC}"
echo -e "  URL: ${GREEN}${SERVICE_URL}${NC}"
echo -e "  Dashboard: ${GREEN}${SERVICE_URL}${NC}"
echo -e "  Backend API: ${GREEN}${SERVICE_URL}/api${NC}\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Update FRONTEND_URL and BACKEND_URL in environment:"
echo "     gcloud run services update $SERVICE_NAME --set-env-vars FRONTEND_URL=${SERVICE_URL},BACKEND_URL=${SERVICE_URL}"
echo "  2. Test the application by visiting the URL above"
echo "  3. Scan WhatsApp QR code in the dashboard"
echo "  4. Monitor logs: gcloud run logs read $SERVICE_NAME --region $REGION --limit 100"
echo ""

# Optional: Show logs
read -p "View deployment logs now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Fetching recent logs...${NC}\n"
    gcloud run logs read $SERVICE_NAME --region $REGION --limit 50
fi

echo -e "${GREEN}✅ Deployment script completed!${NC}\n"
