#!/bin/bash

# Docker container startup script

set -e

# Create log directory
mkdir -p /app/logs

# Initialize database if it doesn't exist
if [ ! -f /app/data/attendance.db ]; then
    echo "Initializing database..."
    cd /app/backend
    node -e "require('./database.js'); console.log('Database initialized');"
    
    # Seed with initial data if seed file exists
    if [ -f seed.js ]; then
        echo "Seeding database with initial data..."
        node seed.js
    fi
fi

# Set correct permissions
chown -R attendance:attendance /app/data /app/logs

# Start supervisor
exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf