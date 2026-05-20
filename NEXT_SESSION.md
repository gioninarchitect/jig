# Origin by ILCO Farming — Session Handoff

## Session Date: 2026-03-13

## Status: CULTIVATION DASHBOARD 100% COMPLETE + QUOTE OR-00002 SUBMITTED + MARKETING SUITE INSTALLED

---

## What Was Done This Session (Mar 13)

### 1. Invoice ILCO-0001 — Branded HTML (DONE)
- Created `ds/invoice-ILCO-0001.html` — Origin-branded invoice for FloRouter AI → ILCO Farming
- 4 line items: Platform Setup R15K, Online Store R5K, Section 21 R8.5K, SaaS R999/mo = R29,499 total
- Updated `client-proposal.html` pricing to match: R15,000 setup + R999/mo

### 2. Quote OR-00002 — Cultivation + Marketing (SUBMITTED)
- Created `ds/origin-quote-OR-00002.html` + `.pdf`
- **Setup (one-time): R30,000** — Cultivation dev R15K + SAHPRA compliance R5K + Deployment/training R5K + Marketing setup R5K
- **Monthly: R2,498/mo** — Cultivation hosting R500 + AI Marketing R999 + Origin SaaS R999
- Fair pricing: R500/mo cultivation since client funded R30K dev (not the R4,500 tier)
- PDF generated with Chrome headless, print CSS fixed for readability

### 3. Client Spec — Cultivation Onsite Document (DONE)
- Created `ds/cultivation-client-spec.html` + `.pdf`
- 9 sections: Facility Profile, Batch Lifecycle, Environment, Harvest, SAHPRA Compliance, Users, Reports, Checklist, Timeline
- Items marked CONFIRMED (green) vs CLIENT INPUT NEEDED (amber) for on-site session

### 4. AI Marketing Suite — Installed (DONE)
- Installed `gioninarchitect/ai-marketing-claude` to `~/.claude/skills/` and `~/.claude/agents/`
- 14 sub-skills, 5 agents, 4 Python scripts, 6 templates
- Created `ds/marketing-implementation-strategy.html` + `.pdf` — 8-section implementation plan
- scrape.do integration documented (NOT Firecrawl)

### 5. Cultivation Dashboard — ALL 6 Optional Features Built (DONE)
Built all remaining features to bring dashboard to 100%:

#### 5a. IoT Sensor Webhook API
- `POST /api/v1/cultivation/sensor/webhook` — accepts sensor data (API key auth, not JWT)
- Supports single or batch readings, auto-threshold checking, compliance breach logging
- Accepts common sensor field names (temp/rh/carbon_dioxide/par/soil)
- Added `apiKey` field to CultivationZone sensor subdocument
- Files changed: `cultivation.controller.js`, `cultivation.js` (routes), `CultivationZone.js`

#### 5b. Real-time WebSocket Updates
- Added `cultivation-room` — auto-joined by farm_manager, cultivator, compliance_officer, owner, super_admin
- Added `notifyCultivation()` helper function
- Sensor webhook emits `cultivation:sensor_reading` + `cultivation:alert` events on breach
- Files changed: `websocket/index.js`

#### 5c. Nutrient Tracking UI
- Inline form in batch detail modal: product name, amount, notes
- `POST /api/v1/cultivation/batches/:id/nutrient-log` endpoint
- Displays reverse-chronological nutrient log entries
- Files changed: `cultivation.controller.js`, `cultivation.js`, `cult-batches.js`

#### 5d. Pest & Disease Management UI
- Inline form in batch detail modal: observation, action taken
- `POST /api/v1/cultivation/batches/:id/pest-log` endpoint
- Displays reverse-chronological pest log entries
- Files changed: `cultivation.controller.js`, `cultivation.js`, `cult-batches.js`

#### 5e. Scale Photo Upload + Lab Results
- File upload via FormData with multer (JPEG/PNG/WebP, 10MB max)
- Photo preview in harvest modal before submit
- Lab results fields: status (pending/passed/failed), THC%, CBD%
- Backend handles both JSON and multipart requests
- Files changed: `cultivation.controller.js`, `cultivation.js`, `cult-harvest.js`, `cultivation-dashboard.html`

