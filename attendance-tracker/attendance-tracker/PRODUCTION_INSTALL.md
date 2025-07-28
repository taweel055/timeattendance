# FitLife Attendance Tracker - Production Installation Guide

## Overview

The FitLife Attendance Tracker is a comprehensive employee attendance management system designed for FitLife business operations. This system provides real-time attendance tracking, comprehensive reporting, and user-friendly interfaces for both administrators and employees.

## System Requirements

### Minimum Requirements
- **Node.js**: Version 18.x or higher
- **NPM**: Version 8.x or higher
- **Memory**: 2GB RAM minimum, 4GB recommended
- **Storage**: 1GB free disk space
- **OS**: Ubuntu 20.04+, CentOS 8+, or macOS 10.15+

### Recommended Production Environment
- **CPU**: 2+ cores
- **Memory**: 4GB+ RAM
- **Storage**: 10GB+ free space (for logs and backups)
- **Network**: Stable internet connection for updates

## Installation Methods

### Method 1: Docker Production Deployment (Recommended)

#### Prerequisites
```bash
# Install Docker and Docker Compose
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
```

#### Quick Production Deployment
```bash
# Clone or extract the application
cd fitlife-attendance-tracker

# Create data directories
mkdir -p data logs uploads

# Set permissions
sudo chown -R $USER:$USER data logs uploads

# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d

# Initialize database
docker exec fitlife-attendance-tracker npm run seed
```

#### Access the Application
- **URL**: http://your-server-ip
- **Admin Login**: admin / admin123
- **Employee Login**: employee / emp123

### Method 2: Manual Ubuntu Installation

#### Step 1: Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs build-essential python3-dev

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y
```

#### Step 2: Application Setup
```bash
# Create application user
sudo useradd -m -s /bin/bash fitlife
sudo mkdir -p /opt/fitlife-attendance
sudo chown fitlife:fitlife /opt/fitlife-attendance

# Switch to application user
sudo su - fitlife

# Copy application files
cd /opt/fitlife-attendance
# [Copy all application files here]

# Install dependencies
npm install --legacy-peer-deps
cd backend && npm install --only=production
cd ../frontend && npm install --legacy-peer-deps --only=production

# Build frontend
npm run build
```

#### Step 3: Database Initialization
```bash
# Seed the database
cd /opt/fitlife-attendance/backend
node seed.js
```

#### Step 4: Configure Services

**Create PM2 Ecosystem File**
```bash
# Create ecosystem.config.js
cat > /opt/fitlife-attendance/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'fitlife-attendance',
    script: './backend/server.js',
    cwd: '/opt/fitlife-attendance',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
}
EOF
```

**Configure Nginx**
```bash
sudo cp ubuntu/nginx/attendance-tracker.conf /etc/nginx/sites-available/fitlife-attendance
sudo ln -sf /etc/nginx/sites-available/fitlife-attendance /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

**Start Services**
```bash
# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Enable services
sudo systemctl enable nginx
sudo systemctl start nginx
```

## Configuration

### Environment Variables

Create `.env` file in the backend directory:
```bash
# Production Environment Configuration
NODE_ENV=production
PORT=5000
DB_PATH=./attendance.db
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRES_IN=7d
APP_NAME=FitLife Attendance Tracker
COMPANY_NAME=FitLife
```

### Security Configuration

1. **Change Default Passwords**
   ```bash
   # Access the application and change default admin password
   # Navigate to Settings > Change Password
   ```

2. **Configure CORS** (if needed)
   ```javascript
   // In backend/server.js, update CORS settings
   app.use(cors({
     origin: ['http://your-domain.com', 'https://your-domain.com'],
     credentials: true
   }));
   ```

3. **SSL/HTTPS Setup** (Recommended)
   ```bash
   # Install Certbot for Let's Encrypt
   sudo apt install certbot python3-certbot-nginx -y
   
   # Generate SSL certificate
   sudo certbot --nginx -d your-domain.com
   ```

## Post-Installation Tasks

### 1. System Verification
```bash
# Check application status
pm2 status

# Check application logs
pm2 logs fitlife-attendance

# Test application endpoints
curl -f http://localhost:5000/api/health

# Test frontend
curl -f http://localhost/
```

### 2. User Setup
1. Log in as admin (admin/admin123)
2. Change the default admin password
3. Create employee accounts
4. Configure company settings
5. Set up departments and roles

### 3. Backup Configuration
```bash
# Create backup script
sudo cp ubuntu/scripts/backup.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/backup.sh

# Schedule daily backups
echo "0 2 * * * /usr/local/bin/backup.sh" | sudo crontab -
```

## Maintenance

### Daily Operations
- Monitor application logs: `pm2 logs`
- Check system resources: `htop` or `top`
- Verify backups: `ls -la /opt/fitlife-attendance/backups/`

### Updates
```bash
# Stop application
pm2 stop fitlife-attendance

# Update application files
# [Deploy new version files]

# Rebuild frontend
cd frontend && npm run build

# Restart application
pm2 restart fitlife-attendance
```

### Monitoring
- Application logs: `/opt/fitlife-attendance/logs/`
- System logs: `/var/log/nginx/` and `/var/log/syslog`
- Database: SQLite file at `/opt/fitlife-attendance/backend/attendance.db`

## Troubleshooting

### Common Issues

1. **Application Won't Start**
   ```bash
   # Check logs
   pm2 logs fitlife-attendance
   
   # Check port availability
   sudo netstat -tlnp | grep :5000
   ```

2. **Database Issues**
   ```bash
   # Re-seed database
   cd /opt/fitlife-attendance/backend
   node seed.js
   ```

3. **Permission Issues**
   ```bash
   # Fix ownership
   sudo chown -R fitlife:fitlife /opt/fitlife-attendance
   ```

### Support Contacts
- **Technical Support**: Contact your system administrator
- **FitLife Support**: [Support contact information]

## Security Notes

- Change all default passwords immediately
- Keep the system updated
- Monitor access logs regularly
- Use HTTPS in production
- Backup data regularly
- Restrict database access
- Use strong JWT secrets

---

**FitLife Attendance Tracker v1.0**
*Production Ready - Deployed for FitLife Operations*