# Institutional Deployment Guide

This guide provides comprehensive instructions for deploying the KMU Discipline Desk application in any institutional environment, whether on-premises servers, cloud platforms, or hybrid environments.

## Deployment Architecture Options

### 1. Single Server Deployment
- Both frontend and backend on the same server
- Ideal for small institutions or testing environments
- Easiest to manage and maintain

### 2. Multi-Server Deployment
- Frontend and backend on separate servers
- Better scalability and security isolation
- Recommended for production environments

### 3. Containerized Deployment (Docker)
- Deploy using Docker containers
- Ensures consistency across environments
- Easy scaling and management

### 4. Cloud Deployment
- Deploy to AWS, Azure, Google Cloud, or other cloud providers
- Highly scalable and redundant
- Pay-as-you-go pricing model

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 20 GB SSD
- **Network**: 100 Mbps connection

### Recommended Requirements
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: 1 Gbps connection

## Database Options

### MongoDB (Default)
- **Local Installation**: Install MongoDB on your server
- **Cloud Service**: MongoDB Atlas, AWS DocumentDB
- **Replica Sets**: For high availability

### MySQL (Alternative)
- **Local Installation**: Install MySQL on your server
- **Cloud Service**: AWS RDS, Google Cloud SQL
- **Replication**: For high availability

## Deployment Scenarios

### Scenario 1: On-Premises Single Server

#### Server Setup
1. Install Ubuntu 20.04 LTS or CentOS 8
2. Install Node.js 18+:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. Install MongoDB:
   ```bash
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```
4. Install Nginx:
   ```bash
   sudo apt-get install nginx
   ```

#### Application Deployment
1. Clone the repository:
   ```bash
   git clone https://github.com/your-institution/KMU-DisciplineDesk.git
   cd KMU-DisciplineDesk
   ```
