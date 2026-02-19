# CBD Wellness 24 - Production Deployment Guide

## Server Information
- **IP Address**: 154.66.197.104
- **Domain**: portal.cbdwellness24.co.za
- **Backend Port**: 3001
- **MongoDB**: Local on server

---

## Pre-Deployment Checklist

### Files Prepared
- ✅ `comingsoon.html` - API URL configured to `http://154.66.197.104:3001/api/v1`
- ✅ `backend/server.js` - CORS configured for production server
- ✅ Deployment package ready: `cbd-wellness-backend-deploy.tar.gz`

### What's Configured
- API endpoint points to production server
- CORS allows requests from cbdwellness24.co.za domains
- Lead forms submit to MongoDB
- Admin dashboard has Leads tab for viewing submissions

---

## PART 1: Server Inspection Commands

### Run these commands on YOUR server to check current state:

```bash
# 1. Check what's currently running in PM2
pm2 list

# 2. Check if MongoDB is running
sudo systemctl status mongod
# OR
ps aux | grep mongod

# 3. Check what's listening on port 3001 (our app port)
sudo lsof -i :3001
# OR
sudo netstat -tulpn | grep 3001

# 4. Check existing MongoDB databases
mongosh --eval "show dbs"

# 5. Check if cbdwellness24 database exists
mongosh cbdwellness24 --eval "db.stats()"

# 6. List current directory structure
ls -la /var/www/
# OR wherever your apps are located
ls -la ~/apps/

# 7. Check Node.js version
node --version

# 8. Check npm version
npm --version

# 9. Check available disk space
df -h

# 10. Check memory usage
free -h
```

---

## PART 2: Deployment Steps

### Step 1: Upload Deployment Package

Upload `cbd-wellness-backend-deploy.tar.gz` to your server.

**Option A: Using SCP (from your local machine)**
```bash
scp cbd-wellness-backend-deploy.tar.gz root@154.66.197.104:/tmp/
```

**Option B: Using SFTP**
```bash
sftp root@154.66.197.104
put cbd-wellness-backend-deploy.tar.gz /tmp/
exit
```

### Step 2: Prepare Application Directory

```bash
# SSH into your server
ssh root@154.66.197.104

# Create application directory (if it doesn't exist)
mkdir -p /var/www/cbd-wellness-24
cd /var/www/cbd-wellness-24

# Extract the deployment package
tar -xzf /tmp/cbd-wellness-backend-deploy.tar.gz

# Verify extraction
ls -la
```

### Step 3: Install Dependencies

```bash
cd /var/www/cbd-wellness-24

# Install Node.js dependencies
npm install --production

# This will install all required packages
```

### Step 4: Configure Environment Variables

```bash
# Create .env file
nano .env
```

**Add the following content**:
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/cbdwellness24

# JWT Secret (CHANGE THIS TO A RANDOM STRING)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Session Secret (CHANGE THIS TO A RANDOM STRING)
SESSION_SECRET=your-super-secret-session-key-change-this-too

# Email Configuration (Optional - for notifications)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password
```

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

### Step 5: Seed Database

```bash
cd /var/www/cbd-wellness-24

# Seed test users
node backend/scripts/seed-test-users.js

# Seed lifestyle products
node backend/scripts/seed-lifestyle-products.js

# Seed medical products
node backend/scripts/seed-medical-products.js
```

**Expected Output**: You should see confirmation messages for each seeding script.

### Step 6: Test the Backend Locally

```bash
# Start server in test mode
cd /var/www/cbd-wellness-24
node backend/server.js
```

**Expected Output**:
```
🚀 Server running on http://localhost:3001
📱 Dashboard: http://localhost:3001/dashboard
🔐 Login: http://localhost:3001/login
🛠️ Admin: http://localhost:3001/admin
✅ Connected to MongoDB
```

**Test API endpoint**:
```bash
# In another SSH session
curl http://localhost:3001/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","mobile":"+27123456789","type":"waiting-list"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Thank you! Your submission has been received...",
  "leadId": "..."
}
```

**If test is successful, stop the server**: Press `Ctrl+C`

### Step 7: Configure PM2

```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

**Add the following content**:
```javascript
module.exports = {
  apps: [{
    name: 'cbd-wellness-24',
    script: 'backend/server.js',
    cwd: '/var/www/cbd-wellness-24',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/www/cbd-wellness-24/logs/error.log',
    out_file: '/var/www/cbd-wellness-24/logs/out.log',
    log_file: '/var/www/cbd-wellness-24/logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '500M',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

**Save and exit**: `Ctrl+X`, `Y`, `Enter`

```bash
# Create logs directory
mkdir -p /var/www/cbd-wellness-24/logs
```

### Step 8: Start Application with PM2

```bash
# Start the application
pm2 start ecosystem.config.js

