# BayGrid UX Specification — The Heart of TnT-ZA

> The BayGrid is not a feature. It is THE interface. Every cultivator, facility manager, and inspector should be able to look at the BayGrid and instantly understand: what's growing where, what strain, what phase, how long, and trace any plant back to its mother.

---

## The Core Principle

**Everything is traceable in two taps.**

- Tap a bay → see its plants
- Tap a plant → see its mother
- Tap the mother → see all her clones across all greenhouses

No searching. No menus. Visual, spatial, intuitive.

---

## 1. BayGrid Main View (What You See First)

### Mobile (375px)
```
┌─────────────────────────────┐
│ 🏠 ILCO Farms    [GH1 ▼]   │  ← Greenhouse selector dropdown
├─────────────────────────────┤
│                             │
│  GH1 — Vegetative          │  ← Greenhouse name + type
│  Capacity: 24/32 plants    │  ← Occupancy
│                             │
│  ┌─────┐ ┌─────┐ ┌─────┐  │
│  │Bay 1│ │Bay 2│ │Bay 3│  │  ← Each bay is a tappable card
│  │ 🟢  │ │ 🟡  │ │ ⬜  │  │  ← Color = strain, opacity = phase
│  │DP   │ │SG   │ │empty│  │  ← Strain abbreviation
│  │8/8  │ │6/8  │ │0/8  │  │  ← Plants / capacity
│  │Veg  │ │Veg  │ │     │  │  ← Current phase
│  │14d  │ │ 7d  │ │     │  │  ← Days in phase
│  └─────┘ └─────┘ └─────┘  │
│                             │
│  ┌─────┐ ┌─────┐ ┌─────┐  │
│  │Bay 4│ │Bay 5│ │Bay 6│  │
│  │ 🟣  │ │ 🟢  │ │ 🔴  │  │
│  │MG   │ │DP   │ │PP   │  │
│  │8/8  │ │4/8  │ │8/8  │  │
│  │Flwr │ │Trans│ │Harv │  │
│  │42d  │ │ 2d  │ │Ready│  │
│  └─────┘ └─────┘ └─────┘  │
│                             │
│  ┌──────────────────────┐  │
│  │ Legend:               │  │
│  │ 🟢 Durban Poison     │  │
│  │ 🟡 Swazi Gold        │  │
│  │ 🟣 Malawi Gold       │  │
│  │ 🔴 Power Plant       │  │
│  └──────────────────────┘  │
│                             │
│  [+ Allocate Bay]          │  ← CTA button
│                             │
├─────────────────────────────┤
│ 🏠  📷  🌱  📦  ≡       │  ← Bottom nav
└─────────────────────────────┘
```

### Desktop (1024px+)
- Side-by-side greenhouse panels (GH1 | GH2)
- Bays in a grid (4-6 columns)
- Hover bay → tooltip with details
- Click bay → slide-in panel from right

### Bay Card Colors
| Strain | Color | Hex |
|--------|-------|-----|
| Durban Poison | Green | #22C55E |
| Swazi Gold | Gold | #EAB308 |
| Malawi Gold | Purple | #A855F7 |
| Power Plant | Red | #EF4444 |
| Rooibaard | Orange | #F97316 |
| Northern Lights | Blue | #3B82F6 |
| Empty | Gray outline | #333 |

### Bay Card States
| State | Visual |
|-------|--------|
| Empty | Dashed border, gray, "empty" text |
| Partial | Solid border, strain color at 60% opacity, "4/8" count |
| Full | Solid border, strain color at 100%, full count |
| Harvest Ready | Pulsing border, "Ready" badge |
| Issue/Flagged | Red border + ⚠️ icon |

---

## 2. Bay Detail View (Tap a Bay)

### What Opens
A bottom sheet (mobile) or side panel (desktop) showing everything about this bay:

