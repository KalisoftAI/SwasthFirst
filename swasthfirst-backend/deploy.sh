#!/bin/bash

# ============================================
# SwasthFirst API - Cloud Run Deployment Script
# ============================================
# This script automates the deployment to Google Cloud Run
# Prerequisites: gcloud CLI installed and authenticated
# 
# Usage: ./deploy.sh [OPTIONS]
# Example: ./deploy.sh --project my-gcp-project --region us-central1

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# CONFIGURATION
# ============================================

# Default values
PROJECT_ID=""
REGION="us-central1"
SERVICE_NAME="swasthfirst-api"
IMAGE_NAME="swasthfirst-backend"
ENVIRONMENT="production"
MIN_INSTANCES=0
MAX_INSTANCES=100
MEMORY="512Mi"
CPU="1"
TIMEOUT="3600"  # 60 minutes
ALLOW_UNAUTHENTICATED="true"

# ============================================
# HELPER FUNCTIONS
# ============================================

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================
# ARGUMENT PARSING
# ============================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --service)
            SERVICE_NAME="$2"
            shift 2
            ;;
        --min-instances)
            MIN_INSTANCES="$2"
            shift 2
            ;;
        --max-instances)
            MAX_INSTANCES="$2"
            shift 2
            ;;
        --memory)
            MEMORY="$2"
            shift 2
            ;;
        --cpu)
            CPU="$2"
            shift 2
            ;;
        --help)
            cat << EOF
SwasthFirst API - Cloud Run Deployment Script

Usage: ./deploy.sh [OPTIONS]

OPTIONS:
  --project ID              GCP Project ID (required)
  --region REGION          Cloud Run region (default: us-central1)
  --service NAME           Cloud Run service name (default: swasthfirst-api)
  --min-instances NUM      Minimum instances (default: 0)
  --max-instances NUM      Maximum instances (default: 100)
  --memory SIZE            Memory per instance (default: 512Mi)
  --cpu NUM                CPU per instance (default: 1)
  --help                   Show this help message

EXAMPLES:
  # Basic deployment
  ./deploy.sh --project my-gcp-project

  # Deployment with custom settings
  ./deploy.sh --project my-gcp-project --region us-west1 --memory 1Gi --cpu 2

  # Deployment with minimum instances for faster response
  ./deploy.sh --project my-gcp-project --min-instances 1

EOF
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ============================================
# VALIDATION
# ============================================

print_header "Deployment Configuration Validation"

if [ -z "$PROJECT_ID" ]; then
    print_error "Project ID is required. Use --project flag or export PROJECT_ID"
    exit 1
fi

print_success "Project ID: $PROJECT_ID"
print_success "Region: $REGION"
print_success "Service Name: $SERVICE_NAME"
print_success "Memory: $MEMORY"
print_success "CPU: $CPU"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first."
    echo "Download from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

print_success "gcloud CLI found"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install it first."
    echo "Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

print_success "Docker found"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found in current directory"
    echo "Please create it with your Neon database credentials"
    exit 1
fi

print_success ".env.production found"

# ============================================
# SET GCP PROJECT
# ============================================

print_header "Setting GCP Project"

gcloud config set project $PROJECT_ID
print_success "GCP Project set to: $PROJECT_ID"

# ============================================
# ENABLE REQUIRED APIs
# ============================================

print_header "Enabling Required GCP APIs"

