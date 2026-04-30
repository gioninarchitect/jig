# TnT-ZA — Role & Dashboard Access Map

## Role Hierarchy

```
Level 5: SUPER_ADMIN (Floris)
Level 4: TENANT_ADMIN (Ilze)
Level 3: FACILITY_MANAGER (Ray), PROCESSING_MANAGER (Jannette), QA_INSPECTOR
Level 2: CULTIVATOR (Lou), LAB_TECH (Keke), IRRIGATION_TECH
Level 1: SECURITY_OFFICER (Sipho), TRIMMER, GENERAL_WORKER
Level 0: VIEWER (SAHPRA Inspector)
```

---

## What Each Role Sees in the Sidebar

| Page | Viewer (0) | Security (1) | Cultivator (2) | FM (3) | Admin (4) | Super (5) |
|------|-----------|-------------|---------------|--------|-----------|-----------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BayGrid | ✓ view | ✓ view | ✓ edit | ✓ edit | ✓ edit | ✓ all |
| Mothers | — | — | ✓ | ✓ | ✓ | ✓ |
| Scan | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tickets | ✓ view | ✓ create | ✓ create | ✓ manage | ✓ manage | ✓ all |
| Plants | ✓ view | ✓ view | ✓ CRUD | ✓ CRUD | ✓ CRUD | ✓ all |
| Containers | ✓ view | ✓ view | ✓ CRUD | ✓ CRUD | ✓ CRUD | ✓ all |
| Batches | ✓ view | ✓ view | ✓ view | ✓ CRUD | ✓ CRUD | ✓ all |
| Facilities | — | ✓ view | ✓ view | ✓ view | ✓ edit | ✓ all |
| Audit | ✓ view | ✓ view | ✓ view | ✓ export | ✓ export | ✓ verify |
| Lab | — | — | ✓ view | ✓ view | ✓ view | ✓ all |
| Compliance | — | — | ✓ view | ✓ resolve | ✓ resolve | ✓ all |
| QMS | — | — | ✓ deviation | ✓ CRUD | ✓ CRUD | ✓ all |
| Security | — | ✓ | — | ✓ | ✓ | ✓ |
| Users | — | — | — | ✓ view | ✓ invite | ✓ all |
| Setup Wizard | — | — | ✓ | ✓ | ✓ | ✓ |

---

## Dashboard View Per Role

