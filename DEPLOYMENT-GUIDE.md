# 🚀 **KMU DisciplineDesk - Comprehensive Deployment Guide**

## 📋 **Table of Contents**

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Database Configuration](#database-configuration)
4. [API Integration Approaches](#api-integration-approaches)
5. [Server Hosting Options](#server-hosting-options)
6. [Deployment Methods](#deployment-methods)
7. [Environment Configuration](#environment-configuration)
8. [Security Considerations](#security-considerations)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 **System Overview**

**KMU DisciplineDesk** is a Progressive Web Application (PWA) with the following architecture:

- **Frontend:** Next.js 14 (React) with TypeScript
- **Backend:** Express.js (Node.js) with JWT authentication
- **Database:** MongoDB or MySQL (configurable)
- **File Storage:** Local file system or cloud storage
- **Real-time:** Socket.IO for live updates

---

## ⚙️ **Prerequisites**

### **Required Software**
- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control
- **Database:** MongoDB (v5+) or MySQL (v8+)

### **System Requirements**
- **RAM:** Minimum 2GB, Recommended 4GB+
- **Storage:** Minimum 10GB free space
- **Network:** Stable internet connection
- **OS:** Windows, macOS, or Linux

### **Development Tools (Optional)**
- **VS Code** or any code editor
- **Postman** for API testing
- **MongoDB Compass** or **MySQL Workbench**

---

## 🗄️ **Database Configuration**

### **Option 1: MongoDB Setup**

#### **Local MongoDB Installation**

1. **Download MongoDB Community Server**
   ```bash
   # Windows: Download from https://www.mongodb.com/try/download/community
   # macOS: brew install mongodb-community
   # Ubuntu: sudo apt-get install mongodb
   ```

2. **Start MongoDB Service**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

3. **Create Database and User**
   ```bash
   # Connect to MongoDB
   mongosh
   
   # Create database
   use kmu_discipline_desk
   
   # Create user (optional for local development)
   db.createUser({
     user: "kmu_user",
     pwd: "your_secure_password",
     roles: ["readWrite"]
   })
   ```

4. **Update Environment Variables**
   ```bash
   # File: backend/.env
   DB_TYPE=mongo
   MONGODB_URI=mongodb://localhost:27017/kmu_discipline_desk
   # Or with authentication:
   # MONGODB_URI=mongodb://kmu_user:your_secure_password@localhost:27017/kmu_discipline_desk
   ```

#### **Cloud MongoDB (MongoDB Atlas)**

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for free account
   - Create new cluster

2. **Configure Network Access**
   - Add your IP address to whitelist
   - Or allow access from anywhere (0.0.0.0/0) for development

3. **Create Database User**
   - Go to Database Access
   - Add new user with read/write permissions

4. **Get Connection String**
   - Go to Clusters → Connect
   - Choose "Connect your application"
   - Copy connection string

5. **Update Environment Variables**
   ```bash
   # File: backend/.env
   DB_TYPE=mongo
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kmu_discipline_desk?retryWrites=true&w=majority
   ```

### **Option 2: MySQL Setup**

#### **Local MySQL Installation**

1. **Install MySQL**
   ```bash
   # Windows: Download MySQL Installer
   # macOS: brew install mysql
   # Ubuntu: sudo apt-get install mysql-server
   ```

2. **Start MySQL Service**
   ```bash
   # Windows
   net start MySQL80
   
   # macOS
   brew services start mysql
   
   # Ubuntu
   sudo systemctl start mysql
   sudo systemctl enable mysql
   ```

3. **Secure MySQL Installation**
   ```bash
   sudo mysql_secure_installation
   ```

4. **Create Database and User**
   ```bash
   # Connect to MySQL
   mysql -u root -p
   
   # Create database
   CREATE DATABASE kmu_discipline_desk;
   
   # Create user
   CREATE USER 'kmu_user'@'localhost' IDENTIFIED BY 'your_secure_password';
   GRANT ALL PRIVILEGES ON kmu_discipline_desk.* TO 'kmu_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

5. **Update Environment Variables**
   ```bash
   # File: backend/.env
   DB_TYPE=mysql
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=kmu_user
   MYSQL_PASSWORD=your_secure_password
   MYSQL_DATABASE=kmu_discipline_desk
   ```

#### **Cloud MySQL (AWS RDS, Google Cloud SQL, etc.)**

1. **Create Cloud Database Instance**
   - Follow cloud provider's documentation
   - Choose MySQL 8.0 or higher
   - Configure security groups/firewall

2. **Get Connection Details**
   - Host endpoint
   - Port (usually 3306)
   - Username and password
   - Database name

3. **Update Environment Variables**
   ```bash
   # File: backend/.env
   DB_TYPE=mysql
   MYSQL_HOST=your-rds-endpoint.region.rds.amazonaws.com
   MYSQL_PORT=3306
   MYSQL_USER=your_username
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=kmu_discipline_desk
   ```

### **Database Switching**

To switch between databases, simply change the `DB_TYPE` in your environment variables:

```bash
# File: backend/.env
# For MongoDB
DB_TYPE=mongo
MONGODB_URI=your_mongodb_connection_string

# For MySQL
DB_TYPE=mysql
MYSQL_HOST=your_mysql_host
MYSQL_PORT=3306
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_database
```

**No code changes required** - the system automatically detects and uses the configured database.

---

## 🔌 **API Integration Approaches**

### **Option 1: Direct Database Connection**

#### **Step-by-Step Instructions**

1. **Get Database Credentials**
   ```bash
   # Contact your IT department for:
   # - Database host/IP address
   # - Port number
   # - Username and password
   # - Database name
   # - Connection type (direct or VPN)
   ```

2. **Update Environment Variables**
   ```bash
   # File: backend/.env
   # For MySQL connection to school database
   DB_TYPE=mysql
   MYSQL_HOST=school-db-server.edu
   MYSQL_PORT=3306
   MYSQL_USER=school_db_user
   MYSQL_PASSWORD=school_db_password
   MYSQL_DATABASE=school_student_db
   ```

3. **Test Connection**
   ```bash
   # Run the database test script
   cd backend
   node scripts/test-database.js
   ```

4. **No Code Changes Required** - The system will automatically connect to the school database.

### **Option 2: REST API Integration**

#### **Step-by-Step Instructions**

1. **Get API Credentials**
   ```bash
   # Contact your IT department for:
   # - API base URL
   # - API key or authentication token
   # - API documentation
   # - Rate limits
   ```

2. **Create API Service File**
   ```javascript
   // File: backend/services/schoolApiService.js
   const axios = require('axios');
   
   class SchoolApiService {
     constructor() {
       this.baseURL = process.env.SCHOOL_API_BASE_URL;
       this.apiKey = process.env.SCHOOL_API_KEY;
       this.client = axios.create({
         baseURL: this.baseURL,
         headers: {
           'Authorization': `Bearer ${this.apiKey}`,
           'Content-Type': 'application/json'
         }
       });
     }
   
     async getStudents(query = '') {
       try {
         const response = await this.client.get(`/students?q=${encodeURIComponent(query)}`);
         return response.data;
       } catch (error) {
         console.error('Error fetching students from school API:', error);
         throw error;
       }
     }
   
     async getStudentById(studentId) {
       try {
         const response = await this.client.get(`/students/${studentId}`);
         return response.data;
       } catch (error) {
         console.error('Error fetching student from school API:', error);
         throw error;
       }
     }
   
     async syncStudents() {
       try {
         const response = await this.client.get('/students/all');
         return response.data;
       } catch (error) {
         console.error('Error syncing students from school API:', error);
         throw error;
       }
     }
   }
   
   module.exports = SchoolApiService;
   ```

3. **Update Student Controller**
   ```javascript
   // File: backend/controllers/studentsController.js
   // Add at the top of the file
   const SchoolApiService = require('../services/schoolApiService.js');
   const schoolApi = new SchoolApiService();
   
   // Add this function to the existing controller
   export async function searchStudents(req, res) {
     try {
       const { q } = req.query;
       const { useSchoolApi } = req.query;
   
       if (useSchoolApi === 'true') {
         // Use school API
         const students = await schoolApi.getStudents(q);
         res.json(students);
       } else {
         // Use local database (existing code)
         // ... existing search logic
       }
     } catch (err) {
       console.error('Search error:', err);
       res.status(500).json({ error: 'Search failed' });
     }
   }
   ```

4. **Update Environment Variables**
   ```bash
   # File: backend/.env
   SCHOOL_API_BASE_URL=https://api.school.edu/v1
   SCHOOL_API_KEY=your_api_key_here
   SCHOOL_API_ENABLED=true
   ```

5. **Update Frontend Search Component**
   ```typescript
   // File: frontend/src/components/SmartStudentSearch.tsx
   // Add this option to the search function
   const searchStudents = async (query: string) => {
     setIsLoading(true);
     try {
       const useSchoolApi = localStorage.getItem('useSchoolApi') === 'true';
       const response = await fetch(
         `${API_BASE_URL}/students/search?q=${encodeURIComponent(query)}&useSchoolApi=${useSchoolApi}`, 
         {
           headers: { ...authHeaders() }
         }
       );
   
       if (response.ok) {
         const data = await response.json();
         setSuggestions(data);
         setShowSuggestions(true);
       }
     } catch (error) {
       console.error('Search failed:', error);
     } finally {
       setIsLoading(false);
     }
   };
   ```

### **Option 3: CSV/Excel Import**

#### **Step-by-Step Instructions**

1. **Export Student Data from School System**
   ```bash
   # Get CSV/Excel file from school system with columns:
   # - Student ID
   # - Full Name
   # - Department
   # - Year
   # - Gender
   # - Email (optional)
   # - Phone (optional)
   ```

2. **Upload File**
   ```bash
   # Go to: http://your-domain/students
   # Click "Import Students"
   # Select your CSV/Excel file
   # Map columns if needed
   # Click "Import"
   ```

3. **No Code Changes Required** - Use existing import functionality.

### **Option 4: LDAP/Active Directory Integration**

#### **Step-by-Step Instructions**

1. **Install LDAP Package**
   ```bash
   cd backend
   npm install ldapjs
   ```

2. **Create LDAP Service**
   ```javascript
   // File: backend/services/ldapService.js
   const ldap = require('ldapjs');
   
   class LdapService {
     constructor() {
       this.client = ldap.createClient({
         url: process.env.LDAP_URL
       });
     }
   
     async authenticate(username, password) {
       return new Promise((resolve, reject) => {
         const userDN = `cn=${username},${process.env.LDAP_BASE_DN}`;
         
         this.client.bind(userDN, password, (err) => {
           if (err) {
             reject(err);
           } else {
             resolve(true);
           }
         });
       });
     }
   
     async searchStudents(query) {
       return new Promise((resolve, reject) => {
         const searchOptions = {
           scope: 'sub',
           filter: `(&(objectClass=person)(|(cn=*${query}*)(uid=*${query}*)))`,
           attributes: ['cn', 'uid', 'department', 'mail']
         };
   
         this.client.search(process.env.LDAP_BASE_DN, searchOptions, (err, res) => {
           if (err) {
             reject(err);
             return;
           }
   
           const students = [];
           res.on('searchEntry', (entry) => {
             students.push({
               fullName: entry.object.cn,
               studentId: entry.object.uid,
               department: entry.object.department,
               email: entry.object.mail
             });
           });
   
           res.on('end', () => {
             resolve(students);
           });
         });
       });
     }
   }
   
   module.exports = LdapService;
   ```

3. **Update Environment Variables**
   ```bash
   # File: backend/.env
   LDAP_URL=ldap://ldap.school.edu:389
   LDAP_BASE_DN=dc=school,dc=edu
   LDAP_ENABLED=true
   ```

4. **Update Authentication Controller**
   ```javascript
   // File: backend/controllers/authController.js
   // Add at the top
   const LdapService = require('../services/ldapService.js');
   const ldapService = new LdapService();
   
   // Modify the login function
   export async function login(req, res) {
     try {
       const { username, password } = req.body;
   
       if (process.env.LDAP_ENABLED === 'true') {
         // Try LDAP authentication first
         try {
           await ldapService.authenticate(username, password);
           // LDAP auth successful, proceed with local user lookup
         } catch (ldapError) {
           return res.status(401).json({ error: 'Invalid credentials' });
         }
       }
   
       // ... rest of existing login logic
     } catch (error) {
       // ... error handling
     }
   }
   ```

---

## 🖥️ **Server Hosting Options**

### **Option 1: Local Server (Development/Testing)**

#### **Step-by-Step Instructions**

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/kmu-descipline-desk.git
   cd kmu-descipline-desk
   ```

2. **Install Dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Configure Environment**
   ```bash
   # File: backend/.env
   NODE_ENV=development
   PORT=5000
   JWT_SECRET=your_jwt_secret_here
   DB_TYPE=mongo
   MONGODB_URI=mongodb://localhost:27017/kmu_discipline_desk
   ```

4. **Start Development Server**
   ```bash
   # Terminal 1 - Start backend
   cd backend
   npm run dev
   
   # Terminal 2 - Start frontend
   cd frontend
   npm run dev
   ```

5. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### **Option 2: Traditional VPS/Server**

#### **Step-by-Step Instructions**

1. **Prepare Server**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install nginx -y
   
   # Install MongoDB or MySQL
   # (Follow database setup instructions above)
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone https://github.com/your-username/kmu-descipline-desk.git
   cd kmu-descipline-desk
   
   # Install dependencies
   cd backend && npm install
   cd ../frontend && npm install
   
   # Build frontend
   npm run build
   ```

3. **Configure Environment**
   ```bash
   # File: backend/.env
   NODE_ENV=production
   PORT=5000
   JWT_SECRET=your_very_secure_jwt_secret
   DB_TYPE=mongo
   MONGODB_URI=mongodb://localhost:27017/kmu_discipline_desk
   ```

4. **Configure Nginx**
   ```nginx
   # File: /etc/nginx/sites-available/kmu-discipline-desk
   server {
       listen 80;
       server_name your-domain.com;
   
       # Frontend
       location / {
           root /var/www/kmu-descipline-desk/frontend/out;
           try_files $uri $uri/ /index.html;
       }
   
       # Backend API
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
   
       # Upload directory
       location /uploads {
           alias /var/www/kmu-descipline-desk/backend/uploads;
       }
   }
   ```

5. **Enable Site and Start Services**
   ```bash
   # Enable Nginx site
   sudo ln -s /etc/nginx/sites-available/kmu-discipline-desk /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   
   # Start backend with PM2
   cd /var/www/kmu-descipline-desk/backend
   pm2 start app.js --name "kmu-backend"
   pm2 startup
   pm2 save
   ```

### **Option 3: Cloud Hosting (AWS, Google Cloud, Azure)**

#### **AWS EC2 Deployment**

1. **Launch EC2 Instance**
   ```bash
   # Use Ubuntu 20.04 LTS
   # Instance type: t3.medium or larger
   # Security groups: Allow ports 22, 80, 443
   ```

2. **Connect and Setup**
   ```bash
   # Connect via SSH
   ssh -i your-key.pem ubuntu@your-ec2-ip
   
   # Follow VPS setup instructions above
   ```

3. **Configure Domain and SSL**
   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx -y
   
   # Get SSL certificate
   sudo certbot --nginx -d your-domain.com
   ```

#### **Google Cloud Run (Serverless)**

1. **Create Dockerfile**
   ```dockerfile
   # File: Dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   # Copy package files
   COPY backend/package*.json ./
   RUN npm ci --only=production
   
   # Copy application
   COPY backend/ ./
   
   # Expose port
   EXPOSE 5000
   
   # Start application
   CMD ["node", "app.js"]
   ```

2. **Deploy to Cloud Run**
   ```bash
   # Build and deploy
   gcloud builds submit --tag gcr.io/your-project/kmu-backend
   gcloud run deploy kmu-backend \
     --image gcr.io/your-project/kmu-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

### **Option 4: Docker Deployment**

#### **Step-by-Step Instructions**

1. **Create Docker Compose File**
   ```yaml
   # File: docker-compose.yml
   version: '3.8'
   
   services:
     backend:
       build: ./backend
       ports:
         - "5000:5000"
       environment:
         - NODE_ENV=production
         - DB_TYPE=mongo
         - MONGODB_URI=mongodb://mongo:27017/kmu_discipline_desk
         - JWT_SECRET=your_jwt_secret
       depends_on:
         - mongo
       volumes:
         - ./backend/uploads:/app/uploads
   
     frontend:
       build: ./frontend
       ports:
         - "3000:3000"
       environment:
         - NEXT_PUBLIC_API_URL=http://localhost:5000
       depends_on:
         - backend
   
     mongo:
       image: mongo:5
       ports:
         - "27017:27017"
       volumes:
         - mongo_data:/data/db
   
   volumes:
     mongo_data:
   ```

2. **Create Backend Dockerfile**
   ```dockerfile
   # File: backend/Dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   
   EXPOSE 5000
   
   CMD ["node", "app.js"]
   ```

3. **Create Frontend Dockerfile**
   ```dockerfile
   # File: frontend/Dockerfile
   FROM node:18-alpine AS builder
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci
   
   COPY . .
   RUN npm run build
   
   FROM node:18-alpine AS runner
   
   WORKDIR /app
   
   COPY --from=builder /app/next.config.js ./
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   
   EXPOSE 3000
   
   CMD ["node", "server.js"]
   ```

4. **Deploy with Docker**
   ```bash
   # Build and start services
   docker-compose up -d
   
   # View logs
   docker-compose logs -f
   
   # Stop services
   docker-compose down
   ```

---

## ⚙️ **Environment Configuration**

### **Backend Environment Variables**

```bash
# File: backend/.env
# Application
NODE_ENV=production
PORT=5000
JWT_SECRET=your_very_secure_jwt_secret_here
JWT_EXPIRES_IN=24h

# Database Configuration
DB_TYPE=mongo
MONGODB_URI=mongodb://localhost:27017/kmu_discipline_desk
# OR for MySQL
# DB_TYPE=mysql
# MYSQL_HOST=localhost
# MYSQL_PORT=3306
# MYSQL_USER=your_username
# MYSQL_PASSWORD=your_password
# MYSQL_DATABASE=kmu_discipline_desk

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# School Integration (Optional)
SCHOOL_API_BASE_URL=https://api.school.edu/v1
SCHOOL_API_KEY=your_api_key
SCHOOL_API_ENABLED=false

# LDAP Integration (Optional)
LDAP_URL=ldap://ldap.school.edu:389
LDAP_BASE_DN=dc=school,dc=edu
LDAP_ENABLED=false

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### **Frontend Environment Variables**

```bash
# File: frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=KMU DisciplineDesk
NEXT_PUBLIC_VERSION=1.0.0
```

---

## 🔒 **Security Considerations**

### **Essential Security Measures**

1. **Strong Passwords**
   ```bash
   # Use strong, unique passwords for:
   # - Database users
   # - JWT secrets
   # - API keys
   # - Admin accounts
   ```

2. **HTTPS/SSL**
   ```bash
   # Always use HTTPS in production
   # Configure SSL certificates
   # Redirect HTTP to HTTPS
   ```

3. **Firewall Configuration**
   ```bash
   # Only open necessary ports:
   # - 22 (SSH)
   # - 80 (HTTP)
   # - 443 (HTTPS)
   # - Database port (if external access needed)
   ```

4. **Regular Updates**
   ```bash
   # Keep system and dependencies updated
   npm audit fix
   sudo apt update && sudo apt upgrade
   ```

5. **Backup Strategy**
   ```bash
   # Regular database backups
   # File system backups
   # Configuration backups
   ```

### **Security Checklist**

- [ ] Change default passwords
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Set up regular backups
- [ ] Enable audit logging
- [ ] Implement rate limiting
- [ ] Use environment variables for secrets
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Test security measures

---

## 📊 **Monitoring & Maintenance**

### **Process Management with PM2**

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start backend/app.js --name "kmu-backend"

# Monitor processes
pm2 status
pm2 logs kmu-backend

# Restart application
pm2 restart kmu-backend

# Auto-start on boot
pm2 startup
pm2 save
```

### **Log Management**

```bash
# View application logs
tail -f backend/logs/app.log

# View error logs
tail -f backend/logs/error.log

# Rotate logs (add to crontab)
0 0 * * * /usr/sbin/logrotate /etc/logrotate.d/kmu-discipline-desk
```

### **Database Maintenance**

```bash
# MongoDB backup
mongodump --db kmu_discipline_desk --out /backup/$(date +%Y%m%d)

# MySQL backup
mysqldump -u username -p kmu_discipline_desk > /backup/$(date +%Y%m%d).sql

# Restore from backup
# MongoDB
mongorestore --db kmu_discipline_desk /backup/20231201/kmu_discipline_desk/

# MySQL
mysql -u username -p kmu_discipline_desk < /backup/20231201.sql
```

### **Performance Monitoring**

```bash
# Monitor system resources
htop
df -h
free -h

# Monitor application performance
pm2 monit

# Check database performance
# MongoDB
db.stats()
db.cases.stats()

# MySQL
SHOW STATUS LIKE 'Slow_queries';
SHOW PROCESSLIST;
```

---

## 🔧 **Troubleshooting**

### **Common Issues and Solutions**

#### **1. Database Connection Issues**

**Problem:** Cannot connect to database
```bash
# Check if database service is running
sudo systemctl status mongod
sudo systemctl status mysql

# Check connection string
echo $MONGODB_URI
echo $MYSQL_HOST

# Test connection manually
mongosh "your_connection_string"
mysql -h host -u user -p database
```

**Solution:**
- Verify database service is running
- Check connection credentials
- Ensure network connectivity
- Verify firewall settings

#### **2. Port Already in Use**

**Problem:** Port 5000 is already in use
```bash
# Check what's using the port
sudo lsof -i :5000
sudo netstat -tulpn | grep :5000

# Kill the process
sudo kill -9 <PID>
```

**Solution:**
- Change port in environment variables
- Kill conflicting process
- Use different port for development

#### **3. File Upload Issues**

**Problem:** Cannot upload files
```bash
# Check directory permissions
ls -la backend/uploads/
sudo chown -R node:node backend/uploads/
sudo chmod -R 755 backend/uploads/
```

**Solution:**
- Fix directory permissions
- Check disk space
- Verify file size limits

#### **4. Frontend Build Issues**

**Problem:** Frontend build fails
```bash
# Clear cache and reinstall
rm -rf frontend/node_modules
rm -rf frontend/.next
npm install
npm run build
```

**Solution:**
- Clear cache and node_modules
- Update dependencies
- Check for TypeScript errors

#### **5. API Integration Issues**

**Problem:** School API not working
```bash
# Test API connection
curl -H "Authorization: Bearer your_api_key" \
     https://api.school.edu/v1/students

# Check environment variables
echo $SCHOOL_API_BASE_URL
echo $SCHOOL_API_KEY
```

**Solution:**
- Verify API credentials
- Check network connectivity
- Test API endpoints manually
- Review API documentation

### **Debug Mode**

Enable debug mode for troubleshooting:

```bash
# File: backend/.env
NODE_ENV=development
DEBUG=*
LOG_LEVEL=debug
```

### **Health Check Endpoint**

Test system health:

```bash
# Check backend health
curl http://localhost:5000/api/health

# Expected response:
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

---

## 📞 **Support and Resources**

### **Useful Commands**

```bash
# Check system status
pm2 status
sudo systemctl status nginx
sudo systemctl status mongod

# View logs
pm2 logs
sudo journalctl -u nginx
sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart all
sudo systemctl restart nginx
sudo systemctl restart mongod

# Check disk space
df -h
du -sh /var/www/kmu-descipline-desk

# Check memory usage
free -h
top
```

### **Emergency Procedures**

1. **System Down**
   ```bash
   # Restart all services
   pm2 restart all
   sudo systemctl restart nginx
   sudo systemctl restart mongod
   ```

2. **Database Issues**
   ```bash
   # Check database status
   sudo systemctl status mongod
   
   # Restart database
   sudo systemctl restart mongod
   
   # Check logs
   sudo tail -f /var/log/mongodb/mongod.log
   ```

3. **Security Breach**
   ```bash
   # Change all passwords
   # Review access logs
   # Update security configurations
   # Contact security team
   ```

### **Contact Information**

- **Technical Support:** tech-support@school.edu
- **System Administrator:** admin@school.edu
- **Emergency Contact:** +1-555-0123

---

## 🎯 **Quick Start Checklist**

### **For New Deployment**

- [ ] Install prerequisites (Node.js, database)
- [ ] Clone repository
- [ ] Install dependencies
- [ ] Configure environment variables
- [ ] Set up database
- [ ] Test database connection
- [ ] Start backend server
- [ ] Build frontend
- [ ] Start frontend server
- [ ] Test application
- [ ] Configure production settings
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Test security measures
- [ ] Document configuration

### **For API Integration**

- [ ] Get API credentials from IT department
- [ ] Test API connectivity
- [ ] Update environment variables
- [ ] Modify code if needed
- [ ] Test integration
- [ ] Configure error handling
- [ ] Set up monitoring
- [ ] Document integration

### **For Database Switch**

- [ ] Install new database
- [ ] Configure new database
- [ ] Update environment variables
- [ ] Test connection
- [ ] Migrate data (if needed)
- [ ] Update backup procedures
- [ ] Test application
- [ ] Monitor performance

---

**🎉 Congratulations!** You now have a comprehensive deployment guide for KMU DisciplineDesk. This guide covers all major deployment scenarios and should help anyone, regardless of technical expertise, successfully deploy and maintain the system.

**Remember:** Always test in a development environment before deploying to production, and keep backups of your configuration and data. 