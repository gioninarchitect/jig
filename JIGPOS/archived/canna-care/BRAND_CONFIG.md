# Canna Care - Brand Configuration
**Instance**: Canna Care
**Parent Platform**: Hive Mind Digital Module Marketplace (White Label)
**Created**: November 11, 2025

---

## Brand Identity

### Business Information
- **Brand Name**: Canna Care
- **Tagline**: [To be defined]
- **Industry**: Cannabis Care & Wellness
- **Target Market**: [To be defined]

### Brand Colors
```css
/* Default CBD Wellness colors - TO BE CUSTOMIZED */
--primary-color: #2D5016;       /* Canna Care primary */
--accent-color: #4A7C59;        /* Canna Care accent */
--light-accent: #6B9080;        /* Light accent */
--background: #F4F1DE;          /* Backgrounds */
--secondary: #8B7355;           /* Secondary text */
--text-primary: #2F2F2F;        /* Body text */
--premium: #C9A961;             /* Premium accents */
```

### Logo & Assets
- Logo location: `/images/canna-care-logo.png` (to be added)
- Favicon: `/images/canna-care-favicon.ico` (to be added)
- Brand assets: `/images/branding/canna-care/` (to be created)

---

## Technical Configuration

### Database
- **Database Name**: `cannacare` (separate from cbdwellness24)
- **MongoDB URI**: `mongodb://localhost:27017/cannacare`
- **Port**: 3002 (to avoid conflict with CBD Wellness on 3001)

### Environment Variables (.env)
```env
# Canna Care Environment Configuration
NODE_ENV=development
PORT=3002
MONGODB_URI=mongodb://localhost:27017/cannacare
JWT_SECRET=cannacare_secret_change_in_production

# Brand Info
BRAND_NAME=Canna Care
BRAND_EMAIL=info@cannacare.co.za
BRAND_PHONE=+27-XX-XXX-XXXX
BRAND_ADDRESS=TBD

# Hive Mind Digital Marketplace
MARKETPLACE_OWNER=Hive Mind Digital
MARKETPLACE_API=https://marketplace.hiveminddigital.co.za/api
```

### Server Configuration
- **Development**: http://localhost:3002
- **Production**: [To be defined - separate domain/IP]
- **Admin Panel**: http://localhost:3002/admin
- **Dashboard**: http://localhost:3002/dashboard

---

## Module Marketplace Integration

### Available Modules (Hive Mind Digital)
All modules from the Hive Mind Digital marketplace are available:

1. **Drive-Through Module** (moduleId: `drive-through`)
   - Price: R999/month
   - Features: Order management, EFT integration, customer notifications

2. **Affiliate System** (moduleId: `affiliate-system`)
   - Price: R799/month
   - Features: Wellness advocate program, commission tracking, referral management

3. **Voucher System** (moduleId: `voucher-system`)
   - Price: R599/month
   - Features: Discount codes, gift vouchers, loyalty rewards

4. **Viral Marketing Engine** (moduleId: `viral-engine`)
   - Price: R899/month
   - Features: Influencer verification, campaign tracking, viral scoring

### Module Visibility Rules
- **DEV Mode** (localhost:3002): All modules visible for testing
- **PRODUCTION Mode**: Only modules with 'trial' or 'active' subscription status visible

---

## Customization Checklist

### Phase 1: Branding
- [ ] Replace all "CBD Wellness 24" references with "Canna Care"
- [ ] Update brand colors in CSS
- [ ] Create and add Canna Care logo
- [ ] Update favicon
- [ ] Customize email templates with Canna Care branding
- [ ] Update meta tags and SEO information

### Phase 2: Database Setup
- [ ] Create `cannacare` MongoDB database
- [ ] Run database migrations
- [ ] Seed initial data (products, users, modules)
- [ ] Create admin user for Canna Care
- [ ] Set up test users

### Phase 3: Module Configuration
- [ ] Test module marketplace connection
- [ ] Subscribe to required modules (Drive-Through, Affiliates, etc.)
- [ ] Configure module settings per Canna Care requirements
- [ ] Test module activation/deactivation

### Phase 4: Content Customization
- [ ] Update homepage content
- [ ] Customize about page
- [ ] Update contact information
- [ ] Create Canna Care-specific product categories
- [ ] Add Canna Care product catalog

### Phase 5: Deployment
- [ ] Set up production server
- [ ] Configure domain/SSL
- [ ] Deploy to production
- [ ] Test production module subscription billing

---

## File Structure

```
canna-care/
├── .env                    # Canna Care environment config (PORT=3002, DB=cannacare)
├── backend/
│   ├── server.js           # Port 3002
│   └── modules/            # Shared Hive Mind Digital modules
├── images/
│   └── branding/
│       └── canna-care/     # Brand-specific assets
├── index.html              # Homepage (Canna Care branding)
├── admin.html              # Admin panel (connects to Hive Mind marketplace)
├── modules.html            # Module marketplace (Hive Mind Digital branding)
└── BRAND_CONFIG.md         # This file
```

---

## Key Differences from CBD Wellness 24

| Aspect | CBD Wellness 24 | Canna Care |
|--------|-----------------|------------|
| Port | 3001 | 3002 |
| Database | cbdwellness24 | cannacare |
| Primary Color | #2D5016 (forest green) | [TBD] |
| Logo | CBD Wellness logo | Canna Care logo |
| Email | hello@cbdwellness24.co.za | info@cannacare.co.za |
| Domain | portal.cbdwellness24.co.za | [TBD] |

---

## Notes

- This is a **white-label instance** of the Hive Mind Digital Module Marketplace
- Module marketplace (modules.html) should maintain Hive Mind Digital branding
- Admin dashboard integrates modules via subscription-based visibility
- Each brand has its own database, port, and environment config
- Backend code is shared across all brands (via rsync or git)
- Frontend branding is customized per brand

---

## Next Steps

1. Update .env file with Canna Care settings (PORT=3002, DB=cannacare)
2. Create cannacare MongoDB database
3. Customize branding (colors, logo, text)
4. Test server on http://localhost:3002
5. Subscribe to modules via marketplace
6. Test module visibility in admin dashboard
