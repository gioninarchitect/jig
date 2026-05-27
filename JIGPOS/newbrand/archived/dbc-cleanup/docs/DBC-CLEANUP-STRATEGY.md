# DBC Cleanup Strategy - JIGPOS/newbrand

**Created:** 2026-02-20
**Goal:** Eliminate ALL DBC (De Bud Chef) contamination from the JIG POS ecosystem

---

## Execution Order

1. **ARCHIVE** - Remove junk files that shouldn't exist (safe, no breakage)
2. **RENAME** - Core JS modules dbc-* → jig-* (risky, update all imports)
3. **REPLACE** - Text strings, colors, branch codes (automated script)
4. **VERIFY** - Grep sweep + visual audit

---

## Phase 1: ARCHIVE (Move to JIGPOS/archived/)

These files serve no purpose in the JIG codebase. Move them, don't delete — in case we need reference later.

### DBC Logo Images (7 files)
```
brandkit-dbc-1.png
dbc-logo-nobg.png
images/dbc-logo-option2-source.png
images/dbc-logo-nobg.png
images/dbc-logo.png
react-app/public/images/dbc-logo-nobg.png
react-app/dist/images/dbc-logo-nobg.png
```

### DBC Design System / Spec Docs (3 files)
```
dbc-design-system.html
debudchef-design-system.html
DBC-SOFTWARE-SPEC.html
```

### Old Session / Planning Docs (10+ files)
```
SESSION_CONTEXT_P36-P41.md
NEXT_BRANDING_SESSION.md
NEXT_SESSION.md
CODE_REVIEW.md
ORMONDE-LAUNCH-CHECKLIST.md
ORMONDE_LAUNCH_CHECKLIST.md
TESTING_PLAN.md
TEST_PLAN_BY_ROLE.md
SUPPLY_CHAIN_ARCHITECTURE.md
SYSTEM_ARCHITECTURE.md
```

### Old DBC Deploy Scripts (6 files)
These reference `/var/www/dbc` paths and `dbc` PM2 process names — useless for JIG.
```
check-production.sh
deploy-now.sh (the JIGPOS one, not the src/ one)
deploy-audit-fixes.sh
deploy-dayend.sh
deploy-live.sh
deploy-stocktake-fix.sh
deploy-stocktake.sh
```

### Old DBC Seed/Fix Scripts (12+ files)
These reference database name `dbc` and `/var/www/dbc` paths.
```
seed-dbc-stock.js
backend/scripts/seed-dbc-stock.js
seed-uat-users.js
fix-r0-prices.js
check-ormonde-stock.js
add-missing-products.js
add-missing-strains.js
list-ormonde-stock.js
seed-all-test-users.js
load-branch-stock.js
fix-session-items.js
check-nfs.js
fix-section21-setup.js
```

### Old DBC Menu Board
```
menu-board.html (references "Da Bud Chef")
```

**Total to archive: ~40 files**
**Risk: ZERO** — these are standalone files not imported by anything active.

---

## Phase 2: RENAME Core JS Modules (HIGH RISK - careful execution)

Three core modules still carry the DBC name and are imported by 50+ HTML pages each.

### The Problem

| Old File | New File | Imported By | Exports |
|----------|----------|-------------|---------|
| `frontend/dbc-auth.js` | `frontend/jig-auth.js` | ~30 HTML pages | OTP auth functions |
| `frontend/dbc-core.js` | **DELETE** (jig-core.js exists) | ~40 HTML pages | `window.DBC` namespace |
| `frontend/dbc-utils.js` | `frontend/jig-utils.js` | ~50 HTML pages | `showToast`, `apiCall`, etc. |

### The Conflict: dbc-core.js vs jig-core.js

Both files exist. `jig-core.js` already has the line:
```javascript
window.DBC = JIG;  // backward compat alias
```

This means `jig-core.js` IS the replacement. We need to:
1. Delete `dbc-core.js`
2. Ensure every page loads `jig-core.js` instead
3. Eventually remove the `window.DBC = JIG` alias (after all references updated)

### Rename Procedure

**Step 1:** Rename files
```bash
cd JIGPOS/newbrand/frontend
cp dbc-auth.js jig-auth.js      # copy, don't move yet
cp dbc-utils.js jig-utils.js    # copy, don't move yet
```

**Step 2:** Update ALL HTML `<script>` tags (automated)
```bash
# Find every HTML file that loads these scripts
grep -rn 'dbc-auth\.js\|dbc-core\.js\|dbc-utils\.js' --include="*.html" JIGPOS/newbrand/

# Replace in all HTML files
find JIGPOS/newbrand -name "*.html" -exec sed -i '' \
  -e 's|frontend/dbc-auth\.js|frontend/jig-auth.js|g' \
  -e 's|frontend/dbc-core\.js|frontend/jig-core.js|g' \
  -e 's|frontend/dbc-utils\.js|frontend/jig-utils.js|g' {} +
```

**Step 3:** Update JS cross-references
```bash
# Any JS file that imports/references these
grep -rn 'dbc-auth\|dbc-core\|dbc-utils' --include="*.js" JIGPOS/newbrand/frontend/
```

**Step 4:** Update window.DBC references → window.JIG
```bash
# Find all references to the DBC namespace
grep -rn 'window\.DBC\|DBC\.' --include="*.js" --include="*.html" JIGPOS/newbrand/
# Replace: window.DBC → window.JIG, DBC.functionName → JIG.functionName
```

**Step 5:** Test EVERY page loads correctly

**Step 6:** Delete old files
```bash
rm frontend/dbc-auth.js frontend/dbc-core.js frontend/dbc-utils.js
```

