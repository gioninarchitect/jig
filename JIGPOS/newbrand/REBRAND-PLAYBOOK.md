# Rebrand Playbook - PureGro to New Brand

**Created:** 2026-02-20 (DBC → JIG era)
**Rewritten:** 2026-03-01 (PureGro is now the starting point)
**Based on:** Two full rebrands (DBC → JIG → PureGro)
**Purpose:** Step-by-step guide to duplicate the PureGro instance and rebrand it for a new store

---

## How to Use This Document

You have a working PureGro system (POS + B2B Portal + Telegram Bot). You want to spin up an identical system for a different brand. This playbook covers:

1. Copying the entire codebase to a new location
2. Running an automated find-and-replace for brand tokens
3. Manually updating config, branches, assets, and content
4. Deploying to a new server/domain
5. Verifying zero PureGro references survive

---

## PureGro Brand Identity Reference (Your Starting Point)

Everything below is what you're replacing. Map each item to the new brand before writing any code.

### Colors (CSS Custom Properties)

```css
--pg-black:        #0E0E0E;   /* darkest background */
--pg-dark:         #1A1A1A;   /* card/surface background */
--pg-dark-2:       #222222;   /* elevated surface */
--pg-green:        #3FC041;   /* primary brand color */
--pg-green-bright: #56D458;   /* hover/active state */
--pg-green-muted:  #2A8C2C;   /* dark green variant */
--pg-white:        #FAFAFA;   /* primary text */
```

Email templates also use `#2D5016` (dark green) for headers/accents.

### Fonts

- **Display/Headings:** Barlow Condensed (weight 600–700)
- **Body:** Barlow (weight 400–500)
- Google Fonts import: `family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500`

### Naming Conventions

| Pattern | Example | Where Used |
|---------|---------|------------|
| Full brand name | PureGro Premium Cannabis Care | Email templates, legal pages, seeds |
| Short brand name | PureGro | Page titles, headings, nav, footer |
| Lowercase slug | puregro | DB name, domain, PM2, deploy paths |
| CSS prefix | pg- | pg-brand.css, pg-auth.js, pg-core.js, pg-utils.js |
| Config object | PureGro_CONFIG | frontend/config.js |
| CSS variable prefix | --pg- | All CSS custom properties |
| Branch code prefix | PG- | PG-ONL, PG-CLA, PG-MOW, etc. |
| Telegram bot | @PureGroB2B | Bot username (set via BotFather) |

### Infrastructure

| Item | Value |
|------|-------|
| Domain | puregro.cleva-ai.co.za |
| Email domain | @cleva-ai.co.za |
| Server IP | 154.66.197.199 |
| POS port | 3004 |
| B2B port | 3002 |
| MongoDB DB | puregro |
| PostgreSQL DB | puregro (B2B) |
| PM2 process (POS) | puregro-pos |
| PM2 process (B2B) | puregro-b2b |
| Deploy path (POS) | /var/www/puregro/pos |
| Deploy path (B2B) | /var/www/puregro/b2b |
| Log path | /var/log/pm2/puregro-*.log |

### Branches (10 total)

| Code | Name | Type |
|------|------|------|
| PG-ONL | PureGro Online | online |
| PG-CLA | Claremont | physical |
| PG-MOW | Mowbray | physical |
| PG-PAA | Paarden Eiland | physical |
| PG-PAR | Parklands | physical |
| PG-SUN | Sunningdale | physical |
| PG-GOR | Gordons Bay | physical |
| PG-GAN | Gansbaai | physical |
| PG-GEO | George | physical |
| PG-STA | Stanford | physical |

---

## Pre-Rebrand Preparation Checklist

Fill this out completely before touching any code.