# Verify it's running
pm2 list

# Check logs
pm2 logs cbd-wellness-24 --lines 50

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions it provides
```

### Step 9: Verify Application is Running

```bash
# Check if app is listening on port 3001
sudo netstat -tulpn | grep 3001

# Test API from server
curl http://localhost:3001/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Server Test","email":"servertest@example.com","mobile":"+27987654321","type":"waiting-list"}'

# Check MongoDB for the test lead
mongosh cbdwellness24 --eval "db.leads.find().sort({createdAt:-1}).limit(1).pretty()"
```

### Step 10: Configure Firewall (if needed)

```bash
# Allow port 3001 through firewall
sudo ufw allow 3001/tcp

# Reload firewall
sudo ufw reload

# Check firewall status
sudo ufw status
```

---

## PART 3: Deploy Coming Soon Page

### Upload comingsoon.html to Web Server

**Option 1: Same server (recommended)**
```bash
# Upload comingsoon.html
scp comingsoon.html root@154.66.197.104:/var/www/html/

# OR rename it to index.html
scp comingsoon.html root@154.66.197.104:/var/www/html/index.html
```

**Option 2: Different web hosting**
Upload `comingsoon.html` to wherever cbdwellness24.co.za is hosted.

---

## PART 4: Smoke Testing

### Test 1: Backend Health Check

```bash
# From your local machine
curl http://154.66.197.104:3001/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"External Test","email":"external@test.com","mobile":"+27111222333","type":"waiting-list"}'
```

**Expected**: Success response with leadId

### Test 2: Coming Soon Page

1. Open browser: `http://cbdwellness24.co.za/comingsoon.html`
2. Fill out "Join Waiting List" form
3. Submit
4. Verify success message appears
5. Check browser console for any errors (F12 → Console tab)

### Test 3: Verify in MongoDB

```bash
# SSH into server
ssh root@154.66.197.104

# Check leads in MongoDB
mongosh cbdwellness24
```

```javascript
// In mongosh:
db.leads.find().sort({createdAt:-1}).limit(5).pretty()

// Count total leads
db.leads.countDocuments()

// Check waiting list leads
db.leads.find({type: "waiting-list"}).count()

// Check franchise applications
db.leads.find({type: "franchise-application"}).count()

// Exit mongosh
exit
```

### Test 4: Admin Dashboard

1. Open: `http://154.66.197.104:3001/admin.html`
2. Login:
   - Email: admin@cbdwellness24.co.za
   - Password: Admin123!
3. Click "Leads" tab
4. Verify you can see submitted leads
5. Try updating a lead status

---

## PART 5: PM2 Management Commands

### View Application Status
```bash
# List all PM2 processes
pm2 list

# View detailed info for cbd-wellness-24
pm2 show cbd-wellness-24

# View logs (live)
pm2 logs cbd-wellness-24

# View last 100 lines of logs
pm2 logs cbd-wellness-24 --lines 100

# View only error logs
pm2 logs cbd-wellness-24 --err
```

### Start/Stop/Restart
```bash
# Stop the application
pm2 stop cbd-wellness-24

# Start the application
pm2 start cbd-wellness-24

# Restart the application (if you make changes)
pm2 restart cbd-wellness-24

# Reload (zero-downtime restart)
pm2 reload cbd-wellness-24
```

### Monitoring
```bash
# Real-time monitoring
pm2 monit

# CPU and memory usage
pm2 list
```

---

## PART 6: MongoDB Management

### Export Database (Backup)

```bash
# Export entire database
mongodump --db cbdwellness24 --out /tmp/mongodb-backup-$(date +%Y%m%d)

# Export only leads collection
mongoexport --db cbdwellness24 --collection leads --out /tmp/leads-backup-$(date +%Y%m%d).json

# Compress backup
tar -czf mongodb-backup-$(date +%Y%m%d).tar.gz /tmp/mongodb-backup-$(date +%Y%m%d)
```

### Import Database (Restore)

```bash
# Restore entire database
mongorestore --db cbdwellness24 /tmp/mongodb-backup-20241104/cbdwellness24/

# Import specific collection
mongoimport --db cbdwellness24 --collection leads --file /tmp/leads-backup-20241104.json
```

