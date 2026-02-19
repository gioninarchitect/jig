# Pre-Deployment Testing Checklist

## Test Environment
- **Local Server**: http://localhost:3001
- **Production Server**: https://portal.basothomedicalherbs.ls (154.66.197.104)
- **Coming Soon Page**: https://basothomedicalherbs.ls

---

## Database Verification

### Confirm Test Data Exists
```bash
# Enter MongoDB
mongosh bmh

# Check users
db.users.countDocuments()  # Should return 6

# Check lifestyle products
db.products.find({category: "lifestyle"}).count()  # Should return 9

# Check medical products
db.products.find({category: "medical"}).count()  # Should return 8

# Exit
exit
```

---

## Test 1: User Authentication

### Admin Login
1. Navigate to: http://localhost:3001/login.html
2. Email: admin@basothomedicalherbs.ls
3. Password: Admin123!
4. Expected: Redirect to admin dashboard with full access

### Store Manager Login
1. Navigate to: http://localhost:3001/login.html
2. Email: manager@basothomedicalherbs.ls
3. Password: Manager123!
4. Expected: Redirect to store manager dashboard

### Staff Assistant Login
1. Navigate to: http://localhost:3001/login.html
2. Email: assistant@basothomedicalherbs.ls
3. Password: Assistant123!
4. Expected: Redirect to POS system

### Regular User Login
1. Navigate to: http://localhost:3001/login.html
2. Email: user@basothomedicalherbs.ls
3. Password: User123!
4. Expected: Redirect to user dashboard

### Section 21 Patient Login
1. Navigate to: http://localhost:3001/login.html
2. Email: patient@basothomedicalherbs.ls
3. Password: Patient123!
4. Expected: Redirect to dashboard with Section 21 status showing "Approved"

### Pending Section 21 Login
1. Navigate to: http://localhost:3001/login.html
2. Email: pending@basothomedicalherbs.ls
3. Password: Pending123!
4. Expected: Redirect to dashboard with Section 21 status showing "Pending"

---

## Test 2: Lifestyle Products (Regular User)

### Login as Regular User
```
Email: user@basothomedicalherbs.ls
Password: User123!
```

### Browse Lifestyle Products
1. Click "Lifestyle Cannabis" tab
2. Expected: See 9 products displayed
   - 3 Cannabis Flower (Sativa, Indica, Hybrid) @ R320-R380
   - 3 Pre-Roll Packs (5-packs) @ R250-R280
   - 3 Vape Cartridges @ R420-R450

### Product Details
1. Click on "Premium Sativa Flower"
2. Expected:
   - Product name, price, description
   - THC/CBD content
   - Stock status
   - Add to Cart button

### Add to Cart
1. Click "Add to Cart" on any product
2. Expected:
   - Cart counter updates
   - Success notification (custom modal, NOT browser alert)
   - Product appears in cart

### Cart Management
1. Click cart icon
2. Expected:
   - See selected products
   - Quantity adjustment controls
   - Remove item option
   - Subtotal calculation

---

## Test 3: Medical Products (Section 21 Patient)

### Login as Approved Patient
```
Email: patient@basothomedicalherbs.ls
Password: Patient123!
```

### Verify Section 21 Status
1. Navigate to dashboard
2. Expected:
   - Section 21 badge showing "Approved"
   - Expiry date: December 1, 2024
   - Access to Medical Cannabis tab

### Browse Medical Products
1. Click "Medical Cannabis" tab
2. Expected: See 8 medical products
   - 3 Medical Cannabis Flower (28g) @ R980-R1,250
   - 3 Medical Cannabis Oils (30ml) @ R720-R850
   - 2 Medical Capsules (30 count) @ R580-R650

### Medical Product Information
1. Click on any medical product
2. Expected:
   - Medical information badge
   - THC/CBD content
   - Medical use cases
   - Prescription requirements
   - Add to Cart button

### Add Medical Product to Cart
1. Add medical product to cart
2. Expected:
   - Custom modal confirmation (NOT browser alert)
   - Cart updates with medical product
   - Prescription verification notice

---

## Test 4: Section 21 Access Control

### Login as Regular User (No Section 21)
```
Email: user@basothomedicalherbs.ls
Password: User123!
```