```
NEW BRAND IDENTITY
==================
Brand name (full):     ___________________________
Brand name (short):    ___________________________
Tagline:               ___________________________
Lowercase slug:        ___________________________
CSS prefix:            ___________________________  (e.g. "xx-")
Config object name:    ___________________________  (e.g. "NewBrand_CONFIG")
Branch code prefix:    ___________________________  (e.g. "XX-")

COLORS
======
Primary:           #______  (replaces --pg-green: #3FC041)
Primary bright:    #______  (replaces --pg-green-bright: #56D458)
Primary muted:     #______  (replaces --pg-green-muted: #2A8C2C)
Darkest BG:        #______  (replaces --pg-black: #0E0E0E)
Card/Surface BG:   #______  (replaces --pg-dark: #1A1A1A)
Elevated surface:  #______  (replaces --pg-dark-2: #222222)
Primary text:      #______  (replaces --pg-white: #FAFAFA)
Email accent:      #______  (replaces #2D5016)

FONTS
=====
Display/Heading:   ___________________________  (replaces Barlow Condensed)
Body:              ___________________________  (replaces Barlow)
Google Fonts URL:  ___________________________

INFRASTRUCTURE
==============
Domain:            ___________________________
Email domain:      ___________________________
Server IP:         ___________________________
POS port:          ___________________________  (default 3004)
B2B port:          ___________________________  (default 3002)
MongoDB DB name:   ___________________________
PostgreSQL DB:     ___________________________
PM2 name (POS):    ___________________________
PM2 name (B2B):    ___________________________
Deploy path (POS): ___________________________
Deploy path (B2B): ___________________________

BRANCHES
========
(List all branches with: code, name, address, city, province, phone, email, hours)
1. ___________________________
2. ___________________________
...

ASSETS NEEDED
=============
[ ] Main logo (transparent PNG, ~400px wide)
[ ] Favicon (favicon.ico + favicon.png, 32x32 or 64x64)
[ ] PWA icon 192x192 (icon-192.png)
[ ] PWA icon 512x512 (icon-512.png)
[ ] Store photos (for branch pages)
[ ] Email header logo (will be base64-encoded)

LEGAL
=====
Company name:      ___________________________
Registration no:   ___________________________
VAT number:        ___________________________
Physical address:  ___________________________
```

---

## Step 1: Copy the Codebase

```bash
# Clone or copy the entire repo (NOT just JIGPOS/newbrand/)
# All three systems live in the same repo:
#   JIGPOS/newbrand/  — POS multi-app ecosystem
#   src/              — B2B wholesale portal + Telegram bot
#   database/         — PostgreSQL schema + seeds
#   deploy/           — Deployment scripts + nginx config

cp -r /path/to/puregro-repo /path/to/newbrand-repo
cd /path/to/newbrand-repo

# Start fresh git history
rm -rf .git
git init
git add -A
git commit -m "Initial commit: forked from PureGro"

# Clean up PureGro-specific archived files
rm -rf JIGPOS/newbrand/archived/

# Create new .env files from examples
cp .env.example .env
# Edit .env with new brand's database URLs, secrets, SMTP, etc.
```

### New Server Setup (if using a separate server)

```bash
# On the new server:
mkdir -p /var/www/newbrand/pos
mkdir -p /var/www/newbrand/b2b
mkdir -p /var/log/pm2

# MongoDB
mongosh --eval "use newbrand_db"

# PostgreSQL
sudo -u postgres createdb newbrand_db
sudo -u postgres psql -d newbrand_db -f database/schema.sql

# Node.js + PM2
npm install -g pm2
```

---

## Step 2: Automated Rebrand Script

Run this from the **repo root** to cover all three systems in one pass.

**Before running:** Fill in every `NEW_*` placeholder with your actual values from the preparation checklist.

