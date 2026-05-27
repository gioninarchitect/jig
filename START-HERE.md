# Origin by ILCO Farming — Start Here

> Origin — Premium Quality Cannabis: a multi-system platform for cannabis retail, wholesale, and operations.

---

## What Is This Repo?

One repo, four active systems:

```
origin/
├── tnt-za/              ← Main Track & Trace / EU GMP QMS system
│   ├── backend/         ← Prisma, role workflows, QMS, labels, batches, audit
│   ├── frontend/        ← React role dashboards and UAT/training views
│   └── training/        ← Branded training/UAT HTML pages
│
├── JIGPOS/newbrand/     ← Origin Retail / Section 21 Retail module (legacy folder name)
│   ├── backend/         ← Express API, controllers, models, seeds
│   ├── frontend/        ← Vanilla JS modules (or-auth, or-core, etc.)
│   ├── react-app/       ← React SPA (admin, POS, owner, storefront)
│   ├── css/             ← Brand CSS (or-brand.css)
│   ├── images/          ← Logos, favicons, store photos
│   ├── scripts/         ← Branch setup, staff creation
│   ├── sw*.js           ← 4 service workers (PWAs)
│   ├── manifest*.json   ← 5 PWA manifests
│   └── *.html           ← 76 HTML pages (landing, POS, admin, etc.)
│
├── src/                 ← B2B Wholesale Portal (Express/TS + Vite React SPA)
│   ├── server/          ← Express API + Telegram bot
│   │   ├── chat/        ← Telegram bot (chatEngine.ts = 71KB)
│   │   └── routes/      ← API endpoints
│   ├── frontend/        ← React 19 + Tailwind SPA
│   └── world-model/     ← AI intelligence layer
│
├── database/            ← PostgreSQL schema + seeds + migrations
├── deploy/              ← Deploy scripts, nginx config
├── ds/                  ← Design system, invoices, quotes, specs
│   ├── invoice-ILCO-0001.html
│   ├── origin-quote-OR-00002.html/.pdf
│   ├── cultivation-client-spec.html/.pdf
│   └── marketing-implementation-strategy.html/.pdf
├── ecosystem.config.js  ← PM2 config (both processes)
└── .env.example         ← Environment template
```

---

## The Active Systems

| System | What It Does | Stack | Database | Port |
|--------|-------------|-------|----------|------|
| **TNT-ZA Track & Trace** | Main track-and-trace, EU GMP/QMS, labels, batches, SMF, role UAT/training | Express/TS + Prisma + React | PostgreSQL | App-specific |
| **Origin Retail / Section 21 Retail** | Retail, pharmacy pivot, Section 21, stocktake, inventory, dispatch, packing, owner dashboard, marketing site | Express 4 + MongoDB + Vanilla JS/HTML + React app, with Postgres pharmacy transaction core | MongoDB `origin` + PostgreSQL pharmacy core | 3004 (prod) / 3001 (local) |
| **B2B Wholesale Portal** | Business client ordering, product catalog, invoicing, admin panel | Express 5 + TypeScript + React 19 + Vite + Tailwind | PostgreSQL `origin` | 3002 |
| **Cultivation Dashboard** | SAHPRA 22C farm management — zones, batches, environment, harvest, compliance, reports | Part of POS backend + Vanilla JS | MongoDB (shared) | Same as POS |
| **Telegram Bot** | B2B ordering via chat, notifications, restock reminders | Part of B2B server (`src/server/chat/`) | Shares PostgreSQL | Same as B2B |

### How They Connect

```
TNT-ZA ──main regulated track-and-trace/QMS system
Origin Retail ──pharmacy pickup / Section 21 retail module in JIGPOS/newbrand
B2B Portal ──reads products──> POS API (via POS Bridge)
Telegram Bot ──places orders──> B2B Portal
Both ──send emails──> SMTP (mail.cleva-ai.co.za)
```

---

## Local Development

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- PostgreSQL 15+
- npm

### POS Multi-App

```bash
cd JIGPOS/newbrand
cp .env.example .env       # edit with local MongoDB URI, SMTP, etc.
npm install
npm run dev                 # starts on http://localhost:3001
```

