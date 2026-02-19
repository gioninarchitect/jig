# Coming Soon Page - Deployment Checklist

## Overview
The comingsoon.html page is ready to be deployed to your production domain. It will submit lead forms to your MongoDB backend via API calls.

---

## Current Configuration

### Form Endpoints
Both forms submit to: `${API_URL}/leads`

**Waiting List Form**:
- Fields: Name, Email, Mobile
- Type: `waiting-list`
- Endpoint: POST `/api/v1/leads`

**Franchise Application Form**:
- Fields: Name, Email, Mobile, Location, Investment
- Type: `franchise-application`
- Endpoint: POST `/api/v1/leads`

### API URL Configuration
Located in comingsoon.html line ~600:

```javascript
const PRODUCTION_API_URL = "https://basothomedicalherbs.ls/api/v1";
// UPDATE THIS WITH YOUR ACTUAL BACKEND URL
```

---

## Pre-Deployment Steps

### 1. Update Backend API URL

**Option A: Same Domain (Backend on same server)**
```javascript
const PRODUCTION_API_URL = "https://basothomedicalherbs.ls/api/v1";
```

**Option B: Different Domain/Server**
```javascript
const PRODUCTION_API_URL = "https://api.basothomedicalherbs.ls/api/v1";
// OR
const PRODUCTION_API_URL = "http://YOUR_SERVER_IP:3001/api/v1";
```

**How to update**:
1. Open `comingsoon.html`
2. Find line ~600
3. Update `PRODUCTION_API_URL` value
4. Save file

### 2. Verify Backend CORS Settings

Your backend already includes CORS configuration in `backend/server.js` (lines 54-76):

**Current allowed origins**:
- `https://basothomedicalherbs.ls`
- `http://basothomedicalherbs.ls`
- `https://www.basothomedicalherbs.ls`
- `http://www.basothomedicalherbs.ls`
- localhost (for development)

**If deploying to a different domain**, add it to the `allowedOrigins` array:

```javascript
const allowedOrigins = [
  // ... existing origins
  'https://your-custom-domain.com',
  'http://your-custom-domain.com'
];
```

### 3. Ensure MongoDB is Running

The backend needs MongoDB connection. Verify in `.env` or `backend/server.js`:

```
MONGODB_URI=mongodb://localhost:27017/bmh
```