```javascript
// rebrand.js — Run from repo root: node rebrand.js
const fs = require('fs');
const path = require('path');

// ============================================================
//  CONFIGURATION — Fill in ALL values before running
// ============================================================
const CONFIG = {
    // === TEXT REPLACEMENTS (longest first to prevent partial matches) ===
    text: [
        // Full brand name
        { find: 'PureGro Premium Cannabis Care', replace: 'NEW_FULL_BRAND_NAME' },
        // Domain/slug forms
        { find: 'puregro.cleva-ai.co.za', replace: 'NEW_DOMAIN' },
        { find: 'puregro-logo-nobg', replace: 'NEW_LOGO_FILENAME' },
        { find: 'puregro', replace: 'NEW_SLUG' },
        // Short brand name (case-sensitive passes)
        { find: 'PureGro', replace: 'NEW_SHORT_NAME' },
        // Config object
        { find: 'PureGro_CONFIG', replace: 'NewBrand_CONFIG' },
        // CSS prefix in filenames and references
        { find: 'pg-brand', replace: 'xx-brand' },
        { find: 'pg-auth', replace: 'xx-auth' },
        { find: 'pg-core', replace: 'xx-core' },
        { find: 'pg-utils', replace: 'xx-utils' },
        { find: 'pg-logo-nobg', replace: 'xx-logo-nobg' },
        // Branch code prefix
        { find: 'PG-ONL', replace: 'XX-ONL' },
        { find: 'PG-CLA', replace: 'XX-CLA' },
        { find: 'PG-MOW', replace: 'XX-MOW' },
        { find: 'PG-PAA', replace: 'XX-PAA' },
        { find: 'PG-PAR', replace: 'XX-PAR' },
        { find: 'PG-SUN', replace: 'XX-SUN' },
        { find: 'PG-GOR', replace: 'XX-GOR' },
        { find: 'PG-GAN', replace: 'XX-GAN' },
        { find: 'PG-GEO', replace: 'XX-GEO' },
        { find: 'PG-STA', replace: 'XX-STA' },
        // Telegram bot
        { find: '@PureGroB2B', replace: '@NewBrandB2B' },
    ],

    // === CSS VARIABLE REPLACEMENTS ===
    cssVars: [
        { find: 'var(--pg-green-bright)', replace: 'var(--xx-primary-bright)' },
        { find: 'var(--pg-green-muted)', replace: 'var(--xx-primary-muted)' },
        { find: 'var(--pg-green)', replace: 'var(--xx-primary)' },
        { find: 'var(--pg-black)', replace: 'var(--xx-black)' },
        { find: 'var(--pg-dark-2)', replace: 'var(--xx-dark-2)' },
        { find: 'var(--pg-dark)', replace: 'var(--xx-dark)' },
        { find: 'var(--pg-white)', replace: 'var(--xx-white)' },
        // Variable definitions (in :root blocks)
        { find: '--pg-green-bright', replace: '--xx-primary-bright' },
        { find: '--pg-green-muted', replace: '--xx-primary-muted' },
        { find: '--pg-green', replace: '--xx-primary' },
        { find: '--pg-black', replace: '--xx-black' },
        { find: '--pg-dark-2', replace: '--xx-dark-2' },
        { find: '--pg-dark', replace: '--xx-dark' },
        { find: '--pg-white', replace: '--xx-white' },
    ],

    // === HARDCODED HEX REPLACEMENTS ===
    hex: [
        { find: '#3FC041', replace: '#NEW_PRIMARY' },
        { find: '#3fc041', replace: '#NEW_PRIMARY' },
        { find: '#56D458', replace: '#NEW_PRIMARY_BRIGHT' },
        { find: '#56d458', replace: '#NEW_PRIMARY_BRIGHT' },
        { find: '#2A8C2C', replace: '#NEW_PRIMARY_MUTED' },
        { find: '#2a8c2c', replace: '#NEW_PRIMARY_MUTED' },
        { find: '#2D5016', replace: '#NEW_EMAIL_ACCENT' },
        { find: '#2d5016', replace: '#NEW_EMAIL_ACCENT' },
        { find: '#0E0E0E', replace: '#NEW_BG_DARKEST' },
        { find: '#0e0e0e', replace: '#NEW_BG_DARKEST' },
        { find: '#1A1A1A', replace: '#NEW_BG_CARD' },
        { find: '#1a1a1a', replace: '#NEW_BG_CARD' },
        { find: '#222222', replace: '#NEW_BG_ELEVATED' },
        // SVG data URI encoded variants
        { find: '%233FC041', replace: '%23NEW_PRIMARY' },
        { find: '%2356D458', replace: '%23NEW_PRIMARY_BRIGHT' },
        { find: '%232A8C2C', replace: '%23NEW_PRIMARY_MUTED' },
        // rgba variants (check your codebase for these)
        { find: 'rgba(63,192,65', replace: 'rgba(NEW_R,NEW_G,NEW_B' },
        { find: 'rgba(63, 192, 65', replace: 'rgba(NEW_R, NEW_G, NEW_B' },
    ],

    // === FONT REPLACEMENTS ===
    fonts: [
        { find: "'Barlow Condensed'", replace: "'NEW_DISPLAY_FONT'" },
        { find: '"Barlow Condensed"', replace: '"NEW_DISPLAY_FONT"' },
        { find: 'Barlow+Condensed', replace: 'NEW+DISPLAY+FONT' },
        { find: "'Barlow'", replace: "'NEW_BODY_FONT'" },
        { find: '"Barlow"', replace: '"NEW_BODY_FONT"' },
        { find: 'family=Barlow', replace: 'family=NEW_BODY_FONT' },
    ],

    // === FILE PATTERNS (covers ALL three systems from repo root) ===
    extensions: ['.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.json', '.sql', '.sh', '.conf', '.md'],
    searchDirs: [
        'JIGPOS/newbrand',
        'src',
        'database',
        'deploy',
    ],
    rootFiles: [
        'ecosystem.config.js',
        'package.json',
        'vite.config.ts',
        'index.html',
    ],
    exclude: ['node_modules', 'dist', 'archived', '.git', 'REBRAND-PLAYBOOK.md'],
};

// ============================================================
//  SCRIPT — Do not edit below this line
// ============================================================
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAllFiles(dir, exts, excludeDirs) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (excludeDirs.includes(entry.name)) continue;
            results.push(...getAllFiles(fullPath, exts, excludeDirs));
        } else if (exts.includes(path.extname(entry.name))) {
            results.push(fullPath);
        }
    }
    return results;
}

function runReplacements(content, replacements) {
    let count = 0;
    for (const { find, replace } of replacements) {
        const regex = new RegExp(escapeRegex(find), 'g');
        const matches = content.match(regex);
        if (matches) {
            content = content.replace(regex, replace);
            count += matches.length;
        }
    }
    return { content, count };
}

function rebrand() {
    // Collect all files
    let files = [];
    for (const dir of CONFIG.searchDirs) {
        files.push(...getAllFiles(dir, CONFIG.extensions, CONFIG.exclude));
    }
    for (const f of CONFIG.rootFiles) {
        if (fs.existsSync(f)) files.push(f);
    }

    let totalReplacements = 0;
    let filesModified = 0;

    for (const file of files) {
        let content = fs.readFileSync(file, 'utf8');
        const original = content;
        let fileCount = 0;

        // Apply all replacement categories in order
        for (const category of [CONFIG.text, CONFIG.cssVars, CONFIG.hex, CONFIG.fonts]) {
            const result = runReplacements(content, category);
            content = result.content;
            fileCount += result.count;
        }

        if (content !== original) {
            fs.writeFileSync(file, content, 'utf8');
            filesModified++;
            totalReplacements += fileCount;
            console.log(`  ${file}: ${fileCount} replacements`);
        }
    }

    console.log(`\n✓ Done: ${totalReplacements} replacements across ${filesModified} files`);
    console.log('\nNext: Rename files (Step 2b), then follow Steps 3–11 manually.');
}

rebrand();
```