Seed data:
```bash
node backend/scripts/seed-branches.js
node backend/scripts/setup-dev-users.js
node backend/scripts/reseed-products.js
node backend/scripts/seed-sunningdale-stock.js
```

### B2B Wholesale Portal

```bash
# From repo root
cp .env.example .env       # edit with local PostgreSQL URL, SMTP, etc.
npm install

# Set up PostgreSQL
psql -d origin -f database/schema.sql
npm run build:seed && npm run seed

# Run dev servers (two terminals)
npm run dev:server         # API on http://localhost:3002
npm run dev:frontend       # Vite on http://localhost:5173
```

### React App (POS)

```bash
cd JIGPOS/newbrand/react-app
npm install
npm run dev                # Vite dev server
npm run build              # Build to dist/ for production
```

---

## Login Credentials

### POS (PIN-based login)

All PINs: `123456`

| Email | Role | Use For |
|-------|------|---------|
| sunningdale.manager@cleva-ai.co.za | Branch Manager | **POS sales demos** (has branch assigned) |
| admin@cleva-ai.co.za | Admin | Admin panel, owner dashboard (can't make sales — no branch) |
| inventory@cleva-ai.co.za | Inventory Manager | Inventory dashboard, stocktake |
| florisolivier7@gmail.com | Owner | Owner dashboard |

### B2B Portal (OTP login)

Enter email → "Send Login Code" → use bypass code `830101` or real OTP from email.

| Email | Role |
|-------|------|
| admin@cleva-ai.co.za | Admin |
| florisolivier7@gmail.com | Admin + Client |
| b2b@cleva-ai.co.za | Client |

---

## Production

| Item | Value |
|------|-------|
| Server | 154.66.197.199 |
| Domain | puregro.cleva-ai.co.za |
| SSH | `ssh root@154.66.197.199` |
| POS URL | https://puregro.cleva-ai.co.za/pos/ |
| B2B URL | https://puregro.cleva-ai.co.za |
| Demo | https://puregro.cleva-ai.co.za/demo.html |
| PM2 processes | `origin-b2b` (port 3002), `origin-pos` (port 3004) |
| POS files | /var/www/origin/pos/ |
| B2B files | /var/www/origin/b2b/ |

### Deploy

```bash
# Full B2B update (build + upload + restart)
bash deploy/deploy-puregro.sh update

# Check logs
ssh root@154.66.197.199 "pm2 logs origin-pos --lines 30 --nostream"
ssh root@154.66.197.199 "pm2 logs origin-b2b --lines 30 --nostream"
```

See `NEXT_SESSION.md` for detailed deploy commands (POS hotfix, demo page, marketing site, SW cache bust).

### Pharmacy Pivot Production Queue

The Origin Retail / Section 21 pharmacy pickup pivot belongs to `JIGPOS/newbrand`, not `tnt-za`.

The production queue is documented in `docs/pharmacy-pivot/`.

Start with:

- `docs/pharmacy-pivot/PRODUCTION_READINESS.md` — production blockers and go-live definition
- `docs/pharmacy-pivot/DATABASE_SCHEMA.md` — required Postgres tables and immutability controls
- `docs/pharmacy-pivot/WORKFLOWS.md` — pharmacy onboarding, pickup, return, refund, and settlement workflows
- `docs/pharmacy-pivot/API_AND_CTA_QUEUE.md` — APIs and role CTAs that must persist to DB
- `docs/pharmacy-pivot/UAT_PLAN.md` — end-to-end UAT scenarios

Production focus: every CTA must write the database state, audit event, and any linked finance, stock, custody, ticket, or notification record. No pharmacy handling fee, refund, return, stock change, or collection event should exist only as UI state or a simple status update.

Naming note: `JIGPOS/newbrand` is the legacy folder name. The product/module name going forward is **Origin Retail**.

Do not mix this with TNT-ZA. TNT-ZA remains the main track-and-trace / EU GMP QMS system.

---

## Key Files Quick Reference

### POS — Most-Edited Files

| File | What |
|------|------|
| `JIGPOS/newbrand/frontend/config.js` | `Origin_CONFIG` — API URL, brand colors, VAT rate |
| `JIGPOS/newbrand/backend/server.js` | Express entry point |
| `JIGPOS/newbrand/backend/middleware/auth.js` | JWT auth + role middleware |
| `JIGPOS/newbrand/frontend/pos-checkout.js` | Checkout flow |
| `JIGPOS/newbrand/frontend/inv-inventory.js` | Inventory manager product editing |
| `JIGPOS/newbrand/css/or-brand.css` | Brand design tokens + global styles |
| `JIGPOS/newbrand/index.html` | Marketing homepage |
| `JIGPOS/newbrand/backend/services/emailService.js` | Email sending + templates |

### B2B — Most-Edited Files

| File | What |
|------|------|
| `src/server/index.ts` | Express entry point |
| `src/server/auth.ts` | OTP auth + JWT |
| `src/frontend/App.tsx` | React router + page structure |
| `src/frontend/api.ts` | API client |
| `src/server/chat/chatEngine.ts` | Telegram bot (71KB — biggest file) |
| `database/schema.sql` | PostgreSQL schema |
| `database/seed.ts` | Seed data |

---

## Design Tokens

```css
/* Origin by ILCO Farming — Gold-on-Black Luxury */
--or-black:        #0A0A0A;   /* deepest background */
--or-dark:         #141414;   /* card surface */
--or-dark-2:       #1C1C1C;   /* elevated surface */
--or-gold:         #C9A84C;   /* primary brand gold */
--or-gold-bright:  #D4B86A;   /* hover/active */
--or-gold-muted:   #8B6914;   /* dark gold variant */
--or-gold-light:   #E8D5A3;   /* champagne highlight */
--or-white:        #F5F0E8;   /* warm white (primary text) */
```

Fonts: Cinzel (display/headings), Inter (body), JetBrains Mono (data/code)

Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## Naming Conventions

| Pattern | Example | Where Used |
|---------|---------|------------|
| Full brand name | Origin by ILCO Farming | Email templates, legal pages, seeds |
| Short brand name | Origin | Page titles, headings, nav, footer |
| Lowercase slug | origin | DB name, domain, PM2, deploy paths |
| CSS prefix | or- | or-brand.css, or-auth.js, or-core.js, or-utils.js |
| Config object | Origin_CONFIG | frontend/config.js |
| CSS variable prefix | --or- | All CSS custom properties |
| Branch code prefix | OR- | OR-ONL, OR-POT, etc. |

---

## Branches

1 physical store + 1 online (initial rollout):

**Potchefstroom** (first physical collection point), Origin Online

---

## Important Rules

1. **"Collection point" NOT "dispensary"** — legal requirement in South Africa
2. **Email domain is @cleva-ai.co.za** — we don't own @origin.co.za yet
3. **POS sales demos use sunningdale.manager** — admin has no branch assigned
4. **Service workers cache aggressively** — bump SW version after every POS frontend deploy
5. **Demo page deploys to TWO locations** — both `/var/www/origin/demo.html` and `/var/www/origin/b2b/dist/frontend/demo.html`
6. **macOS tarballs** need `COPYFILE_DISABLE=1 --no-mac-metadata` to avoid `._*` junk files
7. **Never overwrite nginx.conf** on server — it has Certbot SSL config that can't be regenerated easily
8. **React app dist/ needs rebuild** after React source changes (`cd react-app && npm run build`)
9. Run `grep -ri "dispensary\|@dbc\|@jig\|debudchef\|puregro\|@pg" *.html frontend/*.js` before every deploy

---

## Other Docs

| Document | Location | What |
|----------|----------|------|
| Session handoff | `NEXT_SESSION.md` | Current state, deploy commands, known issues, credentials |
| Design system | `ds/origin-design-system.html` | Interactive brand design system reference |
| Rebrand playbook | `JIGPOS/newbrand/REBRAND-PLAYBOOK.md` | How to duplicate & rebrand for a new store |
| POS package | `JIGPOS/newbrand/package.json` | POS dependencies and scripts |
| B2B package | `package.json` | B2B dependencies and scripts |
| Env template | `.env.example` | All environment variables with descriptions |
