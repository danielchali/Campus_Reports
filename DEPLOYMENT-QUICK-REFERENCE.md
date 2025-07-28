# 🚀 **KMU DisciplineDesk - Quick Deployment Reference**

## ⚡ **Quick Start Commands**

### **Development Setup**
```bash
# Clone and setup
git clone https://github.com/your-username/kmu-descipline-desk.git
cd kmu-descipline-desk

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start development servers
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev   # Terminal 2
```

### **Production Deployment**
```bash
# Build frontend
cd frontend && npm run build

# Start backend with PM2
cd backend && pm2 start app.js --name "kmu-backend"
pm2 startup && pm2 save
```

## 🗄️ **Database Quick Setup**

### **MongoDB**
```bash
# Install MongoDB
sudo apt install mongodb

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database
mongosh
use kmu_discipline_desk
```

### **MySQL**
```bash
# Install MySQL
sudo apt install mysql-server

# Secure installation
sudo mysql_secure_installation

# Create database
mysql -u root -p
CREATE DATABASE kmu_discipline_desk;
CREATE USER 'kmu_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON kmu_discipline_desk.* TO 'kmu_user'@'localhost';
```

## 🔧 **Environment Configuration**

### **Backend (.env)**
```bash
NODE_ENV=production
PORT=5000
JWT_SECRET=your_secure_secret
DB_TYPE=mongo
MONGODB_URI=mongodb://localhost:27017/kmu_discipline_desk
```

### **Frontend (.env.local)**
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## 🔌 **API Integration Quick Setup**

### **School Database Connection**
```bash
# Update backend/.env
DB_TYPE=mysql
MYSQL_HOST=school-db-server.edu
MYSQL_USER=school_user
MYSQL_PASSWORD=school_password
MYSQL_DATABASE=school_db
```

### **School API Integration**
```bash
# Update backend/.env
SCHOOL_API_BASE_URL=https://api.school.edu/v1
SCHOOL_API_KEY=your_api_key
SCHOOL_API_ENABLED=true
```

## 🖥️ **Server Deployment**

### **VPS/Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

### **Docker Deployment**
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔒 **Security Checklist**

- [ ] Change default passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall
- [ ] Set up backups
- [ ] Enable audit logging
- [ ] Use environment variables
- [ ] Regular updates

## 📊 **Monitoring Commands**

```bash
# Check PM2 status
pm2 status
pm2 logs kmu-backend

# Check system resources
htop
df -h
free -h

# Check services
sudo systemctl status nginx
sudo systemctl status mongod
```

## 🚨 **Troubleshooting**

### **Common Issues**
```bash
# Port in use
sudo lsof -i :5000
sudo kill -9 <PID>

# Database connection
sudo systemctl status mongod
mongosh "your_connection_string"

# File permissions
sudo chown -R node:node backend/uploads/
sudo chmod -R 755 backend/uploads/

# Build issues
rm -rf frontend/node_modules frontend/.next
npm install && npm run build
```

### **Health Check**
```bash
# Test backend
curl http://localhost:5000/api/health

# Test frontend
curl http://localhost:3000
```

## 📞 **Emergency Contacts**

- **Technical Support:** tech-support@school.edu
- **System Admin:** admin@school.edu
- **Emergency:** +1-555-0123

## 🎯 **Quick Deployment Checklist**

### **New Installation**
- [ ] Install prerequisites
- [ ] Clone repository
- [ ] Install dependencies
- [ ] Configure environment
- [ ] Setup database
- [ ] Test connection
- [ ] Start services
- [ ] Configure production
- [ ] Setup monitoring
- [ ] Test security

### **API Integration**
- [ ] Get API credentials
- [ ] Test connectivity
- [ ] Update environment
- [ ] Test integration
- [ ] Monitor performance

### **Database Switch**
- [ ] Install new database
- [ ] Configure connection
- [ ] Update environment
- [ ] Test application
- [ ] Update backups

---

**💡 Tip:** Always test in development before production deployment! 