```
┌─────────────────────────────┐
│ ← Bay 1 — GH1              │
│ Durban Poison | Veg | 14 days│
├─────────────────────────────┤
│                             │
│ Batch: B-2026-012           │
│ Mother: ZA-000001 (M1)      │  ← Tappable → goes to mother
│ Clone Date: 12 Mar 2026     │
│ Transplant: 14 Mar 2026     │
│ Phase: VEGETATIVE           │
│ Days in Phase: 14           │
│ Light: 18/6                 │
│                             │
│ ── Plants (8/8) ──────────│
│                             │
│ L1: ZA-000142  ZA-000143   │  ← Line 1, 2 plants
│ L2: ZA-000144  ZA-000145   │  ← Line 2
│ L3: ZA-000146  ZA-000147   │  ← Line 3
│ L4: ZA-000148  ZA-000149   │  ← Line 4
│                             │
│ Each plant is tappable →    │
│ shows full traceability     │
│                             │
│ ── Tasks Due ─────────────│
│ ☐ Top plants (day 14)      │  ← SOP checklist
│ ☐ Bottom cleaning          │
│ ☐ Defoliation check        │
│ ☐ Record cm growth         │
│                             │
│ ── Feeding ───────────────│
│ Last feed: 2 days ago       │
│ Next feed: tomorrow         │
│ pH: 6.2 | EC: 1.4          │
│                             │
│ [Update Phase] [Log Growth] │
│ [Record Feed] [Flag Issue]  │
│                             │
└─────────────────────────────┘
```

### Key UX Decisions
- **Plant IDs are tappable** → opens plant detail with full mother lineage
- **Mother link is prominent** → one tap to see the mother plant
- **Tasks are inline** → no separate tasks page, they appear in context
- **Feeding info shows** → when last fed, when next feed due, current readings
- **Action buttons at bottom** → big, thumb-reachable, contextual to this bay

---

## 3. Plant Traceability (Tap a Plant)

### The Lineage Chain
```
BREEDER: Dutch Passion Seeds
  ↓
STRAIN: Durban Poison (Sativa, THC-dominant)
  ↓
MOTHER: ZA-000001 (M1)
  Status: ACTIVE
  Source: PURCHASED (seed)
  Total Clones: 47
  Active Clones: 32
  Culled: 0
  ↓
CLONE TRAY: CT-2026-012
  Cuttings: 10
  Rooted: 8
  Mortality: 2 (20%)
  Rooting Period: 14 days
  ↓
THIS PLANT: ZA-000142
  Clone Date: 1 Mar 2026
  Transplant: 14 Mar 2026
  Bay: GH1 / Bay 1 / Line 1 / Pos 1
  Phase: VEGETATIVE (day 14)
  ↓
  [Phase timeline: Clone → Root → Transplant → Veg ● → Flip → Flower → Harvest]
  ↓
  Weights: (none yet — first weight at harvest)
  ↓
  Batch: Not yet assigned (assigned at harvest)
```

### Visual: The Lineage Card
```
┌─────────────────────────────┐
│ 🌱 ZA-000142               │
│ Durban Poison | Sativa      │
├─────────────────────────────┤
│                             │
│ ← Trace Back                │
│ ┌───────────────────────┐  │
│ │ Breeder: Dutch Passion │  │
│ │ Strain: Durban Poison  │  │
│ │ Mother: ZA-000001 ──→  │  ← Tappable
│ │ Clone Tray: CT-012     │  │
│ │ Rooting: 14 days       │  │
│ │ Mortality: 2/10 (20%)  │  │
│ └───────────────────────┘  │
│                             │
│ → Current Location          │
│ ┌───────────────────────┐  │
│ │ GH1 → Bay 1 → L1 → P1 │  │
│ │ Phase: VEG (day 14)    │  │
│ │ Light: 18/6            │  │
│ │ Last Feed: 2 days ago  │  │
│ └───────────────────────┘  │
│                             │
│ → Trace Forward (when done) │
│ ┌───────────────────────┐  │
│ │ Batch: (not yet)       │  │
│ │ COA: (not yet)         │  │
│ │ Client: (not yet)      │  │
│ └───────────────────────┘  │
│                             │
│ [Advance Phase] [Flag]      │
│ [Log Growth] [View Mother]  │
└─────────────────────────────┘
```

