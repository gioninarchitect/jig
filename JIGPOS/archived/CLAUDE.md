# CLAUDE.md — De Bud Chef (DBC)

## CRITICAL: Working Directory

**ALL code lives in `/Users/florisolivier/DBC/newbrand/`**. The root `/Users/florisolivier/DBC/` folder contains OLD legacy files that are NOT the source of truth. NEVER read, edit, or reference files in the root folder — always work in `newbrand/`.

```
/Users/florisolivier/DBC/           ← OLD, IGNORE
/Users/florisolivier/DBC/newbrand/  ← THIS IS THE APP
```

## Brand Identity

- **Name**: De Bud Chef
- **Domain**: www.debudchef.co.za
- **App**: app.debudchef.co.za
- **Email**: hello@debudchef.co.za
- **SMTP From**: otp@debudchef.co.za
- **Address**: 18 Crownwood Street, Ormonde, Gauteng, South Africa
- **No VAT number, no phone number yet**
- **NO tagline** — do NOT make one up

### Brand Colors
```css
--green: #3A5F48;         /* Primary */
--green-dark: #2A4635;    /* Dark accent */
--cream: #F4F0E6;         /* Background */
--gold: #D4AF37;          /* Accent / highlights */
--red: #A63429;           /* Danger / errors */
```

### Typography
- **Headings**: Playfair Display (700, 900)
- **Body**: Inter (300-900)

## Commands (run from `newbrand/`)

```bash
npm run dev          # Dev server with nodemon (port 3002)
npm start            # Production server
npm test             # Jest tests (--runInBand)
npm run lint         # ESLint on backend/
```

## Architecture

### Tech Stack
Node.js + Express, MongoDB (dbc) with Mongoose, JWT auth with OTP/PIN login, PDFKit invoices, Socket.IO websockets

### Project Structure (newbrand/)
```
newbrand/
├── backend/
│   ├── server.js              ← Main entry (port 3002 local, 3003 prod)
│   ├── routes/
│   │   └── index.js           ← Aggregator mounting 34 route files
│   ├── controllers/           ← All business logic
│   ├── middleware/             ← Auth, validation, upload
│   ├── modules/
│   │   └── database/models/   ← Mongoose models
│   ├── services/              ← emailService, invoiceGenerator, etc.
│   └── config.js              ← Environment config
├── frontend/
│   ├── config.js              ← API_URL (environment-aware)
│   ├── dbc-utils.js           ← showToast, shared utilities
│   ├── dbc-auth.js            ← getToken(), shared auth
│   ├── pos-*.js               ← POS modules (auth, products, cart, checkout, shifts)
│   ├── st-*.js                ← Stocktake app modules (auth, sessions, counting, camera, items, receiving)
│   ├── inv-*.js               ← Inventory dashboard modules (auth, core, inventory, mdc, batches, stocktake, etc.)
│   └── offline-manager.js     ← PWA offline support
├── *.html                     ← Frontend pages (pos.html, stocktake-app.html, inventory-manager-dashboard.html, etc.)
├── css/                       ← Stylesheets
├── images/                    ← Product & brand images
└── package.json
```

## Key Systems

### POS (pos.html)
- Branch-filtered stock via BranchInventory overlay
- `getSelectedBranchId()` from pos-auth.js
- Owner/admin get branch picker; staff auto-assigned from primaryBranch
- No inventory management in POS — stock managed via Stocktake App only

### Stocktake App (stocktake-app.html)
- PWA with offline support
- PIN login (permanentPin field on User model)
- Stock Take + Receive Stock tabs
- Scale photo OCR + unit counting via Claude Vision
- Submission → pending_review → approve/reject workflow

### Inventory Manager Dashboard (inventory-manager-dashboard.html)
- Sections: Inventory, Batches, Purchase Orders, Suppliers, Stock Levels, Auto Reorder, MDC Control, Stocktake Reviews
- inv-stocktake.js handles stocktake review/approval UI

### Authentication
- OTP login: POST /api/v1/auth/otp/verify (field: `otpCode`)
- PIN login: POST /api/v1/auth/otp/verify-pin (fields: `email` + `pin`)
- Dev bypass OTP: `123456`
- Production uses real PINs (permanentPin on User model)
- `getToken()` from dbc-auth.js returns stored JWT

### User Roles (CORRECT enum values)
`user`, `super_admin`, `owner`, `admin`, `inventory_manager`, `packer`, `dispatch_manager`, `branch_manager`, `branch_assistant`, `supplier`

**NO** `staff_manager` or `staff_assistant` — those are INVALID.

## 8 Branches

| Code | Name | Manager | Assistant |
|------|------|---------|-----------|
| DBC-ORM | Ormonde | ormonde.manager@debudchef.co.za | ormonde.assistant@debudchef.co.za |
| DBC-FBG | Ficksburg | ficksburg.manager@debudchef.co.za | ficksburg.assistant@debudchef.co.za |
| DBC-KDP | Klerksdorp | klerksdorp.manager@debudchef.co.za | klerksdorp.assistant@debudchef.co.za |
| DBC-MYF | Mayfair | mayfair.manager@debudchef.co.za | mayfair.assistant@debudchef.co.za |
| DBC-LDB | Ladybrand | ladybrand.manager@debudchef.co.za | ladybrand.assistant@debudchef.co.za |
| DBC-RSB | Rustenburg | rustenburg.manager@debudchef.co.za | rustenburg.assistant@debudchef.co.za |
| DBC-SPV | Spruitview | spruitview.manager@debudchef.co.za | spruitview.assistant@debudchef.co.za |
| DBC-WBM | Wonderboom | wonderboom.manager@debudchef.co.za | wonderboom.assistant@debudchef.co.za |

## Deployment

### Ports
- **Local dev**: 3002
- **Production**: 3003

### Server
- **Host**: app.debudchef.co.za (154.66.197.199)
- **Path**: /var/www/dbc
- **PM2**: dbc

### CRITICAL DEPLOYMENT RULES
1. **NEVER overwrite production backend routes** — production uses OLD inline handlers, local uses controllers. Deploying local routes crashes the server.
2. **Frontend files ARE safe to deploy** (*.html, frontend/*.js)
3. **Backend changes**: Use `sed` on server's own files, or carefully merge
4. Always `node -c <file>` syntax check before deploying JS
5. Always backup before extracting on server
6. Use macOS-clean tarballs: `COPYFILE_DISABLE=1 tar --no-mac-metadata --exclude='._*' --exclude='.DS_Store' --exclude='.env' --exclude='.env.*' --exclude='node_modules' --exclude='.git'`
7. Never deploy .env files
8. Set `chown -R www-data:www-data` after deploy

### Environment-Aware API URL Pattern (frontend)
```javascript
// Already in frontend/config.js — use API_URL or DBC_CONFIG.API_URL
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3002/api/v1'
    : `${window.location.protocol}//${window.location.host}/api/v1`;
```

## Rules
- NO browser `alert()`, `prompt()`, or `confirm()` — use branded modals/toasts
- NO emojis in code/UI unless explicitly requested
- Product inventory: `product.inventory.quantity` (NOT `product.quantity`)
- Staff terminology: "Assistant" (NOT "Cashier")
- Flower quantities = grams, everything else = units
- Stock is CLOSING STOCK from January 2026 POS stock take
- No assumptions. Verify everything.