### Attempt to Access Medical Products
1. Look for "Medical Cannabis" tab
2. Expected:
   - Tab is hidden or shows "Apply for Section 21"
   - Cannot browse medical products
   - Redirected to Section 21 info page if attempting direct access

---

## Test 5: Store Manager Dashboard

### Login as Manager
```
Email: manager@basothomedicalherbs.ls
Password: Manager123!
```

### Access Inventory
1. Navigate to inventory section
2. Expected:
   - See all 17 products (9 lifestyle + 8 medical)
   - Product stock levels
   - Edit/update controls

### POS System
1. Click "POS" or "Point of Sale"
2. Expected:
   - Product search
   - Quick add to sale
   - Customer selection
   - Payment processing

### View Reports
1. Click "Reports" or "Sales"
2. Expected:
   - Sales summary
   - Product performance
   - Date range filters

---

## Test 6: Admin Dashboard

### Login as Admin
```
Email: admin@basothomedicalherbs.ls
Password: Admin123!
```

### Leads Tab
1. Click "Leads" tab
2. Expected:
   - See all submitted leads from coming soon page
   - Filter by type (waiting-list, franchise-application)
   - Lead status management
   - Export functionality

### User Management
1. Navigate to Users section
2. Expected:
   - See all 6 test users
   - Edit user permissions
   - View Section 21 applications
   - Approve/reject Section 21 requests

### Product Management
1. Navigate to Products section
2. Expected:
   - See all 17 products
   - Add new product
   - Edit existing products
   - Manage categories and tags

---

## Test 7: Coming Soon Page Lead Submission

### Test Waiting List Form
1. Navigate to: http://localhost:3001/comingsoon.html (or uploaded version)
2. Fill in "Join Our Waiting List" form:
   - Name: Test User
   - Email: test@example.com
   - Mobile: +27123456789
3. Click "Join Waiting List"
4. Expected:
   - Custom branded modal appears (NOT browser alert)
   - Success message displayed
   - Form clears

### Verify Lead in Database
```bash
mongosh bmh
db.leads.find({email: "test@example.com"}).pretty()
exit
```

### Check Lead in Admin Dashboard
1. Login as admin
2. Navigate to Leads tab
3. Expected:
   - See the test lead submission
   - Type: "waiting-list"
   - Status: "new"

---

## Test 8: Franchise Application Form

### Submit Franchise Application
1. Navigate to coming soon page
2. Scroll to "Franchise Opportunities" section
3. Fill in franchise application form:
   - Name: Franchise Test
   - Email: franchise@test.com
   - Mobile: +27987654321
   - Location: Cape Town
   - Investment Range: Select option
4. Click "Apply Now"
5. Expected:
   - Custom modal success message (NOT browser alert)
   - Form clears

### Verify in Admin Dashboard
1. Login as admin
2. Click "Leads" tab
3. Filter by type: "franchise-application"
4. Expected:
   - See franchise application
   - Location field populated
   - Investment range captured

---

## Test 9: API Endpoint Testing

### Test Lead Creation Endpoint
```bash
curl http://localhost:3001/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test User",
    "email": "apitest@example.com",
    "mobile": "+27111222333",
    "type": "waiting-list"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Thank you! Your submission has been received...",
  "leadId": "..."
}
```

### Test Duplicate Prevention
```bash
# Submit same lead again (within 24 hours)
curl http://localhost:3001/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test User",
    "email": "apitest@example.com",
    "mobile": "+27111222333",
    "type": "waiting-list"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "message": "You have already submitted this form recently."
}
```

---

## Test 10: Error Handling

### Test Missing Required Fields
```bash
curl http://localhost:3001/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Incomplete User"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "message": "Name, email, mobile, and type are required"
}
```

### Test Invalid Email Format (Frontend)
1. Navigate to coming soon page
2. Enter invalid email: "notanemail"
3. Click submit
4. Expected:
   - Custom modal error message (NOT browser alert)
   - Form validation prevents submission

### Test Invalid Mobile Format (Frontend)
1. Enter invalid mobile: "123"
2. Click submit
3. Expected:
   - Custom modal error message (NOT browser alert)
   - Validation prevents submission

---

## Test 11: Custom Modal System

