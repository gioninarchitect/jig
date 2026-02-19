# JIG Rebrand - Session Handoff

**Date:** 2026-02-18
**Working Folder:** `/Users/florisolivier/jig/JIGPOS/newbrand/`
**Design System:** `/Users/florisolivier/jig/ds/JIG_DESIGN_SYSTEM_V3.md`

---

## What Was Done

### Phase 1: HTML Files (72 files)
**Script:** `rebrand-to-jig.js` (in newbrand root)
- Replaced Google Fonts (Passion One/Crimson Pro -> Anton/Oswald/Inter)
- Replaced all `:root` CSS variable blocks with JIG dark theme tokens
- Replaced hex colors, rgba colors, brand text, logo references
- Replaced `<title>` tags, theme-color meta tags, font-family declarations
- **60 files processed** (skips reference docs: debudchef-design-system.html, dbc-design-system.html, DBC-SOFTWARE-SPEC.html, dbc-testing-guide.html)

### Phase 2: Frontend/Backend JS (110 files)
**Script:** `rebrand-js.js`
- Hex colors, rgba colors, fonts, brand text ("De Bud Chef" -> "JIG Craft Cannabis")
- Logo refs, SKU prefixes (DBC- -> JIG-), order number prefixes
- Config values (fromName, JWT secret, MongoDB name, IndexedDB name)