---

## 4. Mother Plant View (Tap the Mother)

### What You See
```
┌─────────────────────────────┐
│ 👑 MOTHER: ZA-000001        │
│ Durban Poison | ACTIVE      │
├─────────────────────────────┤
│                             │
│ Source: PURCHASED (seed)    │
│ Breeder: Dutch Passion      │
│ Date: 15 Jan 2026           │
│ Age: 72 days                │
│                             │
│ ── Health ────────────────│
│ Status: ● ACTIVE            │
│ Defects: None               │
│ Test: TESTED ✓              │
│ Last Photo: 3 days ago      │
│ [📷 Take Photo]             │
│                             │
│ ── Clone History ─────────│
│ Total Cuttings: 47          │
│ Rooted: 38 (81%)            │
│ Mortality: 9 (19%)          │
│ Active Plants: 32           │
│                             │
│ ── Where Are Her Clones? ─│
│                             │
│ GH1 Bay 1: 8 plants (Veg)  │  ← Tappable → goes to bay
│ GH1 Bay 4: 8 plants (Flwr) │
│ GH1 Bay 5: 4 plants (Trans)│
│ GH2 Bay 2: 6 plants (Veg)  │
│ Harvested: 6 plants         │
│                             │
│ ── Clone Matrix ──────────│
│ ┌────┬───────┬─────┬──────┐│
│ │Tray│ Date  │Taken│Rooted││
│ ├────┼───────┼─────┼──────┤│
│ │CT-1│ 1 Feb │  10 │  8   ││
│ │CT-2│15 Feb │  10 │  9   ││
│ │CT-3│ 1 Mar │  10 │  8   ││
│ │CT-4│15 Mar │  10 │  7   ││
│ │CT-5│28 Mar │   7 │  ... ││
│ └────┴───────┴─────┴──────┘│
│                             │
│ [Take Cuttings] [Cull]      │
│ [View Strain] [Edit Notes]  │
└─────────────────────────────┘
```

### Key Feature: Clone Map
A visual showing WHERE all clones from this mother are located across all greenhouses. Color-coded by phase. One glance = know the output of this mother.

---

## 5. Task Checklists (In Context)

### How Tasks Appear
Tasks don't live on a separate page. They appear **inside the bay detail** and **on the dashboard** as a task bar.

### Bay-Level Tasks
When you open a bay, the bottom shows pending tasks for that bay:
```
── Tasks Due (Bay 1, GH1) ──
☐ Day 14: Top all plants
☐ Day 14: Bottom cleaning
☐ Record cm growth measurement
☐ Check for pests/mould
```

Tap a task → opens a checklist:
```
┌─────────────────────────────┐
│ ✓ Topping — Bay 1, GH1     │
├─────────────────────────────┤
│                             │
│ SOP: Veg Phase Management   │
│ Due: Today                  │
│ Assigned: Lou (Cultivator)  │
│                             │
│ Checklist:                  │
│ ☐ Identify main stem        │
│ ☐ Cut above 5th node        │
│ ☐ Apply rooting compound    │
│   to cutting (if saving)    │
│ ☐ Record cutting in TnT-ZA │
│ ☐ Take photo of topped      │
│   plant                     │
│                             │
│ [📷 Take Photo]             │
│                             │
│ Notes: _______________      │
│                             │
│ [Complete Task ✓]           │
└─────────────────────────────┘
```

### Dashboard Task Bar
At the top of the dashboard, a horizontal scrollable task bar:
```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ 3    │ │ 1    │ │ 2    │ │ 0    │
│tasks │ │task  │ │tasks │ │tasks │
│GH1   │ │GH2   │ │Feed  │ │QA    │
│Bay1-3│ │Bay 1 │ │      │ │      │
└──────┘ └──────┘ └──────┘ └──────┘
```

Tap → expands to show the tasks. No separate page needed.

---

## 6. The Intuitive Flow (User Journey)

