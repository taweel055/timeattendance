# FitLife Attendance Tracker

> **Production Ready** - Employee Attendance Management System for FitLife

## Overview

The FitLife Attendance Tracker is a comprehensive web-based application designed to streamline employee attendance management for FitLife business operations. Built with modern technologies and designed for reliability, security, and ease of use.

## Key Features

### 🏢 **Administration Dashboard**
- Real-time attendance overview
- Employee management system
- Comprehensive reporting suite
- Role-based access control

### 👥 **Employee Management**
- Employee registration and profile management
- Department and role assignments
- Active/inactive status tracking
- Bulk operations support

### ⏰ **Attendance Tracking**
- Clock in/out functionality
- Break time tracking
- Overtime calculation
- Manual attendance adjustment (admin only)

### 📊 **Reporting & Analytics**
- Daily, weekly, monthly attendance reports
- Employee attendance summaries
- Department-wise analytics
- Export to CSV/PDF formats

### 🔒 **Security Features**
- JWT-based authentication
- Role-based authorization (Admin, Manager, Employee)
- Secure password hashing
- Session management

## Technology Stack

- **Frontend**: React 19, TypeScript, Material-UI
- **Backend**: Node.js, Express.js
- **Database**: SQLite (production-ready)
- **Authentication**: JWT tokens
- **Build Tools**: Create React App, npm

## Quick Start (Production)

### Docker Deployment (Recommended)
```bash
# Clone the repository
git clone [repository-url]
cd fitlife-attendance-tracker

# Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# Initialize database
docker exec fitlife-attendance-tracker npm run seed
```

### Manual Installation
```bash
# Install dependencies
npm install --legacy-peer-deps

# Build application
npm run build

# Seed database
npm run seed

# Start production server
npm start
```

Access the application at `http://localhost` (Docker) or `http://localhost:3000` (Manual).

## Default Login Credentials

**Administrator Account:**
- Username: `admin`
- Password: `admin123`

**Employee Account:**
- Username: `employee`
- Password: `emp123`

> ⚠️ **Important**: Change these default passwords immediately in production.

## Production Deployment

For detailed production installation instructions, see [PRODUCTION_INSTALL.md](./PRODUCTION_INSTALL.md).

### Requirements
- Node.js 18+ and npm 8+
- 2GB RAM minimum (4GB recommended)
- 1GB free disk space
- Ubuntu 20.04+ or similar Linux distribution

### Production Features
- Docker containerization
- Nginx reverse proxy configuration
- PM2 process management
- Automated backups
- SSL/HTTPS support
- Production-optimized builds

## Project Structure

```
fitlife-attendance-tracker/
├── backend/                 # Express.js API server
│   ├── controllers/         # Route controllers
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication & validation
│   ├── models/             # Database models
│   └── utils/              # Utility functions
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── contexts/       # React contexts
│   │   └── services/       # API client services
│   └── build/              # Production build
├── ubuntu/                 # Ubuntu deployment configs
├── docker-compose.prod.yml # Production Docker setup
└── PRODUCTION_INSTALL.md   # Detailed installation guide
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Employees
- `GET /api/employees` - List all employees
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance/checkin` - Clock in
- `POST /api/attendance/checkout` - Clock out
- `PUT /api/attendance/:id` - Update attendance record

### Reports
- `GET /api/reports/attendance` - Attendance reports
- `GET /api/reports/summary` - Summary reports

## Development

This application is production-ready and optimized for FitLife operations. For development purposes:

```bash
# Development mode
npm run dev

# Run tests (if available)
npm test

# Linting
npm run lint
```

## Production Scripts

- `npm start` - Start production server
- `npm run build` - Build frontend for production
- `npm run seed` - Initialize database with sample data
- `npm run backup` - Create database backup
- `npm run health` - Check application health

## Monitoring & Maintenance

### Logs
- Application logs: `logs/` directory
- Database location: `backend/attendance.db`

### Health Check
Visit `/api/health` to check application status.

### Backup
Automated daily backups are configured for production deployments.

## Support

For technical support and deployment assistance, contact your system administrator or refer to the [PRODUCTION_INSTALL.md](./PRODUCTION_INSTALL.md) guide.

## Version

**v1.0.0** - Production Release for FitLife Operations

---

**© 2024 FitLife Attendance Tracker** - Built for FitLife Business Operations