### Step 2b: Rename Files

After running the text replacements, rename these files:

```bash
cd JIGPOS/newbrand

# CSS
mv css/pg-brand.css css/xx-brand.css

# Frontend JS modules
mv frontend/pg-auth.js frontend/xx-auth.js
mv frontend/pg-core.js frontend/xx-core.js
mv frontend/pg-utils.js frontend/xx-utils.js

# Logo files
mv images/pg-logo-nobg.png images/xx-logo-nobg.png
mv images/puregro-logo-nobg.png images/xx-logo-main.png
mv images/puregro-site/ images/newbrand-site/

# React app logo
mv react-app/public/images/pg-logo-nobg.png react-app/public/images/xx-logo-nobg.png

cd ../..

# Deploy script
mv deploy/deploy-puregro.sh deploy/deploy-newbrand.sh
```

The automated script already updated all `<script src="">` and `<link href="">` references to these filenames, so the renames will match.

---

## Step 3: Config Files (Manual Review)

These files have structured config that needs careful manual editing beyond find-and-replace.

### POS Config — `JIGPOS/newbrand/config.js`

- `dbName` — new MongoDB database name
- `jwtSecret` — generate a new secret
- `smtp` — new email server credentials (or keep cleva-ai.co.za SMTP)
- `emailFrom` / `emailName` — new sender identity

### POS Frontend Config — `JIGPOS/newbrand/frontend/config.js`

- Config object name (was `PureGro_CONFIG`, now `NewBrand_CONFIG`)
- `BRAND.colors` — update all hex values to new palette
- `BRAND.name` — new brand name
- Verify `API_URL` still resolves correctly for new domain

### POS Ecosystem — `JIGPOS/newbrand/ecosystem.config.js`

- `name` — new PM2 process name
- `PORT` — new port if different from 3004
- `cwd` — new server path

### POS Package — `JIGPOS/newbrand/package.json`

- `name`, `description`, `author`, `keywords`

### POS Backend Config — `JIGPOS/newbrand/backend/config/index.js`

- Default MongoDB URI: `mongodb://localhost:27017/newbrand`
- Redis prefix (if using Redis)
- Session secret
- Email domain in validation

### Root Ecosystem — `ecosystem.config.js`

- Both PM2 process entries: `name`, `cwd`, `PORT`, log file paths
- Currently: `puregro-b2b` (port 3002), `puregro-pos` (port 3004)

### Root .env

- All `PUREGRO_` prefixed environment variables
- `DATABASE_URL` — new PostgreSQL connection string
- `MONGODB_URI` — new MongoDB connection string
- `CORS_ORIGIN` — new domain
- `TELEGRAM_BOT_TOKEN` — new bot token (from BotFather)

### Root Package — `package.json`

- `name`, `description`

---

## Step 4: PWA Manifests & Service Workers

### 5 Manifest Files

All in `JIGPOS/newbrand/`:

| File | `name` field | `short_name` |
|------|-------------|--------------|
| `manifest.json` | PureGro Premium Cannabis Care POS | PureGro POS |
| `manifest-pos.json` | PureGro POS | PureGro POS |
| `manifest-dispatch.json` | PureGro Dispatch | PG Dispatch |
| `manifest-packer.json` | PureGro Packer | PG Packer |
| `manifest-stocktake.json` | PureGro Stocktake | PG Stocktake |

Update `name`, `short_name`, `description`, `theme_color`, `background_color`, and icon paths in each.

