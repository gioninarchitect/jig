# CBD Wellness 24 - HTTPS Deployment with Let's Encrypt

## Prerequisites

Based on your server, you already have:
- ✅ Certbot installed (managing other SSL certs)
- ✅ Nginx configured
- ✅ DNS pointing to 154.66.197.104

## Domain Setup Required

Before starting, ensure DNS is configured:
- **portal.cbdwellness24.co.za** → 154.66.197.104 (A record)

You can verify with:
```bash
dig portal.cbdwellness24.co.za +short
# Should return: 154.66.197.104
```

---

## Complete HTTPS Deployment Steps

### Step 1: Upload and Extract Backend

```bash
# On your local machine
scp cbd-wellness-backend-deploy.tar.gz root@154.66.197.104:/tmp/

# SSH to server
ssh root@154.66.197.104

# Create directory
mkdir -p /var/www/cbd-wellness-24
cd /var/www/cbd-wellness-24

# Extract
tar -xzf /tmp/cbd-wellness-backend-deploy.tar.gz
```

### Step 2: Install Dependencies

```bash
cd /var/www/cbd-wellness-24
npm install --production
```

### Step 3: Create .env File

```bash
nano .env
```

**Content**:
```env
PORT=3001
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/cbdwellness24
JWT_SECRET=cbd-wellness-24-super-secret-jwt-key-change-this-2024
SESSION_SECRET=cbd-wellness-24-session-secret-change-this-2024
```

**Save**: `Ctrl+X`, `Y`, `Enter`

### Step 4: Seed Database

```bash
cd /var/www/cbd-wellness-24

# Seed users
node backend/scripts/seed-test-users.js

# Seed lifestyle products
node backend/scripts/seed-lifestyle-products.js

# Seed medical products
node backend/scripts/seed-medical-products.js

# Verify
mongosh --eval "show dbs" --quiet | grep cbdwellness24
```

### Step 5: Create PM2 Ecosystem

```bash
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

### Step 6: Start Backend with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 list
```

**Expected Output**: cbd-wellness-24 should show as "online"

### Step 7: Create Nginx Config (HTTP First)

```bash
sudo nano /etc/nginx/sites-available/portal.cbdwellness24.co.za
```

**Content**:
```nginx
# HTTP Server (for Let's Encrypt challenge)
server {
    listen 80;
    listen [::]:80;
    server_name portal.cbdwellness24.co.za;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

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

**Save**: `Ctrl+X`, `Y`, `Enter`

### Step 8: Enable Nginx Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/portal.cbdwellness24.co.za /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 9: Get SSL Certificate with Let's Encrypt

```bash
# Request SSL certificate
sudo certbot --nginx -d portal.cbdwellness24.co.za
```

**Certbot will ask you**:
1. Enter email address (for urgent renewal notices)
2. Agree to Terms of Service (A)
3. Share email with EFF (Y/N - your choice)
4. Select redirect option: **Choose 2** (Redirect HTTP to HTTPS)

**Certbot will automatically**:
- Get the SSL certificate
- Update your Nginx config
- Add HTTPS server block
- Set up HTTP→HTTPS redirect
- Configure SSL settings

### Step 10: Verify SSL Configuration

After Certbot completes, your Nginx config will be updated. Check it:

```bash
sudo cat /etc/nginx/sites-available/portal.cbdwellness24.co.za
```

**It should now include**:
```nginx
server {
    server_name portal.cbdwellness24.co.za;

    # ... your proxy settings ...

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/portal.cbdwellness24.co.za/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/portal.cbdwellness24.co.za/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = portal.cbdwellness24.co.za) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    listen [::]:80;
    server_name portal.cbdwellness24.co.za;
    return 404; # managed by Certbot
}
```

### Step 11: Open Firewall (If Not Already Open)

```bash
# Ensure HTTPS is allowed
sudo ufw allow 'Nginx Full'

# Verify
sudo ufw status | grep Nginx
```

---

## Testing

### Test 1: HTTPS API Endpoint

```bash
# From your local machine
curl https://portal.cbdwellness24.co.za/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"HTTPS Test","email":"https@test.com","mobile":"+27123456789","type":"waiting-list"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Thank you! Your submission has been received...",
  "leadId": "..."
}
```

### Test 2: HTTPS Admin Dashboard

1. Visit: **https://portal.cbdwellness24.co.za/admin.html**
2. Verify green padlock (SSL) in browser
3. Login:
   - Email: admin@cbdwellness24.co.za
   - Password: Admin123!
4. Click "Leads" tab
5. Should see test submission

### Test 3: HTTP→HTTPS Redirect

```bash
# Try HTTP (should redirect to HTTPS)
curl -I http://portal.cbdwellness24.co.za

# Should see:
# HTTP/1.1 301 Moved Permanently
# Location: https://portal.cbdwellness24.co.za/
```

### Test 4: SSL Certificate

```bash
# Check SSL certificate
echo | openssl s_client -servername portal.cbdwellness24.co.za -connect portal.cbdwellness24.co.za:443 2>/dev/null | openssl x509 -noout -dates
```

**Should show valid dates**

### Test 5: Coming Soon Page Submission

1. Upload comingsoon.html to cbdwellness24.co.za via FTP
2. Visit: https://cbdwellness24.co.za/comingsoon.html
3. Fill out waiting list form
4. Submit
5. Should see custom modal (not browser alert)
6. Check MongoDB:

```bash
ssh root@154.66.197.104
mongosh cbdwellness24
db.leads.find().sort({createdAt:-1}).limit(3).pretty()
exit
```

---

## SSL Certificate Auto-Renewal

Let's Encrypt certificates expire in 90 days. Certbot automatically sets up renewal.

### Check Renewal Timer

```bash
# Check if renewal timer is active
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run
```

**Expected**: "Congratulations, all simulated renewals succeeded"

---

## Final URLs

After deployment, your application will be accessible at:

### Production URLs
- **Coming Soon**: https://cbdwellness24.co.za/comingsoon.html
- **Admin Dashboard**: https://portal.cbdwellness24.co.za/admin.html
- **User Dashboard**: https://portal.cbdwellness24.co.za/dashboard.html
- **Login**: https://portal.cbdwellness24.co.za/login.html
- **API**: https://portal.cbdwellness24.co.za/api/v1/

### Test Accounts
- **Admin**: admin@cbdwellness24.co.za / Admin123!
- **Manager**: manager@cbdwellness24.co.za / Manager123!
- **User**: user@cbdwellness24.co.za / User123!
- **Patient**: patient@cbdwellness24.co.za / Patient123!

---

## comingsoon.html API Configuration

Your comingsoon.html is now configured to use:
```javascript
const PRODUCTION_API_URL = "https://portal.cbdwellness24.co.za/api/v1";
```

This means:
- ✅ HTTPS (secure)
- ✅ No browser mixed content warnings
- ✅ Works from any domain
- ✅ Professional custom modal (no alerts)

---

## PM2 Management

```bash
# View all apps
pm2 list

# View cbd-wellness-24 logs
pm2 logs cbd-wellness-24

# Restart cbd-wellness-24
pm2 restart cbd-wellness-24

# Monitor all apps
pm2 monit
```

---

## Troubleshooting

### Certbot Fails to Get Certificate

**Issue**: DNS not propagated
```bash
# Check DNS
dig portal.cbdwellness24.co.za +short
# Should return: 154.66.197.104
```

**Issue**: Port 80 not accessible
```bash
# Check firewall
sudo ufw status | grep 80

# Test port 80
curl http://portal.cbdwellness24.co.za
```

### Mixed Content Warnings

If you see mixed content warnings, ensure comingsoon.html uses HTTPS:
- API URL should be `https://portal.cbdwellness24.co.za/api/v1`
- Not `http://154.66.197.104:3001/api/v1`

### CORS Errors

Backend is already configured with CORS for:
- cbdwellness24.co.za
- portal.cbdwellness24.co.za
- www.cbdwellness24.co.za

If you get CORS errors, verify the domain in `backend/server.js` lines 62-70.

---

## Security Checklist

✅ HTTPS enabled with Let's Encrypt
✅ HTTP redirects to HTTPS
✅ Auto-renewal configured
✅ CORS properly configured
✅ Firewall rules in place
✅ JWT secrets set (change defaults in .env)
✅ MongoDB access limited to localhost
✅ PM2 process isolation
✅ Custom error modals (no system alerts)

---

## Backup Commands

### Backup MongoDB

```bash
# Export leads
mongoexport --db cbdwellness24 --collection leads --out /tmp/leads-backup-$(date +%Y%m%d).json

# Full database backup
mongodump --db cbdwellness24 --out /tmp/mongodb-backup-$(date +%Y%m%d)

# Compress
tar -czf cbd-wellness-backup-$(date +%Y%m%d).tar.gz /tmp/mongodb-backup-$(date +%Y%m%d)
```

---

## Next Steps After Deployment

1. ✅ Deploy backend with HTTPS
2. ✅ Get SSL certificate
3. ✅ Upload comingsoon.html via FTP
4. ✅ Test HTTPS form submission
5. ✅ Verify leads in MongoDB
6. ✅ Test admin dashboard via HTTPS
7. 📧 (Optional) Set up email notifications for new leads
8. 📊 (Optional) Set up monitoring/analytics
9. 🔒 Change JWT_SECRET and SESSION_SECRET in .env to production values

---

**Your deployment will be fully HTTPS secured!**
