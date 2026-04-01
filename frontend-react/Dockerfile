# Multi-stage Dockerfile for SwasthFirst React Frontend
# Build stage: Compile React app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm ci --only=development

# Copy source code
COPY . .

# Build React app for production
RUN npm run build

# Runtime stage: Serve build with Express
FROM node:18-alpine

WORKDIR /app

# Install serve or express (lightweight static server)
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/build ./build

# Set environment variable for port
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3000

# Start server
CMD ["serve", "-s", "build", "-l", "3000"]