### 4 Service Workers

| File | Cache name |
|------|-----------|
| `sw.js` | `puregro-pos-v1` (also `puregro-offline-queue`) |
| `sw-dispatch.js` | `puregro-dispatch-v1` |
| `sw-packer.js` | `puregro-packer-v1` |
| `sw-stocktake.js` | `puregro-stocktake-v1` |

The automated script handles these cache name strings, but **bump the version** (e.g., `v1` → `v2`) to force cache invalidation on existing installs.

---

## Step 5: Assets

Replace these image files with the new brand's assets:

### Logos

| File | Purpose | Size |
|------|---------|------|
| `JIGPOS/newbrand/images/puregro-logo-nobg.png` | Main logo (email, print) | ~400px wide |
| `JIGPOS/newbrand/images/pg-logo-nobg.png` | Alt logo reference | ~400px wide |
| `JIGPOS/newbrand/react-app/public/images/pg-logo-nobg.png` | React app logo | ~400px wide |
| `public/logo.png` | B2B portal logo | ~400px wide |

### Favicons & PWA Icons

| File | Size |
|------|------|
| `JIGPOS/newbrand/images/favicon.ico` | 32x32 |
| `JIGPOS/newbrand/images/favicon.png` | 32x32 or 64x64 |
| `JIGPOS/newbrand/images/icon-192.png` | 192x192 |
| `JIGPOS/newbrand/images/icon-512.png` | 512x512 |
| `public/favicon.svg` | B2B favicon |

### Store Photos

- `JIGPOS/newbrand/images/puregro-site/` — replace with new store photos for branch pages

### Email Logo (Base64 Embedded)

- `JIGPOS/newbrand/backend/services/emailService.js` line ~29 — contains a base64-encoded logo image
- Convert the new logo to base64: `base64 -i newlogo.png | tr -d '\n'`
- Replace the entire base64 string in `emailService.js`

---

## Step 6: Branch Configuration

PureGro has 10 branches (1 online + 9 physical). Replace with the new brand's locations.

### Files to Update

1. **`JIGPOS/newbrand/backend/scripts/seed-branches.js`** — Primary seed script. Replace all 10 branch objects with new brand's locations (name, code, address, phone, email, hours, coordinates).

2. **`JIGPOS/newbrand/scripts/seed-branches.js`** — Secondary seed script. Keep in sync with the above or consolidate to one.

3. **`JIGPOS/newbrand/backend/scripts/setup-dev-users.js`** — Creates test users per branch. Update email patterns (`branchname.manager@domain`, `branchname.assistant@domain`).

4. **`JIGPOS/newbrand/scripts/create-branch-staff.js`** — Creates staff accounts. Update email domain.

5. **`JIGPOS/newbrand/index.html`** — Location cards section. Update or remove branch cards to match new brand's locations.

6. **Individual branch HTML pages** — `ormonde.html`, `ficksburg.html`, `klerksdorp.html`, `ladybrand.html`, `mayfair.html`, `rustenburg.html`, `spruitview.html`, `wonderboom.html`, etc. Either update content for new locations, repurpose filenames, or delete unused pages.

7. **`JIGPOS/newbrand/locations.html`** — Master locations page with all branch cards.

### If the New Brand Has Fewer Branches

Delete unused branch HTML pages and remove their `<a>` links from `index.html` and `locations.html`. The POS branch selector is API-driven (reads from MongoDB), so it adapts automatically after re-seeding.

---

## Step 7: Email & PDF Branding

These files contain brand name, colors, and logo in user-facing outputs. They need manual review after the automated script runs.

### Email Service — `JIGPOS/newbrand/backend/services/emailService.js`

- Line ~24: `from` email address
- Line ~25: `fromName` display name
- Line ~29: base64-encoded logo image
- SMTP host configuration (line ~12)

### Email Templates — `JIGPOS/newbrand/backend/modules/notification/email/templates.js`

11 template functions, each containing:
- Brand name in subject lines and body text
- Header color (`#2D5016` → new accent)
- Footer text with company name, address, legal info
- Template names: welcome, orderConfirmation, otpVerification, passwordReset, shippingNotification, paymentConfirmation, refundProcessed, accountDeactivated, stockAlert, dailyReport, customNotification

### Invoice Generator — `JIGPOS/newbrand/backend/services/invoiceGenerator.js`

- Company name in header
- Logo reference
- Accent colors for PDF styling
- Footer text with company details

### Purchase Order Generator — `JIGPOS/newbrand/backend/services/purchaseOrderGenerator.js`

- Same as invoice generator: header, logo, colors, footer

---

## Step 8: HTML Content Audit

The automated script handles code-level replacements, but **content** needs a manual pass. Open every page in a browser and check:

### Every Page