**Risk: HIGH** — one missed import = broken page. Must grep-verify before deleting old files.

---

## Phase 3: REPLACE - Automated String/Color Swap

Run a single script to fix all remaining DBC text, colors, and references.

### 3A: Brand Text Replacements

| Find | Replace | Context |
|------|---------|---------|
| `De Bud Chef` | `JIG Craft Cannabis` | Display text |
| `DBC Wellness` | `JIG Craft Cannabis` | Some pages |
| `Da Bud Chef` | `JIG Craft Cannabis` | Typo variant in menu-board |
| `debudchef.co.za` | `jigcraftcannabis.co.za` | Email domains |
| `@debudchef` | `@jigcraftcannabis` | Email handles |
| `DBC-ORM` | `JIG-ORM` | Branch codes |
| `DBC-FBG` | `JIG-FBG` | Branch codes |
| `DBC-KDP` | `JIG-KDP` | Branch codes |
| `DBC-MYF` | `JIG-MYF` | Branch codes |
| `DBC-LDB` | `JIG-LDB` | Branch codes |
| `DBC-RSB` | `JIG-RSB` | Branch codes |
| `DBC-SPV` | `JIG-SPV` | Branch codes |
| `DBC-WBM` | `JIG-WBM` | Branch codes |
| `/var/www/dbc` | `/var/www/jig` | Server paths (in non-archived scripts) |
| `db('dbc')` | `db('jig')` | MongoDB database name |

### 3B: CSS Color Replacements

These are DBC-era colors still present in 84+ files and 1,449+ lines:

| Old Color | Hex | New Color | Hex | Mapping |
|-----------|-----|-----------|-----|---------|
| Green (primary) | `#15803D` | Purple | `#7C3AED` | Primary |
| Green dark | `#166534` | Purple dark | `#6D28D9` | Primary dark |
| Green light | `#22C55E` | Purple light | `#A855F7` | Primary light |
| Gold (accent) | `#D4AF37` | Amber | `#D97706` | Secondary |
| Cream (bg) | `#F4F0E6` | Black | `#0A0A0A` | Background |

| Old CSS Variable | New CSS Variable |
|-----------------|-----------------|
| `var(--green)` | `var(--purple)` |
| `var(--green-dark)` | `var(--purple-dark)` |
| `var(--green-deep)` | `var(--purple-dark)` |
| `var(--green-light)` | `var(--purple-light)` |
| `var(--gold)` | `var(--amber)` |
| `var(--gold-light)` | `var(--amber-light)` |
| `var(--cream)` | `var(--black)` |
| `var(--cream-dark)` | `var(--slate)` |

### 3C: Files That Need Color Work (by priority)

**Heavy (50+ color refs each):**
- pos.html
- branch-receiving.html
- locations.html
- products.html
- owner-dashboard.html
- training-inventory-manager.html

**Medium (10-30 color refs each):**
- dashboard.html
- stocktake-app.html
- dispatch-app.html
- admin.html
- owner-dashboard.html

**Light (1-10 color refs each):**
- 30+ remaining HTML files
- 5+ JS files (inline styles in template literals)
- react-app/tailwind.config.js
- react-app/src/config/index.js
- css/inv-dashboard.css
- css/styles.css

---

## Phase 4: VERIFY

### Grep Sweep (must return ZERO results)
```bash
# DBC brand name references
grep -rni "De Bud\|DBC\|debudchef\|dbc-\|dbc_\|window\.DBC" \
  --include="*.html" --include="*.js" --include="*.jsx" \
  --include="*.css" --include="*.json" --include="*.ts" \
  JIGPOS/newbrand/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=archived

# Old DBC hex colors
grep -rni "#15803D\|#166534\|#22C55E\|#D4AF37\|#F4F0E6" \
  --include="*.html" --include="*.js" --include="*.css" --include="*.jsx" \
  JIGPOS/newbrand/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=archived

# Old CSS variable names
grep -rni "var(--green)\|var(--gold)\|var(--cream)" \
  --include="*.html" --include="*.js" --include="*.css" \
  JIGPOS/newbrand/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=archived

# DBC-prefixed filenames
find JIGPOS/newbrand -name "dbc*" -not -path "*/archived/*" -not -path "*/node_modules/*"
```

### Visual Audit Checklist
```
[ ] Landing page (index.html)
[ ] Login / Register
[ ] POS terminal
[ ] Stocktake app
[ ] Inventory Manager dashboard
[ ] Admin dashboard
[ ] Owner dashboard
[ ] Dispatch app
[ ] Packer app
[ ] Products page
[ ] Cart / Checkout
[ ] All 8 branch pages
[ ] Locations page
[ ] Training hub
[ ] Coming soon page
[ ] Age gate modal
```

### Functional Test
```
[ ] Login with OTP (jig-auth.js works)
[ ] Navigate to POS (jig-core.js namespace works)
[ ] Add item to cart (jig-utils.js apiCall works)
[ ] Run stocktake count
[ ] Check admin dashboard loads
[ ] Check owner dashboard loads
```

---

## Estimated Effort

| Phase | Action | Files | Time |
|-------|--------|-------|------|
| 1 | Archive junk files | ~40 | 15 min |
| 2 | Rename core JS + update imports | 3 + ~70 HTML | 45 min |
| 3A | Text/brand string replacements | ~50 | 30 min |
| 3B | Color replacements (CSS vars + hex) | ~84 | 1.5 hours |
| 4 | Verification + visual audit | all | 30 min |
| **Total** | | | **~3 hours** |

Phase 1 (archive) is risk-free and can start immediately.
Phase 2 (rename) is the riskiest — must be done carefully with verification.
Phase 3 (replace) is tedious but low-risk with automated script.
