# Multi-stage build for Ubuntu deployment
FROM node:18-alpine AS frontend-build

# Install git for npm packages that might need it
RUN apk add --no-cache git

# Set working directory for frontend
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production --legacy-peer-deps

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Production stage
FROM ubuntu:22.04

# Set environment variables
ENV NODE_VERSION=18.19.0
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV PORT=5000

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    python3-dev \
    python3-pip \
    sqlite3 \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Create app user
RUN useradd -m -s /bin/bash attendance && \
    mkdir -p /app && \
    chown -R attendance:attendance /app

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies as app user
USER attendance
RUN cd backend && npm ci --only=production

# Copy backend source
COPY --chown=attendance:attendance backend/ ./backend/

# Copy built frontend from build stage
COPY --from=frontend-build --chown=attendance:attendance /app/frontend/build ./frontend/build

# Copy configuration files
COPY --chown=attendance:attendance ubuntu/ ./ubuntu/

# Create necessary directories
RUN mkdir -p /app/backend/uploads && \
    mkdir -p /app/logs && \
    mkdir -p /app/data

# Switch to root for final setup
USER root

# Copy nginx configuration
COPY ubuntu/nginx/attendance-tracker.conf /etc/nginx/sites-available/
RUN ln -sf /etc/nginx/sites-available/attendance-tracker.conf /etc/nginx/sites-enabled/ && \
    rm -f /etc/nginx/sites-enabled/default

# Copy supervisor configuration
COPY ubuntu/supervisor/attendance-tracker.conf /etc/supervisor/conf.d/

# Create startup script
COPY ubuntu/scripts/start.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/start.sh

# Expose ports
EXPOSE 80 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Volume for persistent data
VOLUME ["/app/data", "/app/logs"]

# Start services
CMD ["/usr/local/bin/start.sh"]
