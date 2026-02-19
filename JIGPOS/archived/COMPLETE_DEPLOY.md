# Basotho Medical Herbs - Complete Deployment Guide

## Deployment Package

**File**: `cbd-wellness-complete-deploy.tar.gz` (38MB)
**Contains**: Backend + Frontend + Images + CSS

### What's Included:
- ✅ Backend API (Node.js/Express)
- ✅ Frontend HTML pages (login, dashboard, admin)
- ✅ CSS files
- ✅ Images
- ✅ Frontend JavaScript
- ✅ Database seeding scripts

---

## Deployment Steps

### Step 1: Upload Complete Package

```bash
# From your local machine
scp cbd-wellness-complete-deploy.tar.gz root@154.66.197.104:/tmp/
```

### Step 2: SSH and Extract

```bash
ssh root@154.66.197.104

# Create directory
mkdir -p /var/www/bmh
cd /var/www/bmh

# Extract everything
tar -xzf /tmp/cbd-wellness-complete-deploy.tar.gz

# Verify extraction
ls -la
```

**You should see**:
```
backend/
css/
frontend/
images/
index.html
login.html
dashboard.html
admin.html
section21-info.html
terms-of-service.html
privacy-policy.html
package.json
package-lock.json
```

### Step 3: Install Dependencies

```bash
cd /var/www/bmh
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
MONGODB_URI=mongodb://localhost:27017/bmh
JWT_SECRET=bmh-super-secret-jwt-key-change-this-2024
SESSION_SECRET=bmh-session-secret-change-this-2024
```

**Save**: `Ctrl+X`, `Y`, `Enter`

### Step 5: Seed Database

```bash
# Seed test users
node backend/scripts/seed-test-users.js

# Seed lifestyle products
node backend/scripts/seed-lifestyle-products.js

# Seed medical products
node backend/scripts/seed-medical-products.js

# Verify database created
mongosh --eval "show dbs" --quiet | grep bmh
```

### Step 6: Update Backend Server to Serve Frontend

The backend is already configured to serve static files. Check that `backend/server.js` includes:

```javascript
// Serve static files
app.use(express.static(path.join(__dirname, '..')));
```

This serves all HTML, CSS, images from the root directory.

### Step 7: Create PM2 Ecosystem

```bash
nano ecosystem.config.js
```

**Content**:
```javascript
module.exports = {
  apps: [{
    name: 'bmh',
    script: 'backend/server.js',
    cwd: '/var/www/bmh',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    autorestart: true,
    max_restarts: 10
  }]
};
```

**Save**: `Ctrl+X`, `Y`, `Enter`

```bash
mkdir -p logs
```

### Step 8: Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 list
```

### Step 9: Create Nginx Config

```bash
sudo nano /etc/nginx/sites-available/portal.basothomedicalherbs.ls
```

**Content**:
```nginx
# HTTP Server (for Let's Encrypt challenge)
server {
    listen 80;
    listen [::]:80;
    server_name portal.basothomedicalherbs.ls;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

    # Proxy everything to Node.js app
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
        client_max_body_size 50M;
    }
}
```

**Save**: `Ctrl+X`, `Y`, `Enter`

### Step 10: Enable Site and Get SSL

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/portal.basothomedicalherbs.ls /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d portal.basothomedicalherbs.ls
```

**Certbot Instructions**:
1. Enter email address
2. Agree to Terms (A)
3. Share email with EFF (Y/N)
4. **Choose 2** (Redirect HTTP to HTTPS)

---

## Testing

### Test 1: Direct Access (Without Domain)

```bash
# From your local machine
curl http://154.66.197.104:3001/
```

**Expected**: HTML content of index.html

### Test 2: Via Domain (HTTP - will redirect)

```bash
curl -I http://portal.basothomedicalherbs.ls
```

**Expected**: 301 redirect to HTTPS

### Test 3: Via Domain (HTTPS)

```bash
curl https://portal.basothomedicalherbs.ls/
```

**Expected**: HTML content

### Test 4: API Endpoint

```bash
curl https://portal.basothomedicalherbs.ls/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","mobile":"+27123456789","type":"waiting-list"}'
```

**Expected**:
```json
{
  "success": true,
  "message": "Thank you! Your submission has been received...",
  "leadId": "..."
}
```

### Test 5: Admin Dashboard

1. Visit: **https://portal.basothomedicalherbs.ls/admin.html**
2. Login:
   - Email: admin@basothomedicalherbs.ls
   - Password: Admin123!