- `<title>` tag
- `<meta name="description">` and `<meta property="og:*">` tags
- Navigation bar: brand name, logo
- Footer: brand name, tagline, copyright year, contact info, social links

### Key Content Pages

| Page | What to Check |
|------|--------------|
| `index.html` | Hero heading, hero tagline, stats (e.g., "9 Collection Points"), location cards, about section |
| `about.html` | Company story, team info, mission statement |
| `contact.html` | Phone number, email, physical address, map embed |
| `products.html` | Product category descriptions |
| `privacy-policy.html` | Company legal name, registration, email, physical address |
| `terms-of-service.html` | Company legal name, governing law, contact email |
| `section21-info.html` | Legal references, contact info |
| `comingsoon.html` | Brand name, contact info |
| `login.html` | Welcome text |
| `register.html` | Signup CTA text |

### Cannabis-Specific Content

If the new brand is NOT cannabis, audit product descriptions, category names, legal disclaimers, Section 21 references, and age-gate modals.

---

## Step 9: B2B Portal & Telegram Bot

These are the other two systems in the repo. The automated script covers text/hex replacements, but review these manually.

### B2B Wholesale Portal (`src/`)

| Area | Key Files |
|------|-----------|
| Frontend pages | `src/frontend/pages/*.tsx` — titles, headings, footer, about text |
| Layout | `src/frontend/components/Layout.tsx` — nav brand name, logo |
| Auth | `src/frontend/auth.tsx` — login page text |
| API client | `src/frontend/api.ts` — base URL |
| CSS | `src/frontend/app.css` — brand colors, theme |
| World model | `src/world-model/` — type names, event strings, system prompt |
| Server routes | `src/server/routes/` — email text, response messages |
| Email | `src/server/email.ts` — OTP emails, notification text |
| Database | `database/schema.sql`, `database/seed.ts` — company names, product data |
| Vite config | `vite.config.ts` — app title in HTML plugin |
| Tailwind | Tailwind config — if brand tokens are defined there |

### Telegram Bot (`src/server/chat/`)

| File | Size | What to Check |
|------|------|--------------|
| `chatEngine.ts` | 71KB | Welcome messages, help text, menu descriptions, order confirmations, registration flow, error messages — **use automated script, do NOT manually search** |
| `notifications.ts` | | Order/shipping/payment notifications, invoice text, restock reminders |
| `webhookRoutes.ts` | | Callback data, response messages |
| `intentDetector.ts` | | System prompt for Claude (mentions brand name) |
| `telegramService.ts` | | Bot name references |
| `adminRoutes.ts` | | Admin notification text |
| `types.ts` | | Type names/comments |

**BotFather setup (manual):**
1. Create new bot with `/newbot` command
2. Set name, username, description, about text, profile picture
3. Copy the new `TELEGRAM_BOT_TOKEN` to `.env`

---

## Step 10: Deploy Setup

### Deploy Script

Copy and update `deploy/deploy-puregro.sh` → `deploy/deploy-newbrand.sh`:

- Remote server IP/hostname
- Remote paths (`/var/www/newbrand/pos`, `/var/www/newbrand/b2b`)
- PM2 process names
- Domain in nginx reload commands
- Tarball/rsync source paths
- SSH key path (if different server)

### Nginx — `deploy/nginx.conf`

- `server_name` — new domain
- SSL certificate paths (`/etc/letsencrypt/live/newdomain/`)
- `proxy_pass` ports (3004 for POS, 3002 for B2B, or your new ports)
- Static file paths
- CORS headers if any

### SSL Certificate

```bash
# On the new server:
sudo certbot certonly --nginx -d newdomain.example.com
```

### PM2 Setup

```bash
# Start processes
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Database Seeding

```bash
# POS (MongoDB)
cd /var/www/newbrand/pos
node backend/scripts/seed-branches.js
node backend/scripts/setup-dev-users.js
node backend/scripts/reseed-products.js

# B2B (PostgreSQL)
cd /var/www/newbrand/b2b
psql -d newbrand_db -f database/schema.sql
npx tsx database/seed.ts
```

---

## Step 11: Verification

### Grep Sweep — Must Return Zero Results

Run from repo root. Every line of output is a missed replacement.

```bash
# 1. PureGro brand name (all variations)
grep -rni "PureGro\|puregro\|Pure Gro\|PUREGRO" \
  --include="*.html" --include="*.js" --include="*.ts" \
  --include="*.tsx" --include="*.jsx" --include="*.css" \
  --include="*.json" --include="*.sql" --include="*.sh" \
  --include="*.conf" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
  --exclude="REBRAND-PLAYBOOK.md"

