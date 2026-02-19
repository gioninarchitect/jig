# Quick Deployment Guide

## Files Ready for Deployment

### 1. Coming Soon Page
**File**: `comingsoon.html`
**Upload to**: cbdwellness24.co.za via FTP
**Changes made**:
- ✅ API URL configured: `http://154.66.197.104:3001/api/v1`
- ✅ Custom branded modal (no browser alerts)
- ✅ Solid black background (no logo square)
- ✅ Optimized spacing (countdown above fold)

**Upload Instructions**:
```
1. Connect to cbdwellness24.co.za FTP
2. Upload comingsoon.html to web root
3. Optional: Rename to index.html
```

---

### 2. Backend Application
**File**: `cbd-wellness-backend-deploy.tar.gz` (226KB)
**Deploy to**: 154.66.197.104 (portal.cbdwellness24.co.za)

---

## Backend Deployment Steps

### Step 1: Upload Package to Server
```bash
scp cbd-wellness-backend-deploy.tar.gz root@154.66.197.104:/tmp/
```

### Step 2: SSH and Extract
```bash
ssh root@154.66.197.104
mkdir -p /var/www/cbd-wellness-24
cd /var/www/cbd-wellness-24
tar -xzf /tmp/cbd-wellness-backend-deploy.tar.gz
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

Add:
```env
PORT=3001
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/cbdwellness24
JWT_SECRET=your-secret-key-change-this
SESSION_SECRET=your-session-secret-change-this
```

Save: `Ctrl+X`, `Y`, `Enter`

### Step 5: Seed Database
```bash
node backend/scripts/seed-test-users.js
node backend/scripts/seed-lifestyle-products.js
node backend/scripts/seed-medical-products.js
```

### Step 6: Create PM2 Config
```bash
nano ecosystem.config.js
```

Add:
```javascript
module.exports = {
  apps: [{
    name: 'cbd-wellness-24',
    script: 'backend/server.js',
    cwd: '/var/www/cbd-wellness-24',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/www/cbd-wellness-24/logs/error.log',
    out_file: '/var/www/cbd-wellness-24/logs/out.log',
    autorestart: true,
    max_restarts: 10
  }]
};
```

Save: `Ctrl+X`, `Y`, `Enter`

```bash
mkdir -p logs
```

### Step 7: Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 list
```

### Step 8: Test Backend
```bash
curl http://localhost:3001/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","mobile":"+27123456789","type":"waiting-list"}'
```

**Expected**: `{"success":true,"message":"Thank you!..."}`

### Step 9: Open Firewall (if needed)
```bash
sudo ufw allow 3001/tcp
sudo ufw reload
```

---

## Smoke Test

### Test 1: Backend Health
```bash
# From your local machine
curl http://154.66.197.104:3001/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Remote Test","email":"remote@test.com","mobile":"+27111222333","type":"waiting-list"}'
```

### Test 2: Coming Soon Page
1. Visit: https://cbdwellness24.co.za/comingsoon.html
2. Submit waiting list form
3. Should see custom branded modal (not browser alert)
4. Check in MongoDB:

```bash
ssh root@154.66.197.104
mongosh cbdwellness24
db.leads.find().sort({createdAt:-1}).limit(3).pretty()
exit
```

### Test 3: Admin Dashboard
1. Visit: http://154.66.197.104:3001/admin.html
2. Login: admin@cbdwellness24.co.za / Admin123!
3. Click "Leads" tab
4. Verify submitted leads appear

---

## PM2 Commands

```bash
# View status
pm2 list

# View logs
pm2 logs cbd-wellness-24

# Restart
pm2 restart cbd-wellness-24

# Stop
pm2 stop cbd-wellness-24

# Start
pm2 start cbd-wellness-24
```

---

## MongoDB Quick Commands

```bash
# Enter MongoDB
mongosh cbdwellness24

# Count leads
db.leads.countDocuments()

# View latest leads
db.leads.find().sort({createdAt:-1}).limit(5).pretty()

# Export leads backup
mongoexport --db cbdwellness24 --collection leads --out leads-backup.json
```

---

## Troubleshooting

### Forms not submitting?
1. Check PM2: `pm2 logs cbd-wellness-24`
2. Check MongoDB: `sudo systemctl status mongod`
3. Test API: `curl http://localhost:3001/api/v1/leads`

### CORS errors?
Backend already configured with:
- cbdwellness24.co.za
- 154.66.197.104
- portal.cbdwellness24.co.za

### Can't see leads in admin?
1. Verify leads in MongoDB: `mongosh cbdwellness24`
2. Check: `db.leads.find().pretty()`

---

## What's Different

### Custom Modal (No Browser Alerts)
- Professional branded modal
- Matches site design
- Animated entrance/exit
- Can close by clicking outside or OK button

### Ready for Production
- API points to production server
- CORS configured
- Database seeding scripts included
- PM2 configuration ready
- Comprehensive error handling

---

## Next Steps After Deploy

1. ✅ Upload comingsoon.html via FTP
2. ✅ Deploy backend to 154.66.197.104
3. ✅ Test form submissions
4. ✅ Verify MongoDB stores leads
5. ✅ Check admin dashboard shows leads
6. 📧 Configure email notifications (optional)
7. 📊 Set up monitoring (optional)

---

**Ready to deploy!** Follow the steps above.

For detailed instructions, see: `PRODUCTION_DEPLOYMENT.md`
