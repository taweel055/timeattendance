#!/bin/bash

# Attendance Tracker Backup Script

set -e

# Configuration
BACKUP_DIR="/opt/attendance-tracker/backups"
DATA_DIR="/opt/attendance-tracker/data"
APP_DIR="/opt/attendance-tracker"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="attendance-backup-$DATE"
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if application is running
if systemctl is-active --quiet attendance-backend; then
    APP_RUNNING=true
    log_info "Application is running"
else
    APP_RUNNING=false
    log_warning "Application is not running"
fi

# Create temporary directory for backup
TEMP_DIR=$(mktemp -d)
BACKUP_PATH="$TEMP_DIR/$BACKUP_NAME"
mkdir -p "$BACKUP_PATH"

log_info "Creating backup: $BACKUP_NAME"

# Backup database
if [ -f "$DATA_DIR/attendance.db" ]; then
    log_info "Backing up database..."
    cp "$DATA_DIR/attendance.db" "$BACKUP_PATH/"
    
    # Create SQL dump as well
    sqlite3 "$DATA_DIR/attendance.db" ".dump" > "$BACKUP_PATH/database_dump.sql"
    log_success "Database backup completed"
else
    log_warning "Database file not found: $DATA_DIR/attendance.db"
fi

# Backup uploads directory
if [ -d "$DATA_DIR/uploads" ]; then
    log_info "Backing up uploads..."
    cp -r "$DATA_DIR/uploads" "$BACKUP_PATH/"
    log_success "Uploads backup completed"
else
    log_warning "Uploads directory not found: $DATA_DIR/uploads"
fi

# Backup configuration files
log_info "Backing up configuration files..."
mkdir -p "$BACKUP_PATH/config"

if [ -f "$APP_DIR/backend/.env" ]; then
    cp "$APP_DIR/backend/.env" "$BACKUP_PATH/config/"
fi

if [ -f "$APP_DIR/package.json" ]; then
    cp "$APP_DIR/package.json" "$BACKUP_PATH/config/"
fi

if [ -f "$APP_DIR/docker-compose.yml" ]; then
    cp "$APP_DIR/docker-compose.yml" "$BACKUP_PATH/config/"
fi

# Create backup metadata
cat > "$BACKUP_PATH/backup_info.txt" << EOF
Backup Information
==================
Date: $(date)
Hostname: $(hostname)
Application Running: $APP_RUNNING
Node Version: $(node --version 2>/dev/null || echo "Not available")
Database Size: $(du -h "$DATA_DIR/attendance.db" 2>/dev/null | cut -f1 || echo "N/A")
Total Size: $(du -sh "$BACKUP_PATH" | cut -f1)

Files Included:
$(find "$BACKUP_PATH" -type f | sed 's|'$BACKUP_PATH'||g' | sort)
EOF

# Create compressed archive
log_info "Creating compressed archive..."
cd "$TEMP_DIR"
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" "$BACKUP_NAME"

# Cleanup temporary directory
rm -rf "$TEMP_DIR"

# Set proper permissions
chown -R attendance:attendance "$BACKUP_DIR" 2>/dev/null || true

BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | cut -f1)
log_success "Backup completed: $BACKUP_DIR/$BACKUP_NAME.tar.gz ($BACKUP_SIZE)"

# Cleanup old backups
log_info "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "attendance-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete
REMAINING_BACKUPS=$(ls -1 "$BACKUP_DIR"/attendance-backup-*.tar.gz 2>/dev/null | wc -l)
log_info "Remaining backups: $REMAINING_BACKUPS"

# Verify backup
log_info "Verifying backup integrity..."
if tar -tzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" >/dev/null 2>&1; then
    log_success "Backup verification successful"
else
    log_error "Backup verification failed!"
    exit 1
fi

# List recent backups
log_info "Recent backups:"
ls -lah "$BACKUP_DIR"/attendance-backup-*.tar.gz | tail -5

echo
log_success "Backup process completed successfully!"
echo "Backup location: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
echo "Backup size: $BACKUP_SIZE"