### Verify No Browser Alerts
1. Test all form submissions
2. Test all error scenarios
3. Expected:
   - ALL messages show in custom branded modal
   - NO native browser alert() dialogs
   - Modal matches site design with teal accent (#17d9c3)

### Modal Functionality
1. Submit a form successfully
2. Expected:
   - Modal appears with fadeIn animation
   - Success icon (✓) displayed
   - Can close by clicking "OK" button
   - Can close by clicking outside modal
   - Modal disappears with smooth animation

---

## Test 12: Responsive Design

### Test Mobile View
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone 12 Pro"
4. Navigate through:
   - Coming soon page
   - Login page
   - User dashboard
   - Product listings

### Expected:
- All elements properly sized for mobile
- Navigation menu responsive
- Forms usable on mobile
- Product cards stack vertically
- Custom modal centered and readable

---

## Test 13: CORS Configuration

### Verify Allowed Origins
Check that backend accepts requests from:
- http://localhost:3001
- https://basothomedicalherbs.ls
- https://portal.basothomedicalherbs.ls
- http://154.66.197.104

### Test CORS
```bash
# Test from allowed origin
curl -H "Origin: https://basothomedicalherbs.ls" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  http://localhost:3001/api/v1/leads \
  -v
```

**Expected**: Response includes `Access-Control-Allow-Origin` header

---

## Pre-Deployment Checklist

Before deploying to production server (154.66.197.104):

### Code Review
- [ ] All API URLs point to `https://portal.basothomedicalherbs.ls/api/v1`
- [ ] No browser alert() calls (all use custom modal)
- [ ] CORS includes production domains
- [ ] Environment variables documented in .env
- [ ] All test users seeded
- [ ] All test products seeded (9 lifestyle + 8 medical)

### Testing Completed
- [ ] All 6 test users can login
- [ ] Regular user sees 9 lifestyle products
- [ ] Section 21 patient sees 8 medical products
- [ ] Section 21 patient sees "Approved" status
- [ ] Pending user sees "Pending" status
- [ ] Coming soon page forms submit successfully
- [ ] Custom modal system works (no browser alerts)
- [ ] Leads appear in admin dashboard
- [ ] Store manager can access POS
- [ ] Admin can view all leads
- [ ] API endpoints return correct responses
- [ ] Duplicate lead prevention works
- [ ] Error handling shows custom modals
- [ ] Mobile responsive design confirmed

### Files Ready
- [ ] cbd-wellness-complete-deploy.tar.gz (38MB) uploaded to server
- [ ] COMPLETE_DEPLOY.md reviewed
- [ ] Server reconnaissance completed (SERVER_SCOUT_COMMANDS.md)
- [ ] HTTPS setup documented
- [ ] PM2 ecosystem config ready
- [ ] Nginx config ready

---

## Post-Deployment Testing

After deploying to production:

### Test 1: Coming Soon Page Production
1. Visit: https://basothomedicalherbs.ls/comingsoon.html
2. Submit test lead
3. Expected: Custom modal success message

### Test 2: API Production Endpoint
```bash
curl https://portal.basothomedicalherbs.ls/api/v1/leads \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Test",
    "email": "prodtest@example.com",
    "mobile": "+27999888777",
    "type": "waiting-list"
  }'
```

### Test 3: Admin Dashboard Production
1. Visit: https://portal.basothomedicalherbs.ls/admin.html
2. Login: admin@basothomedicalherbs.ls / Admin123!
3. Check Leads tab for production test submission

### Test 4: HTTPS Certificate
```bash
curl -I https://portal.basothomedicalherbs.ls
```
Expected: Valid SSL certificate from Let's Encrypt

---

## Rollback Plan

If anything fails in production:

```bash
# Stop PM2 app
pm2 stop bmh
pm2 delete bmh

# Remove directory
rm -rf /var/www/bmh

# Remove MongoDB database
mongosh bmh --eval "db.dropDatabase()"

# Remove firewall rule
sudo ufw delete allow 3001/tcp

# Remove Nginx config
sudo rm /etc/nginx/sites-enabled/bmh
sudo systemctl reload nginx
```

---

## Support Contacts

- **Developer**: Review logs with `pm2 logs bmh`
- **Database**: Check with `mongosh bmh`
- **Server**: SSH access via `ssh root@154.66.197.104`

---

**All tests must pass before production deployment!**
