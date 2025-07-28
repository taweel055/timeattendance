# 🚀 FitLife Attendance Tracker - Installation Guide

## 📋 **System Requirements**

### **Minimum Requirements**
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **RAM**: 2GB available
- **Disk Space**: 1GB free space
- **Browser**: Chrome 100+, Firefox 100+, Safari 15+, Edge 100+

### **Recommended Requirements**
- **Node.js**: 20.0.0 LTS
- **RAM**: 4GB available
- **Disk Space**: 2GB free space
- **SSD Storage** for better performance

---

## 🔧 **Installation Steps**

### **Step 1: System Preparation**

#### **Install Node.js & npm**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS (using Homebrew)
brew install node

# Windows - Download from https://nodejs.org
```

#### **Verify Installation**
```bash
node --version    # Should be 18.0.0+
npm --version     # Should be 9.0.0+
```

### **Step 2: Project Setup**

#### **Extract Project Files**
```bash
# If you have the ZIP file
unzip attendance-tracker.zip
cd attendance-tracker

# Or if cloning from repository
git clone <repository-url>
cd attendance-tracker
```

#### **Verify Project Structure**
```bash
ls -la
# Should show: backend/ frontend/ README.md INSTALLATION.md
```

### **Step 3: Backend Configuration**

#### **Navigate to Backend Directory**
```bash
cd backend
```

#### **Install Dependencies**
```bash
npm install
```

#### **Environment Setup**
```bash
# Create .env file
cp .env.example .env

# Edit .env file with your settings
nano .env
```

#### **Environment Variables**
```env
# .env file content
NODE_ENV=development
PORT=5000
JWT_SECRET=your_super_secure_jwt_secret_here_min_32_chars
DATABASE_PATH=./attendance.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=http://localhost:3000
```

#### **Database Initialization**
```bash
# Run database migrations
sqlite3 attendance.db < database-migrations.sql

# Verify database creation
sqlite3 attendance.db "SELECT name FROM sqlite_master WHERE type='table';"
```

#### **Create Required Directories**
```bash
mkdir -p uploads
chmod 755 uploads
```

### **Step 4: Frontend Configuration**

#### **Navigate to Frontend Directory**
```bash
cd ../frontend
```

#### **Install Dependencies**
```bash
npm install
```

#### **Environment Setup (Optional)**
```bash
# Create .env file for custom configuration
echo "REACT_APP_API_URL=/api" > .env
echo "REACT_APP_APP_NAME=FitLife Attendance Tracker" >> .env
```

### **Step 5: Initial Data Setup**

#### **Start Backend Server**
```bash
cd ../backend
npm run dev
# Server should start on http://localhost:5000
```

#### **Create Initial Admin User (New Terminal)**
```bash
# Using the API to create admin user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "role": "admin"
  }'
```

#### **Add Sample Employees**
```bash
# Add sample employee data
sqlite3 backend/attendance.db "
INSERT INTO employees (employee_id, name, email, department, position, hourly_rate, overtime_rate) VALUES
('EMP001', 'John Doe', 'john.doe@company.com', 'Engineering', 'Developer', 25.00, 37.50),
('EMP002', 'Jane Smith', 'jane.smith@company.com', 'Marketing', 'Manager', 30.00, 45.00),
('EMP003', 'Bob Johnson', 'bob.johnson@company.com', 'HR', 'Coordinator', 22.00, 33.00),
('EMP004', 'Alice Williams', 'alice.williams@company.com', 'Finance', 'Analyst', 28.00, 42.00),
('EMP005', 'Charlie Brown', 'charlie.brown@company.com', 'Operations', 'Supervisor', 26.00, 39.00);
"
```

---

## 🏃‍♂️ **Running the Application**

### **Development Mode**

#### **Terminal 1: Backend Server**
```bash
cd backend
npm run dev
# Backend runs on http://localhost:5000
```

#### **Terminal 2: Frontend Server**
```bash
cd frontend
npm start
# Frontend runs on http://localhost:3000
```

### **Production Mode**

#### **Build Frontend**
```bash
cd frontend
npm run build
```

#### **Serve Production Build**
```bash
# Option 1: Use serve package
npm install -g serve
serve -s build -l 3000

# Option 2: Use backend to serve frontend
cd ../backend
npm start
# Serves both API and frontend on http://localhost:5000
```

---

## 🔐 **Initial Login**

### **Access Application**
1. Open browser to `http://localhost:3000`
2. Use default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
3. Change password after first login

### **Create Additional Users**
1. Login as admin
2. Navigate to User Management
3. Add manager/employee accounts as needed

