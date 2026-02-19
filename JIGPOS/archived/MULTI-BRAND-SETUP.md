# Multi-Brand White Label Marketplace
**Platform Owner**: Hive Mind Digital
**Date**: November 11, 2025

---

## Overview

We've created a white-label module marketplace system that allows multiple cannabis brands to operate independently while sharing the same backend infrastructure and module marketplace.

### Brand Instances Created

1. **version-1.1/** - Basotho Medical Herbs (Updated Base)
   - Port: 3001
   - Database: bmh
   - URL: http://localhost:3001
   - Status: ✅ Running with module integration

2. **canna-care/** - Canna Care (New Brand)
   - Port: 3002
   - Database: cannacare
   - URL: http://localhost:3002
   - Status: ⏳ Ready to start

---

## Architecture

### Shared Components
- Backend code (modules, routes, middleware)
- Module marketplace (modules.html - Hive Mind Digital branding)
- Database models
- API structure

### Brand-Specific Components
- Port number (3001, 3002, etc.)
- Database name (bmh, cannacare, etc.)
- Branding (colors, logo, content)
- Frontend pages (index.html, about.html, etc.)
- .env configuration

---

## Module Marketplace Features

### DEV Mode (localhost)
- **Behavior**: Shows ALL modules automatically for testing
- **Purpose**: Allows testing module functionality without subscriptions
- **Applies to**: version-1.1 (port 3001) and canna-care (port 3002)

### PRODUCTION Mode (deployed)
- **Behavior**: Only shows modules with 'trial' or 'active' subscriptions
- **Purpose**: Enforces payment/subscription model
- **Applies to**: Any deployment to non-localhost domain

### Available Modules

1. **Drive-Through** (moduleId: `drive-through`)
   - Menu item: "Drive-Through" with car icon
   - Price: R999/month
   - Status: ✅ Added to sidebar

2. **Affiliate System** (moduleId: `affiliate-system`)
   - Menu item: "Affiliates" with users icon
   - Price: R799/month
   - Status: ✅ Added to sidebar

3. **Voucher System** (moduleId: `voucher-system`)
   - Menu item: "Vouchers" with ticket icon
   - Price: R599/month
   - Status: ✅ Added to sidebar

4. **Viral Marketing** (moduleId: `viral-engine`)
   - Menu item: "Viral Marketing" with fire icon
   - Price: R899/month
   - Status: ✅ Added to sidebar

---

## Key Implementation Details

### checkModuleSubscriptions() Function
Location: `admin.html:4259-4314`

```javascript
async function checkModuleSubscriptions() {
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';

    if (isDevelopment) {
        // DEV MODE: Show all modules
        const allModuleItems = document.querySelectorAll('.sidebar-menu-item[data-module]:not([data-module="marketplace"])');
        allModuleItems.forEach(item => {
            item.style.display = 'flex';
        });
        return;
    }

    // PRODUCTION MODE: Only show paid modules
    const response = await fetch(`${API_URL}/subscriptions/my-subscriptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    data.subscriptions.forEach(subscription => {
        if (['trial', 'active'].includes(subscription.status)) {
            const menuItem = document.querySelector(`.sidebar-menu-item[data-module="${subscription.moduleId}"]`);
            if (menuItem) {
                menuItem.style.display = 'flex';
            }
        }
    });
}
```

### Module Menu Items
Location: `admin.html:774-793`

```html
<!-- Always visible -->
<div class="sidebar-menu-item" onclick="window.location.href='modules.html'" data-module="marketplace">
    <i class="fas fa-puzzle-piece"></i>
    <span>Module Marketplace</span>
</div>

<!-- Hidden by default, shown based on subscription -->
<div class="sidebar-menu-item" onclick="navigateToTab('drive-through')" data-module="drive-through" style="display:none;">
    <i class="fas fa-car"></i>
    <span>Drive-Through</span>
</div>

<div class="sidebar-menu-item" onclick="navigateToTab('affiliates')" data-module="affiliate-system" style="display:none;">
    <i class="fas fa-users"></i>
    <span>Affiliates</span>
</div>

<div class="sidebar-menu-item" onclick="navigateToTab('vouchers')" data-module="voucher-system" style="display:none;">
    <i class="fas fa-ticket-alt"></i>
    <span>Vouchers</span>
</div>

<div class="sidebar-menu-item" onclick="navigateToTab('viral')" data-module="viral-engine" style="display:none;">
    <i class="fas fa-fire"></i>
    <span>Viral Marketing</span>
</div>
```

---

## How to Add a New Brand

1. **Copy Base Instance**
   ```bash
   rsync -av --exclude='node_modules' --exclude='.git' version-1.1/ new-brand/
   ```

2. **Update .env File**
   ```env
   PORT=3003  # Increment port number
   MONGODB_URI=mongodb://localhost:27017/newbrand
   JWT_SECRET=newbrand_secret_change_in_production
   BASE_URL=http://localhost:3003
   BRAND_NAME=New Brand Name
   BRAND_EMAIL=info@newbrand.com
   ```

3. **Create Brand Config**
   - Copy `BRAND_CONFIG.md` from canna-care
   - Update brand-specific details

4. **Customize Branding**
   - Replace logo in `images/`
   - Update colors in CSS
   - Modify homepage content
   - Update meta tags

5. **Create Database**
   ```bash
   mongosh
   use newbrand
   # Run seed scripts
   ```

6. **Start Server**
   ```bash
   cd new-brand
   npm start
   ```

7. **Test**
   - Visit http://localhost:PORT
   - Login to admin panel
   - Verify all modules visible (DEV mode)
   - Subscribe to modules via marketplace
   - Test module functionality

---

## Testing Checklist

### version-1.1 (Basotho Medical Herbs)
- [ ] Server running on port 3001
- [ ] Login to admin panel
- [ ] Verify all 4 modules visible in sidebar (DEV mode)
- [ ] Click "Module Marketplace" → Opens modules.html
- [ ] Click each module menu item → Navigates to tab
- [ ] Test module subscription flow

### canna-care (Canna Care)
- [ ] Update .env with PORT=3002
- [ ] Create cannacare MongoDB database
- [ ] Start server on port 3002
- [ ] Login to admin panel
- [ ] Verify all 4 modules visible in sidebar (DEV mode)
- [ ] Test module marketplace integration

---

## Next Steps

1. **Test Version 1.1 Modules**
   - Verify DEV mode shows all modules
   - Test module subscription workflow
   - Integrate module pages into admin dashboard tabs

2. **Customize Canna Care Branding**
   - Create logo and brand assets
   - Update colors and fonts
   - Modify homepage content

3. **Create Module Tab Content**
   - Drive-Through tab integration
   - Affiliates tab integration
   - Vouchers tab integration
   - Viral Marketing tab integration

4. **Production Deployment**
   - Deploy version-1.1 to 154.66.197.104 (CBD Wellness)
   - Deploy canna-care to separate server
   - Test PRODUCTION mode subscription enforcement

---

## Files Created/Modified

### version-1.1/
- `admin.html:4259-4314` - checkModuleSubscriptions() with DEV/PROD modes
- `admin.html:774-793` - Module menu items with data-module attributes

### canna-care/
- `BRAND_CONFIG.md` - Brand configuration documentation
- `.env` - Canna Care environment config (PORT=3002, DB=cannacare)
- All files copied from version-1.1

### Root directory
- `MULTI-BRAND-SETUP.md` - This file

---

## Important Notes

- **Module Marketplace Ownership**: Hive Mind Digital (not individual brands)
- **DEV Mode**: Auto-shows all modules on localhost for testing
- **PRODUCTION Mode**: Subscription-based module visibility
- **Port Allocation**: Each brand needs unique port (3001, 3002, 3003, etc.)
- **Database Isolation**: Each brand has separate MongoDB database
- **Shared Backend**: All brands share same backend code/modules
- **Module Testing**: Can be done later, focus is on multi-brand setup now