3. Click "Leads" tab
4. Should see test submission

### Test 6: User Dashboard

1. Visit: **https://portal.basothomedicalherbs.ls/login.html**
2. Login:
   - Email: user@basothomedicalherbs.ls
   - Password: User123!
3. Should redirect to dashboard
4. Click "Lifestyle Cannabis" tab
5. Should see 9 products

### Test 7: Patient Dashboard (Section 21)

1. Visit: **https://portal.basothomedicalherbs.ls/login.html**
2. Login:
   - Email: patient@basothomedicalherbs.ls
   - Password: Patient123!
3. Click "Medical Cannabis" tab
4. Should see Section 21 status: Approved
5. Should see 8 medical products

---

## Available URLs

Once deployed, all pages will be accessible via:

### Public Pages
- **Login**: https://portal.basothomedicalherbs.ls/login.html
- **Section 21 Info**: https://portal.basothomedicalherbs.ls/section21-info.html
- **Terms of Service**: https://portal.basothomedicalherbs.ls/terms-of-service.html
- **Privacy Policy**: https://portal.basothomedicalherbs.ls/privacy-policy.html

### Authenticated Pages
- **User Dashboard**: https://portal.basothomedicalherbs.ls/dashboard.html
- **Admin Dashboard**: https://portal.basothomedicalherbs.ls/admin.html

### API
- **Base URL**: https://portal.basothomedicalherbs.ls/api/v1/

---

## Coming Soon Page

The `comingsoon.html` should be uploaded to **basothomedicalherbs.ls** (your main domain):

```bash
# Upload via FTP or:
scp comingsoon.html root@154.66.197.104:/var/www/html/index.html
```

This keeps the coming soon page separate from the portal application.

---

## PM2 Management

```bash
# View status
pm2 list

# View logs
pm2 logs bmh

# Restart
pm2 restart bmh

# Stop
pm2 stop bmh
```

---

## MongoDB Management

```bash
# Enter MongoDB
mongosh bmh

# View leads
db.leads.find().pretty()

# Count leads
db.leads.countDocuments()

# View users
db.users.find().pretty()

# Count users
db.users.countDocuments()

# View products
db.products.find().pretty()

# Exit
exit
```

---

## Troubleshooting

### Pages show 404

```bash
# Check PM2 status
pm2 logs bmh

# Check if files exist
ls -la /var/www/bmh/*.html

# Restart PM2
pm2 restart bmh
```

### CSS/Images not loading

Ensure backend serves static files. Check `backend/server.js`:

```javascript
app.use(express.static(path.join(__dirname, '..')));
```

### Can't login

```bash
# Check users exist
mongosh bmh
db.users.find({email: "admin@basothomedicalherbs.ls"})

# Re-seed if needed
node backend/scripts/seed-test-users.js
```

---

## File Structure After Deployment

```
/var/www/bmh/
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── modules/
│   └── scripts/
├── css/
│   └── globals.css
├── frontend/
│   └── *.js
├── images/
│   ├── logo-w.png
│   └── *.png
├── index.html
├── login.html
├── dashboard.html
├── admin.html
├── section21-info.html
├── terms-of-service.html
├── privacy-policy.html
├── package.json
├── ecosystem.config.js
├── .env
└── logs/
```

---

## Test Credentials

### Admin
- Email: admin@basothomedicalherbs.ls
- Password: Admin123!
- Access: Full system, admin panel

### Store Manager
- Email: manager@basothomedicalherbs.ls
- Password: Manager123!
- Access: Store management, POS

### Regular User
- Email: user@basothomedicalherbs.ls
- Password: User123!
- Access: Lifestyle products only

### Patient (Section 21 Approved)
- Email: patient@basothomedicalherbs.ls
- Password: Patient123!
- Access: Lifestyle + Medical cannabis products
- Section 21: Approved (expires Dec 1, 2024)

---

## Next Steps

1. ✅ Upload cbd-wellness-complete-deploy.tar.gz
2. ✅ Extract and install dependencies
3. ✅ Seed database
4. ✅ Start PM2
5. ✅ Configure Nginx
6. ✅ Get SSL certificate
7. ✅ Test all URLs
8. ✅ Upload comingsoon.html to main domain
9. 📧 (Optional) Configure email notifications
10. 🔒 Change JWT/SESSION secrets in .env

---

**Complete deployment package ready!**
File: `cbd-wellness-complete-deploy.tar.gz` (38MB)
