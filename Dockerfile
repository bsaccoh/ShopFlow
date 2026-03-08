# Production Dockerfile for Multi-Tenant POS

# -------------------------
# Stage 1: Build Frontend
# -------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
# Add environment variables needed for build time
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


# -------------------------
# Stage 2: Build Backend
# -------------------------
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
# Install production dependencies only
RUN npm ci --only=production

COPY backend/ ./


# -------------------------
# Stage 3: Production Image
# -------------------------
FROM node:20-alpine

# Install Nginx to serve frontend
RUN apk add --no-cache nginx

# Set up working directory for Node backend
WORKDIR /app

# Copy backend from builder
COPY --from=backend-builder /app/backend ./backend

# Copy frontend build to nginx html dir
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Expose ports (80 for Nginx frontend proxy, 5000 for local backend if needed directly)
EXPOSE 80 5000

# Create a startup script to run both Nginx and Node
# Render provides $PORT dynamically. We dynamically rewrite nginx to use it, and restrict Node to 5000.
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'sed -i "s/listen 80;/listen ${PORT:-80};/g" /etc/nginx/nginx.conf' >> /app/start.sh && \
    echo 'nginx' >> /app/start.sh && \
    echo 'cd /app/backend && node pg_init.js && PORT=5000 node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Start services
CMD ["/app/start.sh"]