# 2. PureGro CSS prefix
grep -rni "\-\-pg-\|\"pg-\|'pg-\|/pg-" \
  --include="*.html" --include="*.css" --include="*.js" \
  --include="*.jsx" --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
  --exclude="REBRAND-PLAYBOOK.md"

# 3. PureGro hex colors
grep -rni "#3FC041\|#56D458\|#2A8C2C\|#2D5016\|#0E0E0E" \
  --include="*.html" --include="*.css" --include="*.js" \
  --include="*.ts" --include="*.jsx" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git

# 4. PureGro branch codes
grep -rni "PG-ONL\|PG-CLA\|PG-MOW\|PG-SUN\|PG-GOR\|PG-GAN\|PG-GEO\|PG-STA" \
  --include="*.html" --include="*.js" --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git

# 5. SVG data URIs with PureGro colors
grep -rni "%233FC041\|%2356D458\|%232A8C2C" \
  --include="*.html" --include="*.css" \
  --exclude-dir=node_modules --exclude-dir=dist

# 6. Barlow font references (if changing fonts)
grep -rni "Barlow" \
  --include="*.html" --include="*.css" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git

# 7. Telegram bot references
grep -rni "PureGro\|puregro" src/server/chat/ --include="*.ts"

# 8. B2B portal references
grep -rni "PureGro\|puregro" src/server/ src/frontend/ src/world-model/ \
  --include="*.ts" --include="*.tsx" --exclude-dir=node_modules

# 9. Database seed data
grep -rni "PureGro\|puregro" database/ --include="*.sql" --include="*.ts"

# 10. Deploy scripts
grep -rni "PureGro\|puregro" deploy/ --include="*.sh" --include="*.conf"
```

### Visual Audit

Open every page in a browser and visually confirm no PureGro branding remains:

**POS Apps:**
- [ ] Landing page (index.html)
- [ ] Login / Register / Reset password
- [ ] Customer dashboard
- [ ] POS terminal
- [ ] Stocktake app
- [ ] Inventory Manager dashboard
- [ ] Admin dashboard
- [ ] Owner dashboard
- [ ] Dispatch app
- [ ] Packer app
- [ ] All branch pages
- [ ] Cart → Checkout flow
- [ ] Age gate modal
- [ ] Training hub + training pages
- [ ] Products page + product detail
- [ ] About, Contact, Privacy, Terms pages

**B2B Portal:**
- [ ] Login page
- [ ] Dashboard
- [ ] Product catalog
- [ ] Order flow
- [ ] Account/profile page
- [ ] Admin panel

**Telegram Bot:**
- [ ] Send `/start` — check welcome message
- [ ] Browse categories
- [ ] Place a test order
- [ ] Check notification messages

### Functional Tests

- [ ] Send a test email (OTP, order confirmation) — check brand name, colors, logo
- [ ] Generate a test invoice PDF — check header, colors, company details
- [ ] Generate a test purchase order PDF — same checks
- [ ] Install POS as PWA — check app name, icon, splash screen
- [ ] Test service worker offline mode — ensure old cache doesn't serve stale content

### Service Worker Cache Flush

After deploying, **every existing user** must flush their service worker:

1. Open DevTools → Application → Service Workers → Unregister
2. Clear site data (Application → Storage → Clear site data)
3. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

Or bump SW cache version numbers (done in Step 4).

---

## Known Landmines

Hard-won lessons from DBC → JIG → PureGro. These are the things that survive automated rebrand scripts.

### 1. Inline CSS in HTML `<style>` Blocks (Biggest Blind Spot)

Many HTML pages have 500+ lines of inline `<style>` with hardcoded hex colors, rgba values, and CSS variables. The automated script catches these, but **verify with grep** because new inline styles get added over time.

```bash
# Find all HTML files with inline styles
grep -rn "<style>" --include="*.html" JIGPOS/newbrand/ | wc -l

# Check for hardcoded hex in inline styles
grep -rn "style=\"[^\"]*#3FC\|style=\"[^\"]*#56D\|style=\"[^\"]*#2A8" \
  --include="*.html" JIGPOS/newbrand/
