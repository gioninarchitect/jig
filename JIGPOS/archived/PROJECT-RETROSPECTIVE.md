# BMH Project Retrospective
## Converting CBD Wellness to Basotho Medical Herbs

**Project Duration:** October - December 2025
**Document Created:** 2 December 2025

---

## 1. Project Overview

### What We Built
Converted a generic CBD Wellness e-commerce platform into a branded Basotho Medical Herbs (BMH) application featuring:
- E-commerce storefront (lifestyle products)
- Section 21 medical cannabis (auth-gated)
- POS system for in-store sales
- Admin dashboard with RBAC
- Affiliate/wellness advocate program
- Training hub and UAT documentation

### Tech Stack
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Frontend:** Vanilla HTML/CSS/JS (no framework)
- **Authentication:** JWT with bcrypt
- **Payments:** Stripe integration
- **Server:** Ubuntu on 154.66.197.104, PM2 process manager, Nginx reverse proxy

---

## 2. Conversion Steps Completed

### Phase 1: Branding & Identity
| Step | Status | Notes |
|------|--------|-------|
| Logo replacement | Done | logo-w.png (white), logo-d.png (dark) |
| Color scheme update | Done | Teal #0B8C7A, Navy #1E3A5F |
| Typography (Playfair Display + Inter) | Done | Google Fonts CDN |
| Favicon | Done | |
| Email templates | Done | hello@basothomedicalherbs.ls |
| Invoice/Receipt branding | Done | PDF generator updated |

### Phase 2: Database & Models
| Step | Status | Notes |
|------|--------|-------|
| Database rename (cbd -> bmh) | Done | MongoDB `bmh` database |
| User model updates | Done | Wellness tiers, points system |
| Product model | Done | Categories, inventory tracking |
| Sale model | Done | POS transactions, tracks (lifestyle/medical) |
| Branch model | Done | Multi-location support |
| Seed scripts | Done | Users, products, menus, modules |

### Phase 3: Frontend Pages
| Page | Status | Notes |
|------|--------|-------|
| index.html (Homepage) | Done | Hero, products, about |
| login.html / register.html | Done | Auth flows |
| dashboard.html | Done | User dashboard, cart |
| admin.html | Done | Full admin panel with RBAC |
| products.html | Done | Product catalog |
| cart.html | Done | Shopping cart |
| pos.html | Done | Standalone POS |
| training-hub.html | Done | Staff training |
| uat-testing.html | Done | UAT guide |
| comingsoon.html | Done | Placeholder page |

### Phase 4: Backend Routes
| Route | Status | Notes |
|------|--------|-------|
| /api/v1/auth | Done | Login, register, JWT |
| /api/v1/products | Done | CRUD, inventory |
| /api/v1/orders | Done | E-commerce orders |
| /api/v1/pos | Done | POS sales, invoices, receipts |
| /api/v1/users | Done | User management |
| /api/v1/affiliate | Done | Affiliate program |
| /api/v1/menu | Done | Cafe menu items |

### Phase 5: Deployment
| Step | Status | Notes |
|------|--------|-------|
| Server setup | Done | PM2, Nginx, SSL |
| Database migration | Done | mongorestore |
| Environment config | Done | .env on server |
| Domain setup | Done | bmh.fig3.online (UAT) |

---

## 3. What We Forgot / Missed

### Critical Misses
| Issue | Impact | When Discovered | Root Cause |
|-------|--------|-----------------|------------|
| macOS metadata files (._*) in tarballs | Broke Linux server, MIME errors | Multiple deploys | Not using --exclude='._*' in tar |
| Hardcoded localhost URLs | API calls failed in production | Post-deploy | Not using environment-aware API_URL |
| sessionStorage vs localStorage | Admin auth failed | UAT testing | Inconsistent auth token storage |
| product.inventory.quantity vs product.quantity | Stock checks failed | UAT testing | Model structure changed, old code not updated |
| Missing receipt-text endpoint | 404 errors in admin | UAT testing | Frontend expected endpoint that didn't exist |
| Invoice generator null handling | 500 errors on download | UAT testing | Branch data sometimes null |
| Product images missing | 404 errors, broken images | UAT testing | Seed scripts didn't include real images |

