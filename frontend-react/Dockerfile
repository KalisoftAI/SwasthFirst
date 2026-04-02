# Dockerfile for SwasthFirst React Frontend
# Optimized for GCP Cloud Run with a multi-stage build

# ============================================
# STAGE 1: Builder
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application for production
RUN npm run build

# ============================================
# STAGE 2: Runtime (Nginx)
# ============================================
FROM nginx:1.25-alpine

# Copy the static build output from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy the custom Nginx configuration to handle SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 and start nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]