# Rebranding Workflow - Efficient App Clone Rebranding

This document outlines the systematic workflow for rebranding a cloned application.
Developed during the CBD Wellness 24 to Basotho Medical Herbs rebrand.

## Prerequisites

Before starting:
1. Have the new brand design system ready (colors, fonts, logo files)
2. Know the new domain/email addresses
3. Have logo files in correct formats (PNG, with transparent backgrounds)

## Quick Rebrand Checklist

### Step 1: Brand Asset Collection (5 min)
- [ ] Primary brand color hex code
- [ ] Secondary brand color hex code
- [ ] Hover state colors
- [ ] Font family names (headings + body)
- [ ] New domain name
- [ ] New email format
- [ ] New tagline
- [ ] Logo files (light bg, dark bg, white, dark versions)

### Step 2: Automated Text Replacement (10 min)

Run these sed commands from project root:

```bash
# Replace brand name (adjust OLD_BRAND and NEW_BRAND)
OLD_BRAND="CBD Wellness 24"
NEW_BRAND="Basotho Medical Herbs"
OLD_DOMAIN="cbdwellness24.co.za"
NEW_DOMAIN="basothomedicalherbs.ls"
OLD_DB="cbdwellness24"
NEW_DB="bmh"

# HTML files - all at once
find . -name "*.html" -not -path "./node_modules/*" -exec sed -i '' "s/${OLD_BRAND}/${NEW_BRAND}/g" {} \;
find . -name "*.html" -not -path "./node_modules/*" -exec sed -i '' "s/${OLD_DOMAIN}/${NEW_DOMAIN}/g" {} \;
find . -name "*.html" -not -path "./node_modules/*" -exec sed -i '' "s/${OLD_DB}/${NEW_DB}/g" {} \;

# JavaScript files
find . -name "*.js" -not -path "./node_modules/*" -exec sed -i '' "s/${OLD_BRAND}/${NEW_BRAND}/g" {} \;
find . -name "*.js" -not -path "./node_modules/*" -exec sed -i '' "s/${OLD_DOMAIN}/${NEW_DOMAIN}/g" {} \;
find . -name "*.js" -not -path "./node_modules/*" -exec sed -i '' "s/${OLD_DB}/${NEW_DB}/g" {} \;

# Markdown and text files
find . -name "*.md" -not -path "./node_modules/*" -exec sed -i '' "s/${OLD_BRAND}/${NEW_BRAND}/g" {} \;
find . -name "*.md" -not -path "./node_modules/*" -exec sed -i '' "s/${OLD_DOMAIN}/${NEW_DOMAIN}/g" {} \;
find . -name "*.md" -not -path "./node_modules/*" -exec sed -i '' "s/${OLD_DB}/${NEW_DB}/g" {} \;

# Shell scripts
find . -name "*.sh" -not -path "./node_modules/*" -exec sed -i '' "s/${OLD_DOMAIN}/${NEW_DOMAIN}/g" {} \;
find . -name "*.sh" -not -path "./node_modules/*" -exec sed -i '' "s/${OLD_DB}/${NEW_DB}/g" {} \;

# JSON files (careful with package.json)
find . -name "*.json" -not -path "./node_modules/*" -exec sed -i '' "s/${OLD_DOMAIN}/${NEW_DOMAIN}/g" {} \;
```

### Step 3: Update CSS Brand Colors (5 min)

Edit `css/styles.css` and add/update CSS variables:

```css
:root {
    --brand-teal: #0B8C7A;           /* Primary */
    --brand-navy: #1E3A5F;           /* Secondary */
    --brand-teal-hover: #097563;     /* Hover state */
    --brand-teal-light: #0EBAAA;     /* Light accent */
}
```

Then replace all old color references with CSS variables.

### Step 4: Update .env File (2 min)

```bash
# Update .env
MONGODB_URI=mongodb://localhost:27017/NEW_DB_NAME
JWT_SECRET=new_secret_key
SMTP_HOST=mail.newdomain.com
SMTP_USER=accounts@newdomain.com
SMTP_FROM_EMAIL=hello@newdomain.com
SMTP_FROM_NAME=New Brand Name
```

### Step 5: Replace Logo Files (5 min)

Replace these files in `/images/`:
- `logo.png` - Main logo
- `logo-w.png` - White version (for dark backgrounds)
- `logo-d.png` - Dark version (for light backgrounds)
- `logow.png` - White version alternate

### Step 6: Update CLAUDE.md (3 min)

Update the project documentation with new brand info.

### Step 7: Verification (10 min)

```bash
# Search for any remaining old brand references
grep -r "OLD_BRAND\|OLD_DOMAIN" --include="*.js" --include="*.html" --include="*.md" . | grep -v node_modules

# Should return 0 results
```

### Step 8: Test Application (5 min)

```bash
npm run dev
# Visit http://localhost:3001
# Check all pages load with new branding
```

## Files That Need Manual Review

These files often have hardcoded values:
1. `.env` and `.env.production`
2. `backend/config/index.js`
3. `backend/server.js` (CORS origins)
4. All seed scripts (`seed-*.js`)
5. Test files (`tests/**/*.js`)
6. Deployment scripts (`deploy-*.sh`)

## Common Pitfalls

1. **localStorage keys** - Update cart/session storage key names
2. **Email templates** - Check `backend/services/emailService.js`
3. **Invoice generator** - Check `backend/services/invoiceGenerator.js`
4. **Test user emails** - Update in seed scripts
5. **API swagger docs** - Check `backend/swagger.js`

## Estimated Total Time: 45-60 minutes

---

## Rebrand Summary for BMH

**From:** CBD Wellness 24
**To:** Basotho Medical Herbs (BMH)

### Key Changes Made:
- Domain: cbdwellness24.co.za -> basothomedicalherbs.ls
- Database: cbdwellness24 -> bmh
- Email format: @cbdwellness24.co.za -> @basothomedicalherbs.ls
- Tagline: "Natural Relief, Available Anytime" -> "Cultivating Excellence"
- Colors: Red/Green -> Teal (#0B8C7A) / Navy (#1E3A5F)
- Fonts: System fonts -> Inter + Playfair Display

### Files Updated:
- 42+ HTML files
- 50+ JavaScript files
- 30+ Markdown files
- CSS stylesheets
- Environment files
- Backend services
- Test scripts
- Deployment scripts
