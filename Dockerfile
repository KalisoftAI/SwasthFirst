# Multi-stage build for GCP Cloud Run
# Stage 1: Build Frontend
FROM node:18-slim AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production

# Copy frontend source
COPY frontend/src ./src
COPY frontend/public ./public

# Build React app
RUN npm run build

# Stage 2: Setup Backend & Express Server
FROM node:18-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/build ./public

# Create auth directory for Baileys
RUN mkdir -p ./auth

# Expose port (GCP Cloud Run uses PORT env variable)
EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]

# Start backend server (which will serve frontend static files)
CMD ["node", "server.js"]