2. Configure backend environment:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```
3. Install backend dependencies:
   ```bash
   npm install
   ```
4. Configure frontend environment:
   ```bash
   cd ../frontend
   cp .env.example .env.local
   # Edit .env.local with your API URL
   ```
5. Install frontend dependencies:
   ```bash
   npm install
   npm run build
   ```

#### Nginx Configuration
Create `/etc/nginx/sites-available/discipline-desk`:
```nginx
server {
    listen 80;
    server_name your-domain.edu;

    # Frontend
    location / {
        root /path/to/KMU-DisciplineDesk/frontend/out;
        index index.html;
        try_files $uri $uri/ =404;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/discipline-desk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Service Configuration
Create systemd service for backend:
```bash
sudo nano /etc/systemd/system/discipline-desk-backend.service
```

```ini
[Unit]
Description=KMU Discipline Desk Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/KMU-DisciplineDesk/backend
ExecStart=/usr/bin/node ./bin/www
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable discipline-desk-backend
sudo systemctl start discipline-desk-backend
```

### Scenario 2: Separate Frontend and Backend Servers

#### Backend Server
Follow steps 1-3 from Scenario 1, then:

Configure CORS for your frontend domain:
```env
# In backend/.env
CORS_ORIGIN=https://frontend.your-institution.edu
FRONTEND_URL=https://frontend.your-institution.edu
```

#### Frontend Server
Follow steps 1, 4-5 from Scenario 1, then configure API URL:
```env
# In frontend/.env.local
NEXT_PUBLIC_API_BASE_URL=https://backend.your-institution.edu/api
```

### Scenario 3: Docker Deployment

#### Docker Compose Setup
Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: discipline_mongodb
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: your_secure_password
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    container_name: discipline_backend
    restart: always
    depends_on:
      - mongodb
    environment:
      - NODE_ENV=production
      - DB_TYPE=mongo
      - MONGODB_URI=mongodb://admin:your_secure_password@mongodb:27017/discipline_desk?authSource=admin
      - JWT_SECRET=your_very_secure_jwt_secret
      - CORS_ORIGIN=http://localhost:3000,https://your-frontend-domain.edu
      - FRONTEND_URL=https://your-frontend-domain.edu
    ports:
      - "5000:5000"
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build: ./frontend
    container_name: discipline_frontend
    restart: always
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://backend:5000/api
    ports:
      - "3000:3000"

volumes:
  mongodb_data:
```

#### Dockerfile for Backend
Create `backend/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "./bin/www"]
```

#### Dockerfile for Frontend
Create `frontend/Dockerfile`:
```dockerfile
FROM node:18-alpine as dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:18-alpine as builder
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine as runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=dependencies /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
```

Deploy with:
```bash
docker-compose up -d
```

## Environment Variables

### Backend Required Variables
- `NODE_ENV` = `production`
- `DB_TYPE` = `mongo` or `mysql`
- `JWT_SECRET` = secure random string
- `MONGODB_URI` or MySQL connection details
- `CORS_ORIGIN` = comma-separated list of allowed frontend URLs
- `FRONTEND_URL` = primary frontend URL

### Frontend Required Variables
- `NEXT_PUBLIC_API_BASE_URL` = backend API URL

### Optional Variables
- `PORT` = server port (default: 5000 for backend, 3000 for frontend)
- `LOG_LEVEL` = logging level (debug, info, warn, error)
- `UPLOAD_PATH` = file upload directory
- `MAX_FILE_SIZE` = maximum file upload size

## Security Considerations

### 1. SSL/TLS Encryption
- Use Let's Encrypt for free SSL certificates
- Configure HTTPS for all communications
- Redirect HTTP to HTTPS

### 2. Authentication
- Use strong passwords for all accounts
- Implement two-factor authentication (2FA)
- Regularly rotate JWT secrets

### 3. Database Security
- Use strong database credentials
- Enable database authentication
- Regular backups with encryption

### 4. Network Security
- Use firewalls to restrict access
- Implement rate limiting
- Monitor for suspicious activity

### 5. File Security
- Validate all file uploads
- Store files outside web root
- Implement antivirus scanning

## Backup and Recovery

### Database Backup
```bash
# MongoDB backup
mongodump --host localhost --port 27017 --username admin --password your_password --out /backup/mongodb

# MySQL backup
mysqldump -u username -p database_name > /backup/mysql/backup.sql
```

### File Backup
```bash
# Backup uploads directory
tar -czf /backup/uploads-$(date +%Y%m%d).tar.gz /path/to/uploads
```

### Automated Backup Script
Create `/opt/backup-discipline.sh`:
```bash
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/discipline/$DATE"

mkdir -p $BACKUP_DIR

# Database backup
mongodump --host localhost --port 27017 --username admin --password your_password --out $BACKUP_DIR/mongodb

# File backup
tar -czf $BACKUP_DIR/uploads.tar.gz /path/to/uploads

# Compress everything
tar -czf /backup/discipline-backup-$DATE.tar.gz -C /backup/discipline $DATE

# Clean up old backups (keep last 30 days)
find /backup/discipline -type d -mtime +30 -exec rm -rf {} +
```

Schedule with cron:
```bash
# Daily backup at 2 AM
0 2 * * * /opt/backup-discipline.sh
```

## Monitoring and Maintenance

### System Monitoring
- CPU, memory, and disk usage
- Network connectivity
- Application responsiveness

### Log Monitoring
- Application logs
- Database logs
- System logs

### Performance Tuning
- Database indexing
- Caching strategies
- Load balancing (for high-traffic environments)

## Scaling Considerations

### Horizontal Scaling
- Load balancer for multiple backend instances
- Database replication
- CDN for static assets

### Vertical Scaling
- Increase server resources
- Database optimization
- Application optimization

## Troubleshooting Common Issues

### 1. Database Connection Issues
- Check database service status
- Verify connection string
- Check firewall rules

### 2. CORS Errors
- Verify CORS_ORIGIN environment variable
- Check frontend URL configuration
- Ensure proper headers are set

### 3. File Upload Issues
- Check file permissions
- Verify upload directory exists
- Check file size limits

### 4. Authentication Issues
- Verify JWT_SECRET consistency
- Check user credentials
- Review authentication logs

## Support and Maintenance

### Regular Maintenance Tasks
- Update dependencies
- Apply security patches
- Monitor system performance
- Review logs for errors

### Contact Information
For institutional support, contact your IT department or the system administrator responsible for this deployment.

### Community Support
- GitHub Issues: https://github.com/your-institution/KMU-DisciplineDesk/issues
- Documentation: https://github.com/your-institution/KMU-DisciplineDesk/wiki