#### 5f. PDF Report Generation
- SAHPRA-branded print-ready PDF export for all 4 report types (Production, Environmental, Yield, Waste)
- SAHPRA-branded PDF export for Audit Packages
- Opens new window with Origin brand tokens (Cinzel headings, gold accents, compliance badge)
- Auto-strips dark theme colors for clean white print
- Files changed: `cult-reports.js`, `cult-compliance.js`

---

## Cultivation Dashboard — File Map

### Frontend (JIGPOS/newbrand/)
| File | Lines | What It Does |
|------|-------|-------------|
| `cultivation-dashboard.html` | ~720 | Main page: 7 sections, all modals, OTP login |
| `frontend/cult-auth.js` | 286 | OTP + PIN authentication |
| `frontend/cult-core.js` | 218 | Navigation, routing, utilities |
| `frontend/cult-overview.js` | 90 | KPI strip, zone cards |
| `frontend/cult-zones.js` | 229 | Zone CRUD, detail view, gauges |
| `frontend/cult-batches.js` | ~370 | Kanban pipeline, phase transitions, nutrient/pest logs |
| `frontend/cult-environment.js` | 265 | Readings, charts, alerts |
| `frontend/cult-harvest.js` | ~260 | Harvest form with photo upload, yield charts |
| `frontend/cult-compliance.js` | ~290 | Score dashboard, audit packages, PDF export |
| `frontend/cult-reports.js` | ~280 | 4 report types, CSV/PDF export |
| `css/cult-dashboard.css` | 200+ | All cultivation styling |

### Backend (JIGPOS/newbrand/backend/)
| File | What It Does |
|------|-------------|
| `controllers/cultivation.controller.js` | ~1000 lines, all business logic |
| `routes/cultivation.js` | 22 endpoints, RBAC, multer upload |
| `modules/database/models/CultivationZone.js` | Zone schema with sensors + apiKey |
| `modules/database/models/CultivationBatch.js` | Batch lifecycle, nutrient/pest logs |
| `modules/database/models/EnvironmentReading.js` | Sensor data, VPD calc, alerts |
| `modules/database/models/HarvestRecord.js` | Weights, lab results, scale photo |
| `modules/database/models/ComplianceLog.js` | Audit trail, documents, severity |
| `scripts/seed-cultivation.js` | Demo data seeder |

### API Endpoints (22 total)
```
GET    /api/v1/cultivation/overview
GET    /api/v1/cultivation/zones
POST   /api/v1/cultivation/zones
PUT    /api/v1/cultivation/zones/:id
GET    /api/v1/cultivation/zones/:id
GET    /api/v1/cultivation/batches
POST   /api/v1/cultivation/batches
PUT    /api/v1/cultivation/batches/:id
POST   /api/v1/cultivation/batches/:id/transition
POST   /api/v1/cultivation/batches/:id/nutrient-log    [NEW]
POST   /api/v1/cultivation/batches/:id/pest-log         [NEW]
GET    /api/v1/cultivation/environment
POST   /api/v1/cultivation/environment
GET    /api/v1/cultivation/environment/latest
GET    /api/v1/cultivation/harvests
POST   /api/v1/cultivation/harvests                      [UPDATED: multer upload]
GET    /api/v1/cultivation/compliance/score
GET    /api/v1/cultivation/compliance/logs
POST   /api/v1/cultivation/compliance/logs
POST   /api/v1/cultivation/compliance/audit-package
GET    /api/v1/cultivation/reports/:type
POST   /api/v1/cultivation/sensor/webhook                [NEW: IoT]
```

---

## STILL TO DO

### Origin Retail / Pharmacy Pivot — Production Queue
This belongs to `JIGPOS/newbrand`, the legacy folder for the Origin Retail / Section 21 retail-pharmacy module.

Do not confuse it with `tnt-za`. `tnt-za` is the main track-and-trace / EU GMP QMS system.

