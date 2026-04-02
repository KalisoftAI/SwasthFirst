#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
set -o pipefail

# Define some colors for output
C_RESET='\033[0m'
C_RED='\033[0;31m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[0;33m'
C_BLUE='\033[0;34m'
C_CYAN='\033[0;36m'

# Helper functions for logging
print_header() { echo -e "\n${C_BLUE}============================================\n$1\n============================================${C_RESET}"; }
print_success() { echo -e "${C_GREEN}[SUCCESS] $1${C_RESET}"; }
print_error() { echo -e "${C_RED}[ERROR] $1${C_RESET}"; }
print_warning() { echo -e "${C_YELLOW}[WARNING] $1${C_RESET}"; }
print_info() { echo -e "${C_CYAN}[INFO] $1${C_RESET}"; }
 
# ============================================
# PARSE ARGUMENTS AND VALIDATE
# ============================================
 
# Set default values
SERVICE_NAME="swasthfirst-backend"
REGION="us-central1"
 
# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --project)
            if [[ -z "$2" || ${2:0:1} == "-" ]]; then
                print_error "Argument for $1 is missing or invalid."
                exit 1
            fi
            PROJECT_ID="$2"
            shift
            ;;
        --service)
            if [[ -z "$2" || ${2:0:1} == "-" ]]; then
                print_error "Argument for $1 is missing or invalid."
                exit 1
            fi
            SERVICE_NAME="$2"
            shift
            ;;
        --region)
            if [[ -z "$2" || ${2:0:1} == "-" ]]; then
                print_error "Argument for $1 is missing or invalid."
                exit 1
            fi
            REGION="$2"
            shift
            ;;
        *) print_error "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done
 
# Validate that the project ID was provided
if [ -z "$PROJECT_ID" ]; then
    print_error "Project ID is required. Usage: ./deploy.sh --project YOUR_PROJECT_ID"
    exit 1
fi
 
print_header "Verifying Deployment"
print_info "Fetching service URL for '$SERVICE_NAME' in project '$PROJECT_ID'..."
 
# Get the URL of the deployed Cloud Run service
# We add --quiet to prevent gcloud from hanging on interactive prompts (e.g., asking to enable an API).
# If an action is required, it will fail with an error message instead, which our script will catch.
GCLOUD_OUTPUT=$(gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --project "$PROJECT_ID" --format 'value(status.url)' --quiet 2>&1)
 
if [[ $? -ne 0 || -z "$GCLOUD_OUTPUT" ]]; then
    print_error "Could not get service URL. The gcloud command failed."
    print_warning "Please check that the service name ('$SERVICE_NAME'), region ('$REGION'), and project ID are correct and that you have the necessary permissions."
    print_info "gcloud command output:"
    # Indent the gcloud output for readability
    echo "$GCLOUD_OUTPUT" | sed 's/^/    /'
    exit 1
fi
SERVICE_URL=$GCLOUD_OUTPUT
 
print_info "Service URL: $SERVICE_URL"
print_info "Checking service health..."
 
if curl -s --fail --retry 3 --retry-delay 5 "$SERVICE_URL/health" > /dev/null; then
    print_success "Service is healthy and responding"
else
    print_warning "Could not verify service health. Check logs with: gcloud run logs read $SERVICE_NAME --region $REGION"
fi

# ============================================
# INITIALIZE DATABASE (OPTIONAL)
# ============================================

read -p "Do you want to initialize and seed the database now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_header "Initializing and Seeding Database"
    print_info "Calling /init-db endpoint on the service..."
    
    # The -f flag makes curl fail silently on HTTP errors (no output),
    # which is good for scripting. We check the exit code.
    # The -s flag silences the progress meter.
    # The -X POST specifies the request method.
    if curl -s -f -X POST "$SERVICE_URL/init-db"; then
        print_success "Database initialized and seeded successfully!"
        print_info "You can view the detailed seeding log in the Cloud Run service logs."
    else
        print_error "Database seeding via API failed. Check the service logs for details."
        exit 1
    fi
fi

print_header "Deployment Summary"
print_success "Backend deployment and configuration complete!"
echo ""
echo -e "${C_CYAN}Service Name:${C_RESET} $SERVICE_NAME"
echo -e "${C_CYAN}Region:${C_RESET}       $REGION"
echo -e "${C_CYAN}URL:${C_RESET}          $SERVICE_URL"
echo ""
print_info "You can monitor the service by viewing logs:"
echo "gcloud run logs tail $SERVICE_NAME --region $REGION --project $PROJECT_ID"