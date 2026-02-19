# CBD Wellness 24 - Safe Deployment Plan

## Server Analysis Summary

### ✅ Current PM2 Apps (DO NOT TOUCH)
- `openpharms-v12` (ID: 0) - Running on unknown port
- `portal-openpharms` (ID: 3) - Running on unknown port
- `stoep-uat` (ID: 7) - Running on port 3021

### ✅ MongoDB Status
- **Version**: 7.0.24 - COMPATIBLE
- **Running**: Active since Sept 24, 2025
- **Existing Databases**: admin, config, local, openpharms, stoep
- **cbdwellness24**: Does NOT exist (GOOD - we'll create it)

### ✅ Port Availability
- **Port 3001**: FREE ✓
- **Port 80**: Nginx
- **Port 443**: Nginx
- **Port 3000**: Node app (stoep)
- **Port 27017**: MongoDB (localhost only)

### ✅ Node.js
- **Version**: v18.20.8 - COMPATIBLE
- **npm**: 10.8.2

### ✅ Resources
- **Disk**: 197GB total, 85GB used, 103GB free (45% used) - PLENTY OF SPACE
- **Memory**: 7.8GB total, 1GB used, 6.4GB available - EXCELLENT

### ✅ Firewall
- Port 3001: NOT currently allowed (we'll add it)
- Ports 80, 443, 3009, 3021: Already allowed

---

## Safe Deployment Steps

### Step 1: Upload Backend Package

```bash
# On your local machine
scp cbd-wellness-backend-deploy.tar.gz root@154.66.197.104:/tmp/
```

### Step 2: SSH and Create Directory

```bash
ssh root@154.66.197.104

# Create new directory (won't conflict with anything)
mkdir -p /var/www/cbd-wellness-24
cd /var/www/cbd-wellness-24

# Extract
tar -xzf /tmp/cbd-wellness-backend-deploy.tar.gz

# Verify
ls -la
```

### Step 3: Install Dependencies

```bash
cd /var/www/cbd-wellness-24
npm install --production
```

### Step 4: Create .env File

```bash
nano .env
```

**Content**:
```env
PORT=3001
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/cbdwellness24
JWT_SECRET=cbd-wellness-24-super-secret-key-change-in-production-2024
SESSION_SECRET=cbd-wellness-24-session-secret-change-in-production-2024
```

**Save**: `Ctrl+X`, `Y`, `Enter`

### Step 5: Seed Database (Creates New DB)

```bash
cd /var/www/cbd-wellness-24

# Seed test users
node backend/scripts/seed-test-users.js

# Seed lifestyle products
node backend/scripts/seed-lifestyle-products.js

# Seed medical products
node backend/scripts/seed-medical-products.js

# Verify database was created
mongosh --eval "show dbs" --quiet | grep cbdwellness24
```

**Expected Output**: You should see `cbdwellness24` in the database list

### Step 6: Create PM2 Ecosystem File

```bash
cd /var/www/cbd-wellness-24
nano ecosystem.config.js
```

**Content**:
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

**Save**: `Ctrl+X`, `Y`, `Enter`

```bash
# Create logs directory
mkdir -p /var/www/cbd-wellness-24/logs
```

### Step 7: Test Backend Before PM2

```bash
cd /var/www/cbd-wellness-24

# Start server directly to test
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

**Press Ctrl+C to stop after you see this**

### Step 8: Start with PM2

```bash
cd /var/www/cbd-wellness-24

# Start the app
pm2 start ecosystem.config.js

# Check status (should show cbd-wellness-24 with other apps)
pm2 list

# View logs
pm2 logs cbd-wellness-24 --lines 50

# Save PM2 config
pm2 save
```

**Expected PM2 List**:
```
│ 0  │ openpharms-v12     │ fork     │ 0    │ online    │
│ 3  │ portal-openpharms  │ fork     │ 124  │ online    │
│ 7  │ stoep-uat          │ fork     │ 0    │ online    │
│ 8  │ cbd-wellness-24    │ fork     │ 0    │ online    │  ← NEW
```

### Step 9: Open Firewall for Port 3001

```bash
# Allow port 3001
sudo ufw allow 3001/tcp

# Reload firewall
sudo ufw reload

# Verify
sudo ufw status | grep 3001
```

### Step 10: Test API Endpoint

```bash
# Test from server
curl http://localhost:3001/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Local Test","email":"local@test.com","mobile":"+27123456789","type":"waiting-list"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Thank you! Your submission has been received...",
  "leadId": "..."
}
```

### Step 11: Test from External (Your Computer)

```bash
# From your local machine
curl http://154.66.197.104:3001/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"External Test","email":"external@test.com","mobile":"+27111222333","type":"waiting-list"}'
```

**Expected**: Same success response

### Step 12: Verify in MongoDB

```bash
# On server
mongosh cbdwellness24

# In mongosh
db.leads.find().pretty()
db.leads.countDocuments()

# Exit
exit
```

---

## Create Nginx Config for Admin Access (Optional)

If you want to access admin dashboard via domain instead of IP:

```bash
sudo nano /etc/nginx/sites-available/cbd-wellness-24
```

**Content**:
```nginx
server {
    listen 80;
    server_name portal.cbdwellness24.co.za;

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    # Admin/Dashboard Pages
    location / {
        proxy_pass http://localhost:3001;
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

**Save and enable**:
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/cbd-wellness-24 /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Smoke Testing

### Test 1: Backend Health
```bash
curl http://154.66.197.104:3001/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke Test","email":"smoke@test.com","mobile":"+27999888777","type":"waiting-list"}'
```

### Test 2: Admin Dashboard
Visit: `http://154.66.197.104:3001/admin.html`

Login:
- Email: admin@cbdwellness24.co.za
- Password: Admin123!

### Test 3: Coming Soon Page Submission
1. Upload comingsoon.html to cbdwellness24.co.za via FTP
2. Visit the page
3. Submit a test form
4. Check MongoDB:

```bash
mongosh cbdwellness24
db.leads.find().sort({createdAt:-1}).limit(3).pretty()
exit
```

---

## PM2 Management Commands

```bash
# View all apps (including cbd-wellness-24)
pm2 list

# View cbd-wellness-24 logs
pm2 logs cbd-wellness-24

# Restart cbd-wellness-24 only
pm2 restart cbd-wellness-24

# Stop cbd-wellness-24 only
pm2 stop cbd-wellness-24

# Start cbd-wellness-24 only
pm2 start cbd-wellness-24

# Monitor all apps
pm2 monit
```

---

## Safety Checklist

### ✅ What We're Creating
- New directory: `/var/www/cbd-wellness-24`
- New PM2 app: `cbd-wellness-24`
- New MongoDB database: `cbdwellness24`
- New port: `3001`
- New Nginx config: `/etc/nginx/sites-available/cbd-wellness-24` (optional)

### ❌ What We're NOT Touching
- Existing PM2 apps (openpharms-v12, portal-openpharms, stoep-uat)
- Existing Nginx configs
- Existing databases (openpharms, stoep)
- Existing ports (3000, 3009, 3021, etc.)
- Any files outside `/var/www/cbd-wellness-24`

---

## Troubleshooting

### PM2 App Won't Start
```bash
# Check logs
pm2 logs cbd-wellness-24 --err --lines 100

# Check if port 3001 is in use
sudo lsof -i :3001

# Restart
pm2 restart cbd-wellness-24
```

### MongoDB Connection Failed
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check connection
mongosh cbdwellness24 --eval "db.stats()"
```

### Can't Access from External
```bash
# Check firewall
sudo ufw status | grep 3001

# Check if app is listening
sudo netstat -tulpn | grep 3001

# Check PM2 status
pm2 list
```

---

## Rollback Plan

If anything goes wrong:

```bash
# Stop PM2 app
pm2 stop cbd-wellness-24
pm2 delete cbd-wellness-24

# Remove directory
rm -rf /var/www/cbd-wellness-24

# Remove MongoDB database
mongosh cbdwellness24 --eval "db.dropDatabase()"

# Remove firewall rule
sudo ufw delete allow 3001/tcp

# Remove Nginx config (if created)
sudo rm /etc/nginx/sites-enabled/cbd-wellness-24
sudo systemctl reload nginx
```

---

## Next Steps After Deployment

1. ✅ Deploy backend (follow steps above)
2. ✅ Test API endpoint
3. ✅ Upload comingsoon.html via FTP
4. ✅ Test form submission
5. ✅ Verify leads in MongoDB
6. ✅ Test admin dashboard
7. 📧 (Optional) Set up email notifications
8. 🔒 (Optional) Add SSL with Let's Encrypt

---

**Ready to deploy!** This plan is 100% safe and won't interfere with your existing apps.