REQUIRED_APIS=(
    "run.googleapis.com"
    "build.googleapis.com"
    "sqladmin.googleapis.com"
    "compute.googleapis.com"
    "artifactregistry.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    print_info "Enabling $api..."
    gcloud services enable $api --quiet
    print_success "$api enabled"
done

# ============================================
# BUILD DOCKER IMAGE
# ============================================

print_header "Building Docker Image"

IMAGE_TAG="gcr.io/$PROJECT_ID/$IMAGE_NAME:latest"
print_info "Building image: $IMAGE_TAG"

if docker build -t "$IMAGE_TAG" .; then
    print_success "Docker image built successfully"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# ============================================
# PUSH IMAGE TO GOOGLE CONTAINER REGISTRY
# ============================================

print_header "Pushing Image to Google Container Registry"

print_info "Configuring Docker authentication for GCR..."
gcloud auth configure-docker gcr.io --quiet

print_info "Pushing image: $IMAGE_TAG"
if docker push "$IMAGE_TAG"; then
    print_success "Image pushed to GCR successfully"
else
    print_error "Failed to push image to GCR"
    exit 1
fi

# ============================================
# LOAD ENVIRONMENT VARIABLES
# ============================================

print_header "Loading Environment Variables from .env.production"

# Source the environment file (safely)
export $(grep -v '^#' .env.production | grep -v '^$' | xargs)

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL not found in .env.production"
    exit 1
fi

if [ -z "$SECRET_KEY" ]; then
    print_error "SECRET_KEY not found in .env.production"
    exit 1
fi

print_success "Environment variables loaded"
print_info "Database URL: ${DATABASE_URL:0:50}..."
print_info "CORS Origins: $CORS_ORIGINS"

# ============================================
# DEPLOY TO CLOUD RUN
# ============================================

print_header "Deploying to Google Cloud Run"

print_info "Deploying service: $SERVICE_NAME"
print_info "Region: $REGION"
print_info "Image: $IMAGE_TAG"

gcloud run deploy $SERVICE_NAME \
    --image "$IMAGE_TAG" \
    --platform managed \
    --region "$REGION" \
    --allow-unauthenticated \
    --set-env-vars "DATABASE_URL=$DATABASE_URL,SECRET_KEY=$SECRET_KEY,CORS_ORIGINS=$CORS_ORIGINS,ENV=production,LOG_LEVEL=info" \
    --memory "$MEMORY" \
    --cpu "$CPU" \
    --timeout "$TIMEOUT" \
    --min-instances "$MIN_INSTANCES" \
    --max-instances "$MAX_INSTANCES" \
    --port 8000 \
    --quiet

if [ $? -eq 0 ]; then
    print_success "Service deployed successfully"
else
    print_error "Failed to deploy service"
    exit 1
fi

# ============================================
# GET SERVICE URL
# ============================================

print_header "Deployment Complete"

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')

print_success "Service URL: $SERVICE_URL"
print_info ""
print_info "Next steps:"
print_info "1. Visit: $SERVICE_URL"
print_info "2. Check health: $SERVICE_URL/health"
print_info "3. View logs: gcloud run logs read $SERVICE_NAME --region $REGION --limit 50"
print_info "4. Update your frontend CORS_ORIGINS to: $SERVICE_URL"
print_info ""

# ============================================
# VERIFY DEPLOYMENT
# ============================================

print_header "Verifying Deployment"

print_info "Waiting for service to be ready..."
sleep 5

if curl -s "$SERVICE_URL/health" > /dev/null; then
    print_success "Service is healthy and responding"
else
    print_warning "Could not verify service health. Check logs with: gcloud run logs read $SERVICE_NAME --region $REGION"
fi

# ============================================
# INITIALIZE DATABASE (OPTIONAL)
# ============================================

read -p "Do you want to initialize the database now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_header "Initializing Database"
    
    INIT_RESPONSE=$(curl -s -X POST "$SERVICE_URL/init-db")
    if echo "$INIT_RESPONSE" | grep -q "successfully\|already\|created"; then
        print_success "Database initialized"
    else
        print_warning "Database initialization response: $INIT_RESPONSE"
    fi
fi

print_header "Deployment Summary"
echo ""
echo "Service Name:    $SERVICE_NAME"
echo "Region:          $REGION"
echo "Project ID:      $PROJECT_ID"
echo "Service URL:     $SERVICE_URL"
echo "Memory:          $MEMORY"
echo "CPU:             $CPU"
echo "Min Instances:   $MIN_INSTANCES"
echo "Max Instances:   $MAX_INSTANCES"
echo ""
print_success "Deployment completed successfully!"
print_info "Your API is live at: $SERVICE_URL"
print_info "Share this URL with your frontend team"