```

### 2. SVG Data URIs

SVG backgrounds encoded as `data:image/svg+xml` contain URL-encoded hex colors like `%233FC041`. These are easy to miss in manual review.

### 3. Service Worker Caching

Old service workers cache old JS bundles. After rebrand + deploy, users see the OLD brand until they clear the SW cache. There is no way to force-clear remotely. Bump the cache version number in all 4 SW files.

### 4. React App `dist/` Needs Rebuild

The built bundles in `JIGPOS/newbrand/react-app/dist/` are compiled output. After changing any React source files, you MUST rebuild:

```bash
cd JIGPOS/newbrand/react-app
npm install
npm run build
```

The dist files will contain old brand text until rebuilt.

### 5. Legacy Email Domains Still in Codebase

These files still reference old brand email domains as of the PureGro era:

| File | Old Reference | What to Do |
|------|--------------|------------|
| `scripts/create-branch-staff.js` | `@jig.cleva-ai.co.za` | Replace with new domain |
| `scripts/setup-new-branch.js` | `@jig.cleva-ai.co.za` | Replace with new domain |
| `backend/scripts/create-demo-users.js` | `@basothomedicalherbs.ls` | Replace with new domain |
| `backend/scripts/seed-inventory-roles.js` | `jigowner`, `jigpacker`, `jigdispatch` usernames | Replace prefix |
| `seed-all-modules.js` | `basothomedicalherbs.ls` vendor URLs & emails | Replace with new domain |
| `seed-modules.js` | `basothomedicalherbs.ls` vendor URLs & emails | Replace with new domain |

### 6. Content vs Code Are Different Jobs

Automated scripts handle code-level token replacement. They CANNOT understand:
- "9 Collection Points" should become "3 Stores" for a 3-branch brand
- Hero taglines need rewriting for different brand voice
- Product descriptions may reference cannabis specifically
- Legal pages need real lawyer-reviewed text

Always do a manual content pass (Step 8) AFTER the automated script.

### 7. Two Seed Scripts for Branches

Two versions of `seed-branches.js` exist:
- `JIGPOS/newbrand/backend/scripts/seed-branches.js` — all 10 branches
- `JIGPOS/newbrand/scripts/seed-branches.js` — subset, often out of sync

Pick ONE as the source of truth. Ideally consolidate to one file.

### 8. Font Loading

If changing fonts, update ALL of these:
- Google Fonts `<link>` tags in every HTML file's `<head>`
- CSS `font-family` declarations in `pg-brand.css` (renamed to `xx-brand.css`)
- Inline `font-family` in `<style>` blocks (yes, some pages have inline font declarations)
- React app's `main.css`
- Email templates (emails can't load Google Fonts — use web-safe fallbacks)
- Invoice/PO generators (PDFs use system fonts)

---

## Quick Reference: PureGro Files by System

### System 1: POS (`JIGPOS/newbrand/`)

| Category | Key Files |
|----------|-----------|
| Brand CSS | `css/pg-brand.css` |
| Frontend modules | `frontend/pg-auth.js`, `pg-core.js`, `pg-utils.js` |
| Config | `config.js`, `frontend/config.js`, `ecosystem.config.js` |
| Service workers | `sw.js`, `sw-dispatch.js`, `sw-packer.js`, `sw-stocktake.js` |
| Manifests | `manifest.json`, `manifest-pos.json`, `manifest-dispatch.json`, `manifest-packer.json`, `manifest-stocktake.json` |
| Backend config | `backend/config/index.js` |
| Email | `backend/services/emailService.js`, `backend/modules/notification/email/templates.js` |
| PDFs | `backend/services/invoiceGenerator.js`, `backend/services/purchaseOrderGenerator.js` |
| Branch seeds | `backend/scripts/seed-branches.js`, `scripts/seed-branches.js` |
| User seeds | `backend/scripts/setup-dev-users.js`, `scripts/create-branch-staff.js` |
| React app | `react-app/src/` (rebuild `dist/` after changes) |

### System 2: B2B Portal (`src/`)

| Category | Key Files |
|----------|-----------|
| Server entry | `src/server/index.ts` |
| Frontend entry | `src/frontend/App.tsx`, `src/frontend/main.tsx` |
| Auth | `src/frontend/auth.tsx`, `src/server/auth.ts` |
| Email | `src/server/email.ts` |
| World model | `src/world-model/` (types, events, state, inference, patterns) |
| Database | `database/schema.sql`, `database/seed.ts` |
| CSS | `src/frontend/app.css` |
| Layout | `src/frontend/components/Layout.tsx` |

### System 3: Telegram Bot (`src/server/chat/`)

| File | Purpose |
|------|---------|
| `chatEngine.ts` | Main bot logic (71KB — largest file) |
| `notifications.ts` | Order/payment/shipping notifications |
| `webhookRoutes.ts` | Telegram webhook handler |
| `intentDetector.ts` | NLP intent classification |
| `telegramService.ts` | Telegram API wrapper |
| `chatDb.ts` | Chat database operations |
| `adminRoutes.ts` | Admin chat management |
| `types.ts` | TypeScript types |

### Deploy & Root

| File | Purpose |
|------|---------|
| `ecosystem.config.js` | PM2 config (both processes) |
| `deploy/deploy-puregro.sh` | Deployment script |
| `deploy/nginx.conf` | Nginx reverse proxy config |
| `package.json` | Root package |
| `vite.config.ts` | B2B Vite build config |
| `.env` | Environment variables |
