#!/bin/bash

##############################################
# SwasthFirst Frontend - Cloud Run Deployment
##############################################

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SERVICE_NAME="swasthfirst-frontend"
REGION="us-central1"
MEMORY="512Mi"
CPU="1"
TIMEOUT="300"
CONTAINER_PORT="80"

# Default values
PROJECT_ID=""
BACKEND_URL=""
IMAGE_NAME=""

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[ℹ]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to show usage
usage() {
    echo "Usage: ./deploy.sh --project PROJECT_ID --backend BACKEND_URL [options]"
    echo ""
    echo "Required:"
    echo "  --project PROJECT_ID       GCP Project ID"
    echo "  --backend BACKEND_URL      Backend service URL (e.g., https://backend-xyz.run.app)"
    echo ""
    echo "Optional:"
    echo "  --region REGION            GCP Region (default: us-central1)"
    echo "  --container-port PORT      Container port to listen on (default: 80)"
    echo "  --memory MEMORY            Memory allocation (default: 512Mi)"
    echo "  --help                     Show this help message"
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --backend)
            BACKEND_URL="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --container-port)
            CONTAINER_PORT="$2"
            shift 2
            ;;
        --memory)
            MEMORY="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate required arguments
if [ -z "$PROJECT_ID" ]; then
    print_error "Missing required argument: --project"
    usage
fi

if [ -z "$BACKEND_URL" ]; then
    print_error "Missing required argument: --backend"
    echo "Once your backend is deployed, use its URL (e.g., https://backend-xyz.run.app)"
    usage
fi

# Set image name
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  SwasthFirst Frontend Cloud Run Deploy ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Step 1: Validate gcloud setup
print_info "Step 1/5: Validating GCP setup..."

if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI not found. Please install it first."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    print_error "Docker not found. Please install Docker first."
    exit 1
fi

print_status "gcloud and docker are installed"

# Step 2: Authenticate and set project
print_info "Step 2/5: Setting up GCP project..."

gcloud config set project ${PROJECT_ID} 2>/dev/null
print_status "GCP project set to: ${PROJECT_ID}"

# Step 3 & 4: Build and Push Docker image using Cloud Build
print_info "Step 3-4/5: Building and Pushing image via Cloud Build (2-3 minutes)..."
print_info "Image: ${IMAGE_NAMgcloud builds submit . \
    --config=cloudbuild.yaml \
    --substitutions=_SERVICE_NAME=${SERVICE_NAME},_REACT_APP_API_URL="${BACKEND_URL}/api/v1" || {
    print_error "Cloud Build failed"
    exit 1
}

print_status "Image built and pushed successfully via Cloud Build"

# Step 5: Deploy to Cloud Run
print_info "Step 5/5: Deploying to Cloud Run (2-3 minutes)..."

gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME}:latest \
    --platform managed \
    --region ${REGION} \
    --memory ${MEMORY} \
    --cpu ${CPU} \
    --timeout ${TIMEOUT} \
    --port ${CONTAINER_PORT} \
    --allow-unauthenticated \
    || {
    exit 1
}

print_status "Deployment completed successfully!"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║        Deployment Complete! ✓          ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --format 'value(status.url)')

echo "📍 Frontend URL: ${SERVICE_URL}"
echo "⚙️  Backend URL: ${BACKEND_URL}"
echo ""

# Step 6: Verify deployment
print_info "Verifying deployment (checking health endpoint)..."

sleep 5  # Wait for service to be fully ready

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}")

if [ "${HEALTH_CHECK}" == "200" ]; then
    print_status "Frontend is healthy and accessible!"
    echo ""
    echo "🎉 Your SwasthFirst Frontend is live!"
    echo "   URL: ${SERVICE_URL}"
    echo "   Connected to Backend: ${BACKEND_URL}"
else
    print_error "Health check returned status ${HEALTH_CHECK}"
    echo "The frontend may still be initializing. Check again in a few seconds."
fi

echo ""
echo "📋 Next Steps:"
echo "   1. Update backend CORS configuration:"
echo "      Add this to your backend .env.production:"
echo "      CORS_ORIGINS=${SERVICE_URL}"
echo ""
echo "   2. Test the application:"
echo "      Open ${SERVICE_URL} in your browser"
echo ""
echo "   3. Monitor logs:"
echo "      gcloud run logs read ${SERVICE_NAME} --region=${REGION} --limit=50"
echo ""