### Query Leads

```bash
# Enter mongosh
mongosh cbdwellness24
```

```javascript
// View all leads
db.leads.find().pretty()

// Count leads by type
db.leads.aggregate([
  { $group: { _id: "$type", count: { $sum: 1 } } }
])

// Find leads from today
db.leads.find({
  createdAt: {
    $gte: new Date(new Date().setHours(0,0,0,0))
  }
}).pretty()

// Find leads by status
db.leads.find({ status: "new" }).pretty()

// Get lead statistics
db.leads.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  }
])
```

---

## PART 7: Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs cbd-wellness-24 --err --lines 50

# Check if port 3001 is already in use
sudo lsof -i :3001

# Kill process on port 3001 (if needed)
sudo kill -9 $(sudo lsof -t -i:3001)

# Restart application
pm2 restart cbd-wellness-24
```

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### CORS Errors

If you see CORS errors in browser console:
1. Verify the domain is in `backend/server.js` allowedOrigins (lines 57-70)
2. Restart PM2 app: `pm2 restart cbd-wellness-24`

### Form Submission Fails

```bash
# Test API directly from server
curl http://localhost:3001/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Debug Test","email":"debug@test.com","mobile":"+27123456789","type":"waiting-list"}'

# Check PM2 logs for errors
pm2 logs cbd-wellness-24 --lines 100

# Check MongoDB for leads
mongosh cbdwellness24 --eval "db.leads.find().count()"
```

---

## PART 8: Monitoring & Maintenance

### Daily Checks

```bash
# Check PM2 status
pm2 list

# Check application uptime
pm2 show cbd-wellness-24 | grep uptime

# Check error logs
pm2 logs cbd-wellness-24 --err --lines 20

# Check lead count
mongosh cbdwellness24 --eval "db.leads.find().count()"
```

### Weekly Backup

```bash
# Backup MongoDB
mongodump --db cbdwellness24 --out /backups/mongodb-$(date +%Y%m%d)

# Compress backup
tar -czf /backups/cbd-wellness-$(date +%Y%m%d).tar.gz /backups/mongodb-$(date +%Y%m%d)

# Remove old backups (older than 30 days)
find /backups -name "*.tar.gz" -mtime +30 -delete
```

---

## Quick Reference

### Server Details
- **Server IP**: 154.66.197.104
- **Domain**: portal.cbdwellness24.co.za
- **App Port**: 3001
- **PM2 App Name**: cbd-wellness-24

### Key Files
- **App Directory**: `/var/www/cbd-wellness-24`
- **PM2 Config**: `/var/www/cbd-wellness-24/ecosystem.config.js`
- **Environment**: `/var/www/cbd-wellness-24/.env`
- **Logs**: `/var/www/cbd-wellness-24/logs/`

### Test Credentials
- **Admin**: admin@cbdwellness24.co.za / Admin123!
- **Manager**: manager@cbdwellness24.co.za / Manager123!
- **User**: user@cbdwellness24.co.za / User123!
- **Patient**: patient@cbdwellness24.co.za / Patient123!

### Important URLs
- **API Base**: http://154.66.197.104:3001/api/v1
- **Admin Dashboard**: http://154.66.197.104:3001/admin.html
- **User Dashboard**: http://154.66.197.104:3001/dashboard.html
- **Login**: http://154.66.197.104:3001/login.html

---

## Support Commands Cheat Sheet

```bash
# Quick status check
pm2 list && mongosh --eval "show dbs"

# View latest leads
mongosh cbdwellness24 --eval "db.leads.find().sort({createdAt:-1}).limit(5).pretty()"

# Restart app
pm2 restart cbd-wellness-24

# View live logs
pm2 logs cbd-wellness-24

# Application health
curl http://localhost:3001/api/v1/leads

# MongoDB status
sudo systemctl status mongod
```

---

## Next Steps After Deployment

1. ✅ Verify PM2 shows app running
2. ✅ Test API endpoint responds
3. ✅ Submit test lead through comingsoon.html
4. ✅ Verify lead appears in MongoDB
5. ✅ Login to admin dashboard and view leads
6. ✅ Set up daily backups
7. ✅ Monitor PM2 logs for first 24 hours
8. 📧 (Optional) Configure email notifications for new leads

---

**Deployment Package**: `cbd-wellness-backend-deploy.tar.gz`
**Created**: 2024-11-04
**Version**: 1.0.0
