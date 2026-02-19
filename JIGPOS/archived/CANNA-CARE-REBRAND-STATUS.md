# Canna Care Rebranding Status
**Date**: November 11, 2025
**Status**: Logo Replaced ✓ | Colors Updated ✓ | Server Running on Port 3002 ✓

---

## ✅ Completed

### 1. Logo Replacement
- **Source**: `/Users/florisolivier/CannaCare/images/CannCare.jpeg`
- **Copied to**: `canna-care/images/CannCare.jpeg`
- **Replaced files**:
  - `logo.png` ✓
  - `logo-w.png` ✓ (white/light background)
  - `logo-d.png` ✓ (dark background)
  - `logow.png` ✓
  - `logod.png` ✓

### 2. Brand Configuration
- **.env file**: Updated with PORT=3002, DATABASE=cannacare ✓
- **backend/server.js**: Fixed dotenv loading with override flag ✓
- **BRAND_CONFIG.md**: Created with customization checklist ✓
- **Server**: Running successfully on http://localhost:3002 ✓

### 3. Brand Manager Tool
- **Location**: `brand-manager-simple.html`
- **Design**: Clean white-label (NO PURPLE!)
- **Purpose**: Easy rebranding for future brands

---

## 🎨 Canna Care Brand Colors (from logo)

```css
--canna-primary: #6B7F47;      /* Olive/Sage Green from logo */
--canna-accent: #7D9456;       /* Lighter green */
--canna-dark: #4A5731;         /* Darker green */
--canna-light: #F5F5F5;        /* Clean white/light gray */
--canna-text: #333333;         /* Dark text */
--canna-background: #FFFFFF;   /* White background */
```

---

### 4. CSS Color Updates ✓
- **canna-care/css/style.css**: All colors updated to Canna Care green (#6B7F47) ✓
- **canna-care/css/styles.css**: All colors updated to Canna Care green (#6B7F47) ✓
- Replaced all `#dc2626` (red) with `#6B7F47` (Canna Care green)
- Replaced all `#b91c1c` (dark red) with `#4A5731` (dark Canna Care green)
- Replaced all `#2c5530` (CBD green background) with `#6B7F47`

---

## ⏳ Pending Tasks

### High Priority
1. **Update CSS Color Variables** ✓ COMPLETED
   - File: `canna-care/css/style.css` ✓
   - File: `canna-care/css/styles.css` ✓

2. **Update HTML Brand References**
   - Replace "Basotho Medical Herbs" → "Canna Care"
   - Update meta tags (title, description)
   - Update contact email: info@cannacare.co.za
   - Files to update:
     - index.html
     - about.html
     - contact.html
     - dashboard.html
     - admin.html

3. **Remove Old CBD Logos**
   - Delete: `CBD-wellness-est.png`
   - Delete: `CBD-wellness-est-wht.png`
   - Keep only: `CannCare.jpeg` and generated variants

### Medium Priority
4. **Create Database**
   ```bash
   mongosh
   use cannacare
   # Run seed scripts
   ```

5. **Test Server**
   ```bash
   cd canna-care
   npm start  # Should run on port 3002
   ```

6. **Test Module Visibility**
   - Visit http://localhost:3002/admin
   - Verify all 4 modules visible (DEV mode)
   - Test module subscription flow

### Low Priority
7. **Customize Content**
   - Homepage hero section
   - About page story
   - Product categories
   - Section 21 compliance text

8. **Create Canna Care Assets**
   - Favicon
   - Social media images
   - Email templates

---

## 📁 File Structure

```
canna-care/
├── .env                    # PORT=3002, DB=cannacare ✓
├── images/
│   ├── CannCare.jpeg       # Original logo ✓
│   ├── logo.png            # Replaced ✓
│   ├── logo-w.png          # Replaced ✓
│   ├── logo-d.png          # Replaced ✓
│   ├── logow.png           # Replaced ✓
│   └── logod.png           # Replaced ✓
├── css/
│   ├── style.css           # ⏳ Update colors
│   └── styles.css          # ⏳ Update colors
├── index.html              # ⏳ Update brand name
├── admin.html              # ⏳ Update brand name
└── BRAND_CONFIG.md         # Documentation ✓
```

---

## 🚀 Quick Start Commands

### 1. Update CSS Colors (Manual)
```bash
cd canna-care

# Find all color references
grep -r "#2D5016" css/
grep -r "cbd-forest-green" css/

# Replace with Canna Care colors
# Use find/replace in editor
```

### 2. Update Brand Name (Manual)
```bash
# Find all "CBD Wellness" references
grep -r "CBD Wellness" *.html

# Replace with "Canna Care"
```

### 3. Start Canna Care Server
```bash
cd canna-care
npm start
# Visit: http://localhost:3002
```

### 4. Create Database
```bash
mongosh
use cannacare
db.users.insertOne({
  email: "admin@cannacare.co.za",
  password: "$2a$10$...",  # Use reset-admin-password.js
  role: "admin"
})
```

---

## 🎯 Testing Checklist

### Logo Testing
- [ ] Visit http://localhost:3002
- [ ] Check logo appears on homepage
- [ ] Check logo in navigation
- [ ] Check logo on admin panel
- [ ] Check logo on dark backgrounds
- [ ] Check logo on light backgrounds

### Color Testing
- [ ] Primary green matches logo (#6B7F47)
- [ ] Buttons use Canna Care green
- [ ] Links use Canna Care green
- [ ] Headers use Canna Care green
- [ ] No CBD Wellness green (#2D5016) remaining

### Brand Name Testing
- [ ] Homepage title says "Canna Care"
- [ ] Browser tab title says "Canna Care"
- [ ] Meta description mentions "Canna Care"
- [ ] Footer says "Canna Care"
- [ ] Contact email is info@cannacare.co.za
- [ ] No "Basotho Medical Herbs" text remaining

---

## 📝 Notes

- **Logo Format**: Currently JPEG - consider converting to PNG with transparency for better quality
- **Color Consistency**: Extract exact hex codes from logo for perfect match
- **White Label**: All branding should be easily replaceable for future brands
- **Module Marketplace**: Keep "Hive Mind Digital" branding (marketplace owner)

---

## Next Brand Instance

When creating the next brand (e.g., "Green Leaf"), follow this process:

1. Copy `canna-care` to `new-brand-name`
2. Update `.env` (PORT=3003, DATABASE=newbrand)
3. Replace logos in `images/` folder
4. Update CSS colors
5. Find/replace brand name in HTML files
6. Create database
7. Test on http://localhost:3003

**Estimated time per brand**: 30-60 minutes with this system!