### SUPER_ADMIN / TENANT_ADMIN — Command Centre
```
┌──────────────────────────────────────┐
│ DASHBOARD — ILCO Farms               │
├──────────────────────────────────────┤
│                                      │
│ [Setup Banner — if not onboarded]    │
│                                      │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │50  │ │ 4  │ │ 2  │ │25% │        │
│ │plts│ │btch│ │flag│ │quot│        │
│ └────┘ └────┘ └────┘ └────┘        │
│                                      │
│ ┌─ Open Tickets ──────────────────┐ │
│ │ 🔴 CRITICAL: Mould in GH1 Bay 3 │ │
│ │ 🟡 HIGH: Irrigation pump fault   │ │
│ │ 🔵 MEDIUM: Scale needs calibrate │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Phase Chart ─┐ ┌─ Activity ────┐ │
│ │ [bar chart]    │ │ recent events │ │
│ └────────────────┘ └───────────────┘ │
│                                      │
│ ┌─ Weight Variance Alerts (RED) ──┐ │
│ │ BIN-001: 30% loss — CRITICAL    │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Risk Gauges ───────────────────┐ │
│ │ Diversion: 25  Compliance: 82   │ │
│ │ Weight Integrity: 75            │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Facilities ────────────────────┐ │
│ │ ILCO Farm — 50 plants, 4 batch  │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### FACILITY_MANAGER (Ray) — Operations Focus
```
┌──────────────────────────────────────┐
│ DASHBOARD — Ray (Facility Manager)   │
├──────────────────────────────────────┤
│                                      │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │50  │ │ 4  │ │ 2  │ │25% │        │
│ │plts│ │btch│ │flag│ │quot│        │
│ └────┘ └────┘ └────┘ └────┘        │
│                                      │
│ ┌─ My Tickets ────────────────────┐ │
│ │ 3 open, 1 critical              │ │
│ │ 🔴 Mould in GH1 Bay 3 → ASSIGN │ │
│ │ 🟡 Pump fault → IN PROGRESS     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ BayGrid Quick View ───────────┐ │
│ │ GH1: 4/6 bays active           │ │
│ │ GH2: 2/6 bays active           │ │
│ │ [Open BayGrid →]               │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Weight Alerts (must resolve) ──┐ │
│ │ BIN-001: 30% loss [RESOLVE]     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Tasks Due Today ───────────────┐ │
│ │ ☐ Spray day GH1                 │ │
│ │ ☐ Calibrate drying room scale   │ │
│ │ ☐ Review trim session weights   │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### CULTIVATOR (Lou) — Grow Focus
```
┌──────────────────────────────────────┐
│ DASHBOARD — Lou (Cultivator)         │
├──────────────────────────────────────┤
│                                      │
│ ┌─ My Bays ───────────────────────┐ │
│ │ GH1 Bay 1: Durban Poison, Veg   │ │
│ │   8/8 plants, day 14, tasks: 3  │ │
│ │ GH1 Bay 5: Swazi Gold, Trans    │ │
│ │   4/8 plants, day 2, tasks: 1   │ │
│ │ [Open BayGrid →]                │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Tasks Due Today ───────────────┐ │
│ │ ☐ Top plants — Bay 1 (day 14)   │ │
│ │ ☐ Record cm growth — Bay 1      │ │
│ │ ☐ Feed Bay 5 transplants        │ │
│ │ ☐ Check clone tray CT-012       │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ My Tickets ────────────────────┐ │
│ │ 1 open ticket I reported        │ │
│ │ 🟡 Pest signs on Bay 1 Line 2   │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Clone Trays Active ───────────┐ │
│ │ CT-2026-005: 7/10 rooting (d8)  │ │
│ │ CT-2026-004: 8/10 rooted ✓      │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Recent Mothers ────────────────┐ │
│ │ M1 Durban Poison — 47 clones    │ │
│ │ M2 Swazi Gold — 23 clones       │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### LAB_TECH (Keke) — Testing Focus
```
┌──────────────────────────────────────┐
│ DASHBOARD — Keke (Lab Tech)          │
├──────────────────────────────────────┤
│                                      │
│ ┌─ Pending Tests ─────────────────┐ │
│ │ B-2026-001: 3/8 tests done      │ │
│ │ B-2026-002: 8/8 ✓ [Generate COA]│ │
│ │ B-2026-003: QUARANTINED (retest)│ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ My Tickets ────────────────────┐ │
│ │ 0 open                          │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Recent Results ────────────────┐ │
│ │ POTENCY: 22.5% THC — PASS      │ │
│ │ PESTICIDE: <0.01ppm — PASS     │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### SECURITY_OFFICER (Sipho) — Gate & Compliance Focus
```
┌──────────────────────────────────────┐
│ DASHBOARD — Sipho (Security)         │
├──────────────────────────────────────┤
│                                      │
│ ┌─ Transport Status ──────────────┐ │
│ │ 1 manifest pending departure    │ │
│ │ SecureMed — NW-42-GP — B-2026-4 │ │
│ │ [Mark Departed]                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Open Tickets ──────────────────┐ │
│ │ 2 facility tickets              │ │
│ │ 🟡 Front gate camera offline    │ │
│ │ 🔵 Visitor log incomplete       │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Recent Destruction Events ─────┐ │
│ │ 1 pending confirmation          │ │
│ │ 120g — Mould — Cpt. Botha       │ │
│ │ [Confirm]                        │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### VIEWER / SAHPRA Inspector — Read-Only Audit
```
┌──────────────────────────────────────┐
│ DASHBOARD — Inspector (Viewer)       │
├──────────────────────────────────────┤
│                                      │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │50  │ │ 4  │ │ 2  │ │25% │        │
│ │plts│ │btch│ │flag│ │quot│        │
│ └────┘ └────┘ └────┘ └────┘        │
│                                      │
│ ┌─ BayGrid (read-only) ──────────┐ │
│ │ Visual grid — no edit buttons   │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Open Tickets (read-only) ──────┐ │
│ │ Can see all tickets, can't edit │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Risk Gauges ───────────────────┐ │
│ │ Diversion: 25  Compliance: 82   │ │
│ └──────────────────────────────────┘ │
│                                      │
│ No create/edit/resolve buttons.      │
│ Can browse all data + audit trail.   │
└──────────────────────────────────────┘
```

---

## CTA Buttons Per Role Per Page

### BayGrid Page
| Action | Button | Min Level |
|--------|--------|-----------|
| View bay grid | Always visible | 0 |
| Tap bay to see plants | Always visible | 0 |
| Create greenhouse | "Add Greenhouse" | 3 (FM) |
| Allocate plants to bay | "Allocate Bay" | 2 (Cultivator) |
| Clear bay (harvest done) | "Clear Bay" | 3 (FM) |
| Update bay phase | Inline | 2 (Cultivator) |

### Mothers Page
| Action | Button | Min Level |
|--------|--------|-----------|
| View mothers | List | 0 |
| Register mother | "Register Mother" | 2 (Cultivator) |
| Take cuttings | "Clone" button | 2 (Cultivator) |
| Cull mother | "Cull" button | 3 (FM) |
| View clone matrix | Tap mother | 0 |

### Tickets Page
| Action | Button | Min Level |
|--------|--------|-----------|
| View tickets | List + filters | 0 |
| Create ticket | "New Ticket" | 1 (Security+) |
| Add comment | Comment box | 1 |
| Resolve ticket | "Resolve" button | 2 (Cultivator+) |
| Assign ticket | Assign dropdown | 3 (FM) |

### Dashboard Components Per Role
| Component | Viewer | Security | Cultivator | FM | Admin | Super |
|-----------|--------|----------|-----------|-----|-------|-------|
| Stat cards (plants, batches, flags, quota) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Open tickets widget | ✓ view | ✓ view | ✓ view | ✓ manage | ✓ manage | ✓ all |
| BayGrid quick view | ✓ view | ✓ view | ✓ + tasks | ✓ + tasks | ✓ | ✓ |
| My tasks due | — | — | ✓ | ✓ | — | — |
| Clone trays active | — | — | ✓ | ✓ | — | — |
| Weight variance alerts | — | — | — | ✓ resolve | ✓ resolve | ✓ resolve |
| Phase chart | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Activity feed | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Risk gauges | ✓ | — | — | ✓ | ✓ | ✓ |
| Transport status | — | ✓ | — | ✓ | ✓ | ✓ |
| Destruction events | — | ✓ | — | ✓ | ✓ | ✓ |
| Pending lab tests | — | — | — | — | ✓ | ✓ |
| Setup banner | — | — | ✓ | ✓ | ✓ | ✓ |

---

## Role-Specific Dashboard Implementation

The dashboard should show DIFFERENT widgets based on the logged-in user's role. Not everyone needs to see everything.

### How to implement:
```typescript
// In DashboardPage.tsx
const { hasMinLevel, hasRole } = useRBAC();

// Tickets widget — everyone sees, but content differs
<TicketsWidget />

// BayGrid quick view — everyone sees
<BayGridQuickView />

// Tasks — only cultivator + FM
{hasMinLevel(2) && <TasksDueWidget />}

// Clone trays — only cultivator + FM
{hasMinLevel(2) && <CloneTraysWidget />}

// Weight alerts — only FM+
{hasMinLevel(3) && <WeightAlertPanel />}

// Risk gauges — only FM+
{hasMinLevel(3) && <RiskGauges />}

// Transport — only security + FM+
{(hasRole('SECURITY_OFFICER') || hasMinLevel(3)) && <TransportWidget />}
```

This way:
- **Cultivator** sees: Stats + BayGrid + Tasks + Clones + Tickets
- **FM** sees: Stats + BayGrid + Tasks + Clones + Weight Alerts + Risk + Tickets
- **Security** sees: Stats + BayGrid + Transport + Tickets
- **Viewer** sees: Stats + BayGrid + Risk + Tickets (all read-only)