### Cultivator's Morning
1. Opens app → Dashboard shows: **3 tasks due in GH1**
2. Taps GH1 → BayGrid shows 6 bays
3. Bay 1 has a task indicator (orange dot)
4. Taps Bay 1 → sees "Day 14: Top all plants"
5. Taps the task → checklist opens
6. Goes through checklist, takes photo, completes
7. Task disappears, bay refreshes
8. Checks Bay 5 → "4 plants just transplanted, feeding due tomorrow"
9. Notes the feeding reminder → moves on

### Facility Manager's Walkthrough
1. Opens app → Dashboard shows BayGrid overview
2. Sees Bay 6 is "Harvest Ready" (pulsing)
3. Taps Bay 6 → sees 8 Power Plant at day 63
4. Taps "Begin Harvest" → confirms
5. System creates batch, assigns containers
6. Processing Manager gets notification: "Batch B-2026-015 ready for drying"

### Inspector's Audit
1. Opens app → scans QR on a jar in the curing room
2. System shows: CURE-112 → Batch B-2026-012 → Durban Poison
3. Taps "Trace" → sees:
   - Mother: ZA-000001, purchased from Dutch Passion
   - Clone tray: CT-012, 10 cuttings, 8 rooted
   - Bay: GH1 Bay 1 for 14 days veg, 49 days flower
   - Harvest: 2 Mar, wet weight 450g
   - Drying: 10 days, dry weight 380g
   - Trimmed by: Trimmer A (210g) + Trimmer B (170g)
   - Curing: started 15 Mar, current weight 365g
   - Lab: 8/8 tests passed, COA issued
4. Every gram accounted for. Every handler named. Every timestamp logged.

---

## 7. What Makes This Better Than Competitors

| Feature | Cultrax / Metrc / BioTrack | TnT-ZA BayGrid |
|---------|---------------------------|-----------------|
| Plant location | Text field (room name) | Visual grid (GH → Bay → Line → Position) |
| Mother tracking | Basic parent-child | Full clone matrix with success rates, health, photos |
| Tasks | Separate module | Inline in bay context — see tasks WHERE the plants are |
| Traceability | Click through 5 screens | 2 taps: plant → mother, or plant → batch → COA |
| Mobile | Desktop-first, clunky on phone | Phone-first, thumb-reachable, big cards |
| Feeding | Not integrated | Feed plan per GH, run-off tracking, next-feed alerts |
| Trimming | Batch-level only | Per-trimmer weight in/out with reconciliation |

---

## 8. Technical Implementation

### New Frontend Pages
- `/baygrid` — Main BayGrid view (replaces Plants as the primary nav)
- `/baygrid/:greenhouseId` — Single greenhouse view
- `/baygrid/:greenhouseId/:bayId` — Bay detail (bottom sheet on mobile)
- `/mothers` — Mother plant registry
- `/mothers/:id` — Mother detail with clone matrix
- `/tasks` — Task overview (optional — tasks primarily shown in context)

### New Sidebar Order
```
Dashboard
BayGrid ← NEW (replaces Plants as #2)
Scan
Mothers ← NEW
Containers
Batches
Lab
...
```

### New API Endpoints
```
GET  /api/greenhouses
GET  /api/greenhouses/:id/bays
GET  /api/bays/:id (with plants, tasks, feeding)
POST /api/bays/:id/allocate (assign plants to bay)
POST /api/bays/:id/clear (harvest complete, mark empty)

GET  /api/mothers
POST /api/mothers (register mother)
GET  /api/mothers/:id (detail + clone matrix)
POST /api/mothers/:id/clone (take cuttings → create clone tray)
PATCH /api/mothers/:id/status (active/culled/stressed)

GET  /api/clone-trays
POST /api/clone-trays/:id/transplant (rooted → assign to bay)

GET  /api/tasks/due (my tasks for today)
POST /api/tasks/:id/complete (with checklist responses + photo)
```

---

*The BayGrid is what makes TnT-ZA feel like a tool built BY cultivators, FOR cultivators. Not a compliance form with a green logo on it.*