### Phase 3: POS/Stocktake Deep Color Fix (23 files)
**Script:** `rebrand-pos-stocktake.js`
- Odyssey navy blues (#1e3a5f -> #1E1E1E, #0f172a -> #0A0A0A, #1a1a2e -> #0A0A0A)
- Tailwind slates (#334155 -> #2A2A2A, #475569 -> #3A3A3A)
- Light borders (#e8e4dc -> #2A2A2A)
- Bootstrap status colors -> JIG equivalents

### Phase 4: JS Color Remnants (10 files)
**Script:** `rebrand-js-colors.js`

### Phase 5: CSS Files (manual)
- `css/inv-dashboard.css` - Complete rewrite to JIG dark theme
- `css/globals.css` - Comment updated, imports jig-brand.css
- `css/main.css` - Comment updated, imports jig-brand.css
- `css/styles.css` - **Complete rewrite** from DBC green/gold/cream to JIG black/purple/amber dark theme
- `admin.html` - Fixed font comment

### Phase 6: React App Config
- `react-app/tailwind.config.js` - dbc-* colors -> jig-* colors, fonts updated
- `react-app/src/config/index.js` - BRAND object updated to JIG palette

---

## What Still Needs Doing

### HIGH PRIORITY: React App Components (16 files)
These are `.jsx` files in `react-app/src/` with hardcoded DBC references:

**Brand text "De Bud Chef" -> "JIG Craft Cannabis":**
- `components/storefront/StorefrontNav.jsx` (alt text, brand name)
- `components/storefront/StorefrontFooter.jsx` (alt text, brand name, copyright)
- `layouts/PublicLayout.jsx` (brand name)
- `pages/Storefront/AboutPage.jsx` (multiple brand mentions)
- `pages/Storefront/LocationsPage.jsx` (brand mentions)
- `pages/Storefront/AffiliatePage.jsx` (brand mention)
- `pages/Storefront/TermsPage.jsx` (brand mentions)
- `pages/Storefront/LandingPage.jsx` (collection name)
- `pages/Storefront/RegisterPage.jsx` (brand name, uses `text-dbc-green` class)
- `pages/Storefront/CheckoutPage.jsx` (brand name, uses `text-dbc-green` class)
- `pages/Storefront/Section21InfoPage.jsx` (brand mention, uses `text-dbc-gold` class)
- `pages/POS/PaymentProcessor.jsx` (account name)

**Email addresses @debudchef.co.za -> JIG equivalent:**
- `components/storefront/StorefrontFooter.jsx` (hello@)
- `pages/Storefront/ContactPage.jsx` (hello@)
- `pages/Storefront/MyAccountPage.jsx` (support@)
- `pages/Storefront/OrderConfirmationPage.jsx` (payments@)
- `pages/Storefront/PrivacyPage.jsx` (info@)
- `pages/Storefront/TermsPage.jsx` (info@)
- `pages/Storefront/Section21InfoPage.jsx` (privacy@)
- `pages/Storefront/LocationsPage.jsx` (7 location emails)

**Hardcoded DBC colors (#D4AF37 gold, #2A4635 green, #1E3328):**
- `pages/POS/Cart.jsx` (~8 instances of #D4AF37)
- `pages/POS/POSPage.jsx` (3 instances of #D4AF37)
- `pages/POS/ProductBrowser.jsx`
- `pages/Storefront/ProductDetailPage.jsx`
- `pages/Storefront/ProductsPage.jsx` (also has "Passion One" font)
- `pages/Admin/AdminPage.jsx`
- `pages/Operations/StocktakePage.jsx`
- `layouts/POSLayout.jsx` (#D4AF37 border)

**Tailwind classes using old prefix:**
- `text-dbc-green`, `text-dbc-gold` -> `text-jig-purple`, `text-jig-amber`

**Font references:**
- `pages/Storefront/CartPage.jsx`
- `components/storefront/FAQAccordion.jsx`
- `pages/Storefront/ProductsPage.jsx` ("Passion One" -> "Anton" or "Oswald")

### MEDIUM PRIORITY: Backend
- `backend/scripts/seed-dbc-stock.js` - Branch query uses `/dbc|debudchef/i` regex

### LOW PRIORITY: Deploy Scripts & Docs
- `deploy-live.sh` - debudchef domain references
- `deploy-stocktake.sh` - debudchef domain
- `deploy-audit-fixes.sh` - debudchef domain
- `deploy-dayend.sh` - debudchef domain
- `deploy-stocktake-fix.sh` - debudchef domain
- `CODE_REVIEW.md`, `SYSTEM_ARCHITECTURE.md`, `SUPPLY_CHAIN_ARCHITECTURE.md` etc.
- `TEST_PLAN_BY_ROLE.md`, `TESTING_PLAN.md`, `ORMONDE-LAUNCH-CHECKLIST.md`

### CLEANUP (after all rebranding done)
Delete the 4 rebrand scripts:
- `rebrand-to-jig.js`
- `rebrand-js.js`
- `rebrand-pos-stocktake.js`
- `rebrand-js-colors.js`

---

## JIG Color Mapping (Quick Reference)

| DBC (Old) | JIG (New) | Usage |
|-----------|-----------|-------|
| #3A5F48 (green) | #7C3AED (purple) | Primary accent |
| #D4AF37 (gold) | #D97706 (amber) | Secondary accent |
| #F4F0E6 (cream) | #0A0A0A (black) | Background |
| #2A4635 (green-dark) | #6D28D9 (purple-dark) | Dark accent |
| #1E3328 (green-deep) | #1E1E1E (slate) | Surface |
| Passion One | Anton | Display headings |
| Crimson Pro | Oswald | Subheadings/labels |
| Inter | Inter | Body (unchanged) |

## Tailwind Class Mapping

| Old Class | New Class |
|-----------|-----------|
| text-dbc-green | text-jig-purple |
| text-dbc-gold | text-jig-amber |
| bg-dbc-green | bg-jig-purple |
| bg-dbc-cream | bg-jig-black |
| border-dbc-gold | border-jig-amber |

---

## Approach for Next Session

Best approach for the remaining React files: write a single rebrand script similar to `rebrand-js.js` that targets `react-app/src/**/*.jsx` files and replaces:
1. "De Bud Chef" -> "JIG Craft Cannabis"
2. @debudchef.co.za -> appropriate JIG domain
3. #D4AF37 -> #D97706 (amber)
4. #3A5F48 -> #7C3AED (purple)
5. #2A4635 -> #6D28D9 (purple-dark)
6. #1E3328 -> #1E1E1E (slate)
7. "Passion One" -> "Anton"
8. "Crimson Pro" -> "Oswald"
9. text-dbc-green -> text-jig-purple
10. text-dbc-gold -> text-jig-amber
11. bg-dbc-* -> bg-jig-*