**For production**, use a hosted MongoDB (MongoDB Atlas, etc.):
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bmh
```

### 4. Start Backend Server

```bash
cd backend
npm run dev
# OR for production:
npm start
```

Verify it's running on port 3001.

---

## Deployment Options

### Option 1: Deploy to Same Domain (basothomedicalherbs.ls)

**File Structure**:
```
basothomedicalherbs.ls/
├── comingsoon.html (rename to index.html)
├── api/ (backend accessible at /api/v1/...)
```

**Setup**:
1. Upload `comingsoon.html` as `index.html` to web root
2. Configure reverse proxy (Nginx/Apache) to route `/api/*` to backend on port 3001
3. No CORS issues since same domain

**Nginx Example**:
```nginx
server {
    listen 80;
    server_name basothomedicalherbs.ls;

    # Serve coming soon page
    location / {
        root /var/www/bmh;
        index index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Deploy to Different Domain

**Coming Soon Page**: `https://basothomedicalherbs.ls`
**Backend API**: `https://api.basothomedicalherbs.ls` OR `http://SERVER_IP:3001`

**Setup**:
1. Update `PRODUCTION_API_URL` in comingsoon.html
2. Upload comingsoon.html to web server
3. Ensure backend domain is in CORS allowedOrigins
4. Backend server must be publicly accessible

---

## Testing Checklist

### Before Going Live

- [ ] Update `PRODUCTION_API_URL` in comingsoon.html
- [ ] Backend server is running
- [ ] MongoDB is connected
- [ ] CORS origins include your domain
- [ ] Test on local development environment
- [ ] Upload comingsoon.html to server

### After Upload - Test Forms

**Test Waiting List Form**:
1. Open https://basothomedicalherbs.ls/comingsoon.html
2. Fill out waiting list form
3. Submit
4. Check browser console for errors
5. Verify success message appears
6. Check MongoDB for new lead entry

```bash
# Check MongoDB for leads
mongosh bmh
db.leads.find().sort({createdAt: -1}).limit(1).pretty()
```

**Test Franchise Form**:
1. Fill out franchise application
2. Submit
3. Verify success message
4. Check MongoDB

### Common Issues

**Issue**: Form submission fails with CORS error
**Solution**: Add your domain to CORS allowedOrigins in backend/server.js

**Issue**: 404 error on form submission
**Solution**: Verify backend API URL is correct and server is running

**Issue**: 500 error on submission
**Solution**: Check backend logs, ensure MongoDB is connected

---

## Monitoring Lead Submissions

### View Leads in MongoDB

```bash
mongosh bmh

# Count total leads
db.leads.countDocuments()

# View all leads
db.leads.find().pretty()

# View only franchise applications
db.leads.find({type: "franchise-application"}).pretty()

# View only waiting list
db.leads.find({type: "waiting-list"}).pretty()

# View leads from today
db.leads.find({
  createdAt: {
    $gte: new Date(new Date().setHours(0,0,0,0))
  }
}).pretty()
```

### Lead Data Structure

Each submission creates a document:

```javascript
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  mobile: "+27 XX XXX XXXX",
  type: "waiting-list" | "franchise-application",
  location: "Johannesburg", // franchise only
  investment: "500k-1m",     // franchise only
  source: "coming-soon-page",
  status: "new",
  createdAt: ISODate("2024-11-04T..."),
  updatedAt: ISODate("2024-11-04T...")
}
```

---

## Admin Access to Leads

Leads can be viewed via admin dashboard:

1. Login as admin: http://localhost:3001/admin.html
   - Email: admin@basothomedicalherbs.ls
   - Password: Admin123!

2. Navigate to Leads section
3. View, filter, and manage all submissions

**API Endpoints** (require admin auth):
- GET `/api/v1/leads` - List all leads
- GET `/api/v1/leads/:id` - Get single lead
- PUT `/api/v1/leads/:id` - Update lead status
- DELETE `/api/v1/leads/:id` - Delete lead
- GET `/api/v1/leads/meta/statistics` - Get statistics

---

## Security Notes

### Current Configuration
- Public form submission (no auth required)
- Duplicate prevention (24-hour window per email/type)
- Email validation
- Mobile validation
- Input sanitization

### Production Recommendations
1. Enable HTTPS (SSL certificate)
2. Add rate limiting to prevent spam
3. Implement reCAPTCHA or similar
4. Monitor for suspicious submissions
5. Set up email notifications for new leads

---

## Email Notifications (Optional Enhancement)

To get notified when new leads submit:

1. Configure email service in backend
2. Add notification to POST /api/v1/leads endpoint
3. Send email to admin when lead created

Example addition to `backend/routes/leads.js`:

```javascript
// After lead.save()
await sendEmail({
  to: 'admin@basothomedicalherbs.ls',
  subject: `New ${type} submission`,
  text: `Name: ${name}\nEmail: ${email}\nMobile: ${mobile}`
});
```

---

## Quick Reference

### File Locations
- **Coming Soon Page**: `/Users/florisolivier/BMH/comingsoon.html`
- **Backend Routes**: `/Users/florisolivier/BMH/backend/routes/leads.js`
- **CORS Config**: `/Users/florisolivier/BMH/backend/server.js` (lines 54-76)
- **Lead Model**: `/Users/florisolivier/BMH/backend/modules/database/models/Lead.js`

### Important URLs
- **API Endpoint**: `POST /api/v1/leads`
- **Admin Dashboard**: `http://localhost:3001/admin.html`
- **Login**: `http://localhost:3001/login.html`

### Test Credentials
- **Admin**: admin@basothomedicalherbs.ls / Admin123!

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Check backend server logs
3. Verify MongoDB connection
4. Test API endpoint directly with curl:

```bash
curl -X POST http://localhost:3001/api/v1/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "mobile": "+27 12 345 6789",
    "type": "waiting-list"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Thank you! Your submission has been received. We will contact you within 24 hours.",
  "leadId": "..."
}
```