---

## ✅ **Verification Steps**

### **Backend Verification**
```bash
# Test API health
curl http://localhost:5000/api/health

# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### **Frontend Verification**
1. ✅ Login page loads correctly
2. ✅ Dashboard displays after login
3. ✅ Employee management works
4. ✅ Attendance records display
5. ✅ CSV upload functionality works
6. ✅ Template download works

### **Database Verification**
```bash
# Check tables exist
sqlite3 backend/attendance.db ".tables"

# Check sample data
sqlite3 backend/attendance.db "SELECT * FROM employees LIMIT 3;"
```

---

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Port Already in Use**
```bash
# Kill process using port 5000
sudo lsof -ti:5000 | xargs kill -9

# Kill process using port 3000
sudo lsof -ti:3000 | xargs kill -9
```

#### **Database Connection Issues**
```bash
# Check database file permissions
ls -la backend/attendance.db
chmod 664 backend/attendance.db

# Verify database integrity
sqlite3 backend/attendance.db "PRAGMA integrity_check;"
```

#### **npm Install Fails**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### **Frontend Build Errors**
```bash
# Clear React cache
rm -rf node_modules/.cache
npm start
```

### **Environment Issues**

#### **Node.js Version Mismatch**
```bash
# Install Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Use required Node version
nvm install 20
nvm use 20
```

#### **Permission Issues on Linux/macOS**
```bash
# Fix npm global permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

---

## 🔧 **Configuration Options**

### **Backend Configuration**

#### **Environment Variables**
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | development | No |
| `PORT` | Server port | 5000 | No |
| `JWT_SECRET` | JWT signing key | - | Yes |
| `DATABASE_PATH` | SQLite file path | ./attendance.db | No |
| `UPLOAD_DIR` | File upload directory | ./uploads | No |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 10485760 | No |
| `CORS_ORIGIN` | CORS allowed origin | http://localhost:3000 | No |

#### **Database Configuration**
```javascript
// backend/database.js configuration options
const dbOptions = {
  verbose: console.log, // Enable SQL logging
  fileMustExist: false, // Create if not exists
  timeout: 5000,        // Query timeout
  readonly: false       // Read-write access
};
```

### **Frontend Configuration**

#### **Environment Variables**
| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | API base URL | /api |
| `REACT_APP_APP_NAME` | Application name | FitLife Attendance Tracker |
| `REACT_APP_VERSION` | Version display | 2.0.0 |

---

## 🚀 **Production Deployment**

### **Server Requirements**
- **CPU**: 2+ cores
- **RAM**: 4GB+
- **Storage**: 10GB+ SSD
- **Network**: Stable internet connection

### **Production Setup**
```bash
# Set production environment
export NODE_ENV=production

# Install production dependencies only
npm install --production

# Build frontend for production
cd frontend
npm run build

# Start production server
cd ../backend
npm start
```

### **Security Considerations**
1. **Change default passwords**
2. **Use strong JWT secrets**
3. **Enable HTTPS**
4. **Configure firewall**
5. **Regular backups**
6. **Monitor logs**

---

## 📊 **Performance Tuning**

### **Database Optimization**
```sql
-- Run these commands for better performance
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=10000;
PRAGMA temp_store=memory;
```

### **Node.js Optimization**
```bash
# Increase memory limit if needed
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable production optimizations
export NODE_ENV=production
```

### **Frontend Optimization**
- Bundle size already optimized (439KB gzipped)
- Components use React.memo for performance
- Lazy loading implemented
- Service worker ready for PWA

---

## 📞 **Support**

### **Getting Help**
1. Check this installation guide
2. Review troubleshooting section
3. Check application logs
4. Consult README.md for features

### **Log Locations**
- **Backend logs**: Console output or PM2 logs
- **Frontend logs**: Browser developer console
- **Database logs**: SQLite error messages

### **Backup Strategy**
```bash
# Backup database
cp backend/attendance.db backups/attendance-$(date +%Y%m%d).db

# Backup entire system
tar -czf attendance-backup-$(date +%Y%m%d).tar.gz attendance-tracker/
```

---

## ✨ **Success!**

If you've followed all steps correctly, you should now have:
- ✅ **Backend API** running on port 5000
- ✅ **Frontend application** running on port 3000
- ✅ **Database** initialized with sample data
- ✅ **Admin user** ready for login
- ✅ **File uploads** working correctly
- ✅ **All features** fully functional

**Welcome to your new professional attendance tracking system!** 🎉

---

*For additional help or questions, refer to the README.md file for detailed feature documentation.*