### Minor Misses
| Issue | Impact | Resolution |
|-------|--------|------------|
| Branding on UAT docs | Unprofessional appearance | Added logo to training-hub, uat-testing, bug-report |
| "Cashier" terminology | Incorrect role name | Changed to "Assistant" |
| Emoji usage | Unprofessional | Removed, use Font Awesome icons |
| Green color on dashboards | Off-brand | Dashboard is black/white/charcoal only |

---

## 4. Deployment Challenges

### Challenge 1: macOS Metadata Files
**Problem:** Every tarball created on macOS includes `._*` files (Apple Double files) that break on Linux servers.

**Symptoms:**
- MIME type errors
- 500 errors on static files
- Cluttered directories

**Solution:**
```bash
# ALWAYS use these exclusions
tar --exclude='._*' --exclude='.DS_Store' --exclude='node_modules' -czf archive.tar.gz <files>
```

**Prevention:** Added to CLAUDE.md as mandatory rule.

---

### Challenge 2: CORS Issues
**Problem:** Stricter CORS in development broke production after deploy.

**Symptoms:**
- All API calls blocked
- "CORS policy" errors in console

**Root Cause:**
```javascript
// Development code blocked requests without Origin header
if (config.env === 'development' && !origin) {
  return callback(null, true);
}
// Production blocked legitimate browser navigation
```

**Solution:**
```javascript
// Allow requests with no origin (browser navigation, mobile apps)
if (!origin) {
  return callback(null, true);
}
```

---

### Challenge 3: Environment-Aware URLs
**Problem:** Hardcoded `localhost:3001` URLs in HTML files.

**Symptoms:**
- API calls to localhost in production
- "Connection refused" errors

**Solution Pattern:**
```javascript
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api/v1'
    : `${window.location.protocol}//${window.location.host}/api/v1`;
```

**Prevention:** Search all HTML files before deploy:
```bash
grep -r "localhost:3001" *.html
```

---

### Challenge 4: Database Seeding
**Problem:** Forgot to run seed scripts, app showed empty/broken.

**Required Seed Order:**
1. `seed-test-users.js` - Admin, staff, patient accounts
2. `seed-lifestyle-products.js` - CBD products
3. `seed-medical-products.js` - Section 21 products
4. `seed-cafe-menus.js` - Thaba Cafe, Morija Roastery
5. `seed-all-modules.js` - Marketplace modules
6. `seed-stock.js` - Inventory levels

**Prevention:** Create single `seed-all.js` script that runs in correct order.

---

### Challenge 5: Multiple PM2 Apps on Same Server
**Problem:** Other apps (openpharms, stoep-uat) on same server.

**Risk:** Accidentally restarting or breaking other apps.

**Solution:**
- Always use `pm2 restart bmh` (specific app name)
- Never use `pm2 restart all`
- Always run `pm2 list` before any operation

---

## 5. What Worked Well

### Successes
| Area | What Worked | Why |
|------|-------------|-----|
| Modular backend | Easy to add new routes | Clean separation of concerns |
| RBAC system | Role-based access working | Clear permission structure |
| Invoice generator | PDF generation reliable | PDFKit is solid |
| Deployment tarballs | Selective file deployment | Only changed files uploaded |
| NEXT_SESSION.md | Context preserved between sessions | Documented everything |
| CLAUDE.md | Project rules enforced | Single source of truth |

### Tools That Helped
- **PM2** - Process management, logs, restart
- **Nginx** - Reverse proxy, SSL termination
- **Font Awesome** - Professional icons (no emojis)
- **PDFKit** - Invoice/receipt generation

---

## 6. Recommendations for Next Conversion

### Pre-Conversion Checklist
- [ ] Document ALL hardcoded values to change (URLs, emails, names, colors)
- [ ] Create brand assets folder (logos, colors, fonts) FIRST
- [ ] Set up environment-aware API_URL pattern from day 1
- [ ] Create comprehensive seed script that runs everything
- [ ] Set up proper .gitignore (no node_modules, .env, ._* files)

### Development Rules
1. **Never hardcode URLs** - Always use environment detection
2. **Never use emojis** - Use Font Awesome or professional icon library
3. **Never use localStorage for admin auth** - Use sessionStorage
4. **Always check model structure** - Don't assume field names
5. **Always handle null/undefined** - Defensive coding

### Deployment Checklist
```bash
# Pre-deploy audit
grep -r "localhost:3001" *.html          # Should return 0 results
grep -r "R {" *.html                      # Template literal check
tar -tzf <tarball> | head -20            # Verify contents

# Create tarball (ALWAYS use exclusions)
tar --exclude='._*' --exclude='.DS_Store' --exclude='node_modules' -czf deploy.tar.gz <files>

# Server deploy (ALWAYS backup first)
cd /var/www/<app>
tar -czf backups/backup-$(date +%Y%m%d-%H%M%S).tar.gz <current-files>
tar -xzf /tmp/deploy.tar.gz
pm2 restart <app-name>
pm2 status
```

### Documentation Requirements
1. **CLAUDE.md** - Project rules, deployment process, important context
2. **NEXT_SESSION.md** - Session handoff, what's pending
3. **README.md** - Setup instructions, tech stack
4. **.env.example** - Required environment variables

### Suggested Project Structure Improvements
```
project/
├── backend/
│   ├── routes/
│   ├── models/
│   ├── services/
│   ├── middleware/
│   └── scripts/
│       └── seed-all.js      # Single seed script
├── frontend/
│   ├── js/
│   │   └── api.js           # Centralized API_URL
│   └── css/
├── images/
│   ├── branding/            # Logos, icons
│   └── products/            # Product images
├── docs/
│   ├── deployment.md
│   └── api.md
├── .deployignore            # Files to exclude from deploy
├── create-deploy.sh         # Standardized deploy script
└── CLAUDE.md
```

### Centralized API Configuration
Create `frontend/js/config.js`:
```javascript
// Single source of truth for API URL
window.APP_CONFIG = {
    API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001/api/v1'
        : `${window.location.protocol}//${window.location.host}/api/v1`,
    APP_NAME: 'Basotho Medical Herbs',
    VERSION: '1.0.0'
};
```

Include in all HTML files:
```html
<script src="/frontend/js/config.js"></script>
<script>
    const API_URL = window.APP_CONFIG.API_URL;
</script>
```

---

## 7. Time Lost to Preventable Issues

| Issue | Estimated Time Lost | Prevention |
|-------|---------------------|------------|
| macOS metadata files | 2-3 hours (multiple deploys) | Standard tar exclusions |
| Hardcoded localhost URLs | 1-2 hours | Environment-aware pattern |
| CORS issues | 1-2 hours | Test production config locally |
| Missing seed data | 1 hour | Single seed-all script |
| Auth token confusion | 1 hour | Document storage choice |
| Null pointer errors | 1-2 hours | Defensive coding |

**Total estimated time lost: 8-12 hours**

---

## 8. Quality Gates for Future Projects

### Before Any Commit
- [ ] No hardcoded URLs
- [ ] No emojis in code/UI
- [ ] Null checks on all object access
- [ ] Consistent auth token storage

### Before Any Deploy
- [ ] grep for localhost URLs
- [ ] Verify tarball contents
- [ ] Check ._* files excluded
- [ ] Backup current production

### After Any Deploy
- [ ] PM2 status check
- [ ] Health endpoint test
- [ ] Browser test (homepage, login, admin)
- [ ] Check PM2 logs for errors

---

## 9. Conclusion

The BMH conversion was ultimately successful, but significant time was lost to preventable issues. The main lessons:

1. **Establish patterns early** - Environment-aware URLs, auth storage, icon library
2. **Document everything** - CLAUDE.md saved us multiple times
3. **Automate deployment** - Standard tarball creation, backup-before-extract
4. **Test like production** - CORS, URLs, auth should mirror production locally
5. **Seed data matters** - Empty app looks broken, always seed

For the next branded app conversion, implement the centralized config pattern, create a single seed script, and follow the deployment checklist religiously.

---

*Document maintained by development team. Update after each major deployment.*