1. Use `docs/pharmacy-pivot/PRODUCTION_READINESS.md` as the source for production blockers.
2. Build the P0 data foundation from `docs/pharmacy-pivot/DATABASE_SCHEMA.md`.
3. Implement CTAs from `docs/pharmacy-pivot/API_AND_CTA_QUEUE.md` through backend services, not direct frontend-only state changes.
4. Validate pharmacy onboarding, package custody, inventory movement, pharmacy ledger, refunds payable, and settlement flows against `docs/pharmacy-pivot/UAT_PLAN.md`.
5. Keep immutability as the rule: payment events, inventory movements, package custody, pharmacy ledger, order status events, and audit events must be append-only.
6. Remaining work before stakeholder feedback: end-to-end UAT and deployment validation against the live/staging environment.

### Deployment
1. Deploy cultivation dashboard to origin.cleva-ai.co.za
2. Run seed script: `node backend/scripts/seed-cultivation.js`
3. Create cultivator/farm_manager demo accounts
4. Test all 7 sections with demo data

### Marketing Suite Activation
1. Wire scrape.do API key into marketing scripts
2. Run first marketing audit for ILCO: `/market-audit ilcofarming.co.za`
3. Generate first content calendar
4. Set up social media posting workflow

### Client On-Site Session
1. Walk through `cultivation-client-spec.html` with Ray
2. Collect facility profile (tunnel count, indoor rooms, dimensions)
3. Collect strain list, seed bank details
4. Configure zone thresholds based on actual facility specs
5. Create staff accounts (farm_manager, cultivator, compliance_officer)

---

## Architecture (Same as Before)

| System | Stack | Database | Prod URL |
|--------|-------|----------|----------|
| POS Multi-App | Express + MongoDB + Vanilla JS | MongoDB `origin` | origin.cleva-ai.co.za/pos/ |
| B2B Wholesale | Express/TS + React 19 + Vite | PostgreSQL `origin` | origin.cleva-ai.co.za/ |
| Cultivation Dashboard | Part of POS backend + Vanilla JS | MongoDB (same) | origin.cleva-ai.co.za/cultivation-dashboard.html |

---

## Server Details

| Item | Value |
|------|-------|
| IP | 154.66.197.199 |
| Domain | origin.cleva-ai.co.za |
| SSH | `ssh root@154.66.197.199` |
| App dir | /var/www/puregro/ |
| PostgreSQL | `sudo -u postgres psql -d origin` |
| MongoDB | localhost:27017/origin |

---

## Login Credentials

### POS Multi-App (PIN: 123456)
| Email | Role |
|-------|------|
| florisolivier7@gmail.com | Owner |
| admin@cleva-ai.co.za | Admin |
| sunningdale.manager@cleva-ai.co.za | Branch Manager |
| inventory@cleva-ai.co.za | Inventory Manager |

### B2B Portal (OTP, bypass: 830101)
| Email | Role |
|-------|------|
| admin@cleva-ai.co.za | Admin |
| florisolivier7@gmail.com | Admin |
| b2b@cleva-ai.co.za | Client |

---

## Key Business Documents (ds/ folder)
| File | What |
|------|------|
| `ds/invoice-ILCO-0001.html` | Invoice for R29,499 platform setup |
| `ds/origin-quote-OR-00002.html` | Quote for cultivation + marketing (R30K + R2,498/mo) |
| `ds/origin-quote-OR-00002.pdf` | PDF version (submitted to client) |
| `ds/cultivation-client-spec.html` | On-site spec document (CLIENT INPUT NEEDED items) |
| `ds/marketing-implementation-strategy.html` | AI marketing plan (14 commands, 6 phases) |
| `ds/origin-design-system.html` | Brand tokens reference |

---

## Important Rules
- **scrape.do for web scraping** (NOT Firecrawl) — API key: `19fc59526086477c93f095eb7cd739165efb9ac0186`
- **"Collection point" NOT "dispensary"** — legal requirement in SA
- Origin brand tokens: Cinzel headings, Inter body, JetBrains Mono code, gold #C9A84C
- FloRouter AI is the billing entity (Capitec 2153553365, branch 470010)
- ILCO Farming is the client (Ray, ray@ilcofarming.co.za, +27 76 834 7331)
- Focus on vanilla JS site — React app is next phase
