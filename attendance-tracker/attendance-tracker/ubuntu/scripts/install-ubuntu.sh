#!/bin/bash

# Ubuntu Attendance Tracker Installation Script
# Supports Ubuntu 20.04, 22.04, and 24.04

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="attendance-tracker"
APP_USER="attendance"
APP_DIR="/opt/attendance-tracker"
SERVICE_NAME="attendance-tracker"
NODE_VERSION="18"

# Functions
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

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

detect_ubuntu_version() {
    if [[ ! -f /etc/os-release ]]; then
        log_error "Cannot detect Ubuntu version"
        exit 1
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        log_error "This script is only for Ubuntu"
        exit 1
    fi
    
    case "$VERSION_ID" in
        "20.04"|"22.04"|"24.04")
            log_info "Detected Ubuntu $VERSION_ID"
            ;;
        *)
            log_warning "Ubuntu $VERSION_ID is not officially supported, but will try to continue"
            ;;
    esac
}

install_system_dependencies() {
    log_info "Updating system packages..."
    apt-get update -y
    
    log_info "Installing system dependencies..."
    apt-get install -y \
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
        ufw \
        certbot \
        python3-certbot-nginx
    
    log_success "System dependencies installed"
}

install_nodejs() {
    log_info "Installing Node.js $NODE_VERSION..."
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    
    log_success "Node.js $node_version and npm $npm_version installed"
}

install_docker() {
    log_info "Installing Docker..."
    
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Install dependencies
    apt-get install -y \
        ca-certificates \
        gnupg \
        lsb-release
    
    # Add Docker GPG key
    mkdir -m 0755 -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    log_success "Docker installed and started"
}

create_app_user() {
    log_info "Creating application user..."
    
    if ! id "$APP_USER" &>/dev/null; then
        useradd -m -s /bin/bash -G docker "$APP_USER"
        log_success "User $APP_USER created"
    else
        log_info "User $APP_USER already exists"
        usermod -aG docker "$APP_USER"
    fi
}

setup_application() {
    log_info "Setting up application directory..."
    
    # Create application directory
    mkdir -p "$APP_DIR"
    mkdir -p "$APP_DIR/data"
    mkdir -p "$APP_DIR/logs"
    mkdir -p "$APP_DIR/backups"
    
    # Set permissions
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    chmod 755 "$APP_DIR"
    
    log_success "Application directory setup complete"
}

configure_nginx() {
    log_info "Configuring Nginx..."
    
    # Create nginx configuration
    cat > /etc/nginx/sites-available/attendance-tracker << 'EOF'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 10M;
    
    # Frontend (React app)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API Backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files
    location /uploads {
        alias /opt/attendance-tracker/data/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/attendance-tracker /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    nginx -t
    
    # Reload nginx
    systemctl reload nginx
    
    log_success "Nginx configured"
}

configure_firewall() {
    log_info "Configuring UFW firewall..."
    
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw --force enable
    
    log_success "Firewall configured"
}

create_systemd_services() {
    log_info "Creating systemd services..."
    
    # Backend service
    cat > /etc/systemd/system/attendance-backend.service << EOF
[Unit]
Description=Attendance Tracker Backend
After=network.target
Wants=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/backend
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=DATABASE_PATH=$APP_DIR/data/attendance.db
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Frontend service
    cat > /etc/systemd/system/attendance-frontend.service << EOF
[Unit]
Description=Attendance Tracker Frontend
After=network.target attendance-backend.service
Wants=network.target
Requires=attendance-backend.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Main service
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Attendance Tracker Application
After=network.target
Wants=attendance-backend.service attendance-frontend.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/true
ExecReload=/bin/systemctl reload-or-restart attendance-backend attendance-frontend

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    
    log_success "Systemd services created"
}

create_backup_script() {
    log_info "Creating backup script..."
    
    cat > /usr/local/bin/attendance-backup << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/attendance-tracker/backups"
DATA_DIR="/opt/attendance-tracker/data"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/attendance-backup-$DATE.tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
cd "$DATA_DIR"
tar -czf "$BACKUP_FILE" .

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "attendance-backup-*.tar.gz" -mtime +7 -delete

echo "Backup created: $BACKUP_FILE"
EOF
    
    chmod +x /usr/local/bin/attendance-backup
    
    # Create daily backup cron job
    cat > /etc/cron.d/attendance-backup << 'EOF'
# Daily backup at 2 AM
0 2 * * * root /usr/local/bin/attendance-backup >/dev/null 2>&1
EOF
    
    log_success "Backup script created"
}

setup_ssl() {
    read -p "Do you want to set up SSL with Let's Encrypt? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your domain name: " domain
        if [[ -n "$domain" ]]; then
            log_info "Setting up SSL for $domain..."
            certbot --nginx -d "$domain" --non-interactive --agree-tos --email "admin@$domain"
            log_success "SSL setup complete"
        else
            log_warning "No domain provided, skipping SSL setup"
        fi
    fi
}

main() {
    log_info "Starting Ubuntu Attendance Tracker installation..."
    
    check_root
    detect_ubuntu_version
    
    install_system_dependencies
    install_nodejs
    install_docker
    create_app_user
    setup_application
    configure_nginx
    configure_firewall
    create_systemd_services
    create_backup_script
    
    log_success "Installation complete!"
    log_info "Next steps:"
    echo "  1. Copy your application files to $APP_DIR"
    echo "  2. Run: systemctl enable $SERVICE_NAME"
    echo "  3. Run: systemctl start $SERVICE_NAME"
    echo "  4. Access your application at http://your-server-ip"
    
    setup_ssl
}

# Run installation
main "$@"