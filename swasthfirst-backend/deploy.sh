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
REPO_NAME="swasthfirst-repo" # Default Artifact Registry repository name
PERFORM_DEPLOY=false
 
# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --deploy) PERFORM_DEPLOY=true ;;
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
        --repo)
            if [[ -z "$2" || ${2:0:1} == "-" ]]; then
                print_error "Argument for $1 is missing or invalid."
                exit 1
            fi
            REPO_NAME="$2"
            shift
            ;;
        *) print_error "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done
 
# Validate that the project ID was provided
if [ -z "$PROJECT_ID" ]; then
    print_error "Project ID is required. Usage: ./deploy.sh --project YOUR_PROJECT_ID [--deploy]"
    exit 1
fi
 

# ============================================
# BUILD AND DEPLOY (OPTIONAL)
# ============================================

if [ "$PERFORM_DEPLOY" = true ]; then
    print_header "Building and Deploying Service"

    # Construct the full image name for Artifact Registry
    IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

    print_info "Checking for Artifact Registry repository '${REPO_NAME}'..."
    # Create an Artifact Registry repository if it doesn't exist.
    # Errors are suppressed, and `|| true` prevents the script from exiting if it already exists.
    gcloud artifacts repositories create "${REPO_NAME}" \
      --repository-format=docker \
      --location="${REGION}" \
      --project="${PROJECT_ID}" \
      --description="Docker repository for SwasthFirst backend" 2>/dev/null || true

    print_info "Building and pushing container image to: ${IMAGE_TAG}"
    # Build the container image using Cloud Build and push it to Artifact Registry.
    gcloud builds submit --tag "${IMAGE_TAG}" --project "${PROJECT_ID}" --quiet

    # Prepare the deploy command
    DEPLOY_COMMAND=(gcloud run deploy "${SERVICE_NAME}"
      --image="${IMAGE_TAG}"
      --region="${REGION}"
      --project="${PROJECT_ID}"
      --allow-unauthenticated
      --quiet
    )

    # Check for a .env.production file and add it to the deploy command if it exists
    ENV_FILE=".env.production"
    ENV_VARS=""
    ADMIN_SECRET_VALUE=""
    if [ -f "$ENV_FILE" ]; then
        print_info "Found '$ENV_FILE', parsing environment variables for the service."
        # Read .env.production file line by line
        while IFS='=' read -r key value; do
            # Skip empty lines and comments
            if [[ -z "$key" || "$key" =~ ^\s*# ]]; then
                continue
            fi
            # Trim whitespace from key and value
            key=$(echo "$key" | xargs)
            value=$(echo "$value" | xargs)

            # Skip reserved environment variables like PORT
            if [[ "$key" == "PORT" ]]; then
                print_warning "Skipping reserved environment variable: PORT. Cloud Run sets this automatically."
                continue
            fi

            # Capture the ADMIN_SECRET specifically for the init-db call later
            if [[ "$key" == "ADMIN_SECRET" ]]; then
                ADMIN_SECRET_VALUE="$value"
            fi

            # Remove quotes from value if present
            value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

            if [ -n "$ENV_VARS" ]; then
                ENV_VARS+=","
            fi
            ENV_VARS+="${key}=${value}"
        done < "$ENV_FILE"

        if [ -n "$ENV_VARS" ]; then
            print_info "Applying environment variables: ${ENV_VARS}"
            DEPLOY_COMMAND+=(--set-env-vars="$ENV_VARS")
        else
            print_warning "No valid environment variables found in '$ENV_FILE'."
        fi
    else
        print_warning "No '$ENV_FILE' file found. If your service requires environment variables (like DATABASE_URL or CORS_ORIGINS), create a '$ENV_FILE' file."
    fi

    print_info "Deploying new image to Cloud Run service: ${SERVICE_NAME}..."
    # Deploy the new image to the Cloud Run service.
    # The command is executed from the array we built.
    "${DEPLOY_COMMAND[@]}"

    print_success "Service built and deployed successfully!"
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
    
    print_info "This action triggers the deployed backend service to run its internal database seeding logic."
    print_info "Ensure your backend application (e.g., main.py) has an endpoint '/init-db' that calls the seeding function."
    
    INIT_DB_URL="$SERVICE_URL/init-db"
    # If we found an ADMIN_SECRET in the .env file, append it as a query parameter
    if [ -n "$ADMIN_SECRET_VALUE" ]; then
        print_info "ADMIN_SECRET found, using it to authorize the /init-db request."
        INIT_DB_URL+="?secret=$ADMIN_SECRET_VALUE"
    else
        # This warning is important for environments where the secret might be set differently
        print_warning "ADMIN_SECRET not found in '$ENV_FILE'. The /init-db call may fail if the endpoint is protected in production."
    fi

    # The curl command sends a POST request. We add a long timeout (--max-time 300, i.e., 5 minutes)
    # because database seeding can be a slow operation, and we don't want the script to time out prematurely.
    print_info "Attempting to call: $INIT_DB_URL"
    INIT_DB_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST --max-time 300 "$INIT_DB_URL")
    HTTP_CODE=$(echo "$INIT_DB_RESPONSE" | tail -n1)
    BODY=$(echo "$INIT_DB_RESPONSE" | sed '$d')

    # Check if the curl command itself failed (e.g., due to a timeout).
    if [ $? -ne 0 ]; then
        print_error "The curl command to '/init-db' failed. This could be due to a timeout or network issue."
        print_warning "The seeding process might be running in the background, but this script cannot confirm it."
        print_info "Check the service logs for the status of the database initialization."
        exit 1
    fi

    if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
        print_success "Database initialized and seeded successfully!"
        print_info "Response from /init-db endpoint:"
        # Pretty-print the JSON response for readability (requires jq)
        echo "$BODY" | (jq . 2>/dev/null || echo "$BODY") | sed 's/^/    /'
    else
        print_error "Database seeding via API failed. Check the service logs for details."
        print_error "HTTP Status Code: $HTTP_CODE"
        print_error "Verify that your backend application's '/init-db' endpoint is correctly implemented and accessible."
        print_error "Also, ensure that your Cloud Run service has the correct DATABASE_URL and other necessary environment variables configured."
        print_info "Response body from server:"
        echo "$BODY" | (jq . 2>/dev/null || echo "$BODY") | sed 's/^/    /'
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