# TnT-ZA Onboarding Wizard — Full Specification

> The goal: First-time FM or Grower logs in → guided wizard → facility fully configured → ready to start tracking plants in under 15 minutes. Works perfectly on phone.

---

## UX Philosophy: What Makes It Unforgettable

### 1. One Thing Per Screen
No forms with 20 fields. Each screen asks ONE question or captures ONE piece of data. Like a conversation, not a tax return.

### 2. Big Touch Targets (44px+)
Every button, every input — designed for someone wearing gloves in a grow room, holding a phone with one hand. No tiny dropdowns. No fiddly date pickers.

### 3. Progress Bar That Moves Fast
8 steps, but most have 2-3 fields. The progress bar fills quickly — dopamine hit at every step. Users feel they're flying through setup.

### 4. Smart Defaults + Skip
Pre-fill what we can guess (SA timezone, ZAR currency, standard zone types). Let them skip optional fields and come back later. Never block on non-essential data.

### 5. Visual Confirmation
After each step, show what they just created with a green checkmark and a card preview. They can see their facility taking shape.

### 6. No Jargon
"Where is your grow?" not "Enter facility GPS coordinates". "What do you grow?" not "Register botanical strain metadata". Speak grower, not software.

### 7. Works Offline After First Load
The wizard screens are cached. If they lose signal in the facility, they can keep filling in. Syncs when back online.

---

## The 8 Steps

### Step 1: Welcome + Your Details
**Screen title**: "Let's set up your facility"
**What we collect**:
- Business name (auto-filled from tenant if exists)
- Your name (auto-filled from user record)
- Your role confirmation (FM or Grower)
- Phone number (for notifications)

**UX**: Full-screen welcome with ILCO green gradient. One big "Let's Go" button. Feels like opening a premium app for the first time.

---

### Step 2: Your Facility
**Screen title**: "Where is your grow?"
**What we collect**:
- Facility name (e.g., "ILCO Farm Potchefstroom")
- Physical address (street, city, province — dropdown for province)
- GPS coordinates (auto-detect from phone with "Use My Location" button, or manual entry)
- Indoor / Greenhouse / Outdoor (big icon toggle, one tap)

**UX**: Map preview showing their pin. "Use My Location" button is primary — one tap and done. Address fields auto-fill from GPS reverse geocoding if possible.

**Data created**: Facility record.

---

### Step 3: Your Licenses
**Screen title**: "Your permits and licenses"
**What we collect**:
- Section 22C(1)(b) license number (text)
- License expiry date (date picker with big month/year selector)
- Section 22A permit number (text, optional)
- Permit expiry date (optional)
- GMP certificate number (optional)
- INCB annual quota — number of plants allowed (number input with large +/- buttons)

**UX**: License fields shown as cards. Green border when filled, grey when empty. Optional fields clearly marked "Add later" link. The quota field is highlighted with an info tooltip: "This is the maximum number of plants SAHPRA allows you annually."

**Data created**: Facility updated + Permit records + QuotaTracking record.

---

### Step 4: Your Zones
**Screen title**: "Set up your rooms"
**What we collect**: For each zone:
- Zone name (text, e.g., "Grow Room A")
- Zone type (big icon picker: GROW, PROPAGATION, DRY, TRIM, CURE, PROCESS, PACK, STORAGE, QUARANTINE)
- Capacity — max plants or containers (number)
- Environmental monitoring? (toggle)

**UX**: Start with 4 suggested zones (Grow, Dry, Trim, Cure) pre-filled as cards. User can edit names, add more, or remove. Each zone type has a distinctive icon and color. "Add Another Zone" button at bottom. Minimum 1 zone required.

**Quick setup option**: "Use Standard Layout" button pre-creates: Propagation, Grow Room, Drying Room, Trim Station, Curing Vault, Processing, Packaging, Storage. One tap = 8 zones.

**Data created**: Zone records.

---

### Step 5: Your Strains
**Screen title**: "What do you grow?"
**What we collect**: For each strain:
- Strain name (text, e.g., "Durban Poison")
- Species (toggle: Sativa / Indica / Hybrid)
- Chemo-type (toggle: THC-dominant / CBD-dominant / Balanced)
- Grow method (toggle: Indoor / Greenhouse / Outdoor)
- Source / seed bank (text, optional)
- Expected yield per plant in grams (number, optional — helps with yield deviation detection later)

**UX**: Card per strain. "Add Another Strain" button. Popular SA strains suggested as quick-add chips: "Durban Poison", "Swazi Gold", "Malawi Gold", "Power Plant", "Rooibaard". One tap to add, then edit details.

**Data created**: Strain metadata (stored as tags on future plants, or a Strain lookup table we should add to the schema).

---

### Step 6: Your Equipment
**Screen title**: "Register your scales and instruments"
**What we collect**: For each piece of equipment:
- Equipment name (text, e.g., "Mettler Toledo XS205")
- Type (dropdown: Scale, Hygrometer, Thermometer, Light Meter, pH Meter, Other)
- Location / zone (dropdown from zones created in Step 4)
- Last calibration date (date)
- Calibration interval (dropdown: 30 days, 60 days, 90 days, 6 months, 1 year)

**UX**: Start with "Add a Scale" since weight tracking is critical. Each registered item shows as a card with next calibration due date auto-calculated. "Skip — I'll add later" option.

**Minimum**: At least 1 scale registered (weight tracking is the core of TnT-ZA). Soft warning if skipped.

**Data created**: EquipmentCalibration records.

---

### Step 7: Your Team
**Screen title**: "Who works at the facility?"
**What we collect**: For each team member:
- Name
- Email (this becomes their login — PIN sent here)
- Role (big icon picker: Facility Manager, Cultivator, Lab Tech, Security Officer, Viewer)
- Assigned zone(s) (multi-select from Step 4 zones, optional)

**UX**: The current user (FM or Grower doing setup) is already shown as a card. "Invite Team Member" button adds a row. Each role has a clear description tooltip:
- Cultivator: "Registers plants, transitions phases, weighs containers"
- Lab Tech: "Submits test results, generates COAs"
- Security Officer: "Records transport, witnesses destruction"
- Viewer: "Read-only access for inspectors"

**Data created**: User records (PINs auto-generated and emailed on first invite).

---

### Step 8: Your SOPs (Quick Start)
**Screen title**: "Standard Operating Procedures"
**What we collect**:
- Option A: "Use ILCO Standard SOPs" — pre-loads 5 template SOPs:
  1. Harvesting & Weighing Procedure
  2. Container Handling & Zone Transitions
  3. Drying Room Protocol
  4. Lab Sample Collection
  5. Destruction & Waste Disposal
- Option B: "I'll create my own" — skip for now, create later in QMS
- Option C: Upload existing SOPs (PDF or text)

**UX**: Big toggle between A and B. Option A is recommended with a green badge. Most users will tap A and move on. The templates are based on SAHPRA GMP requirements.

**Data created**: SOP records (v1, auto-approved by setup user).

---

## Completion Screen

**Screen title**: "You're ready to grow"
**Shows**:
- Summary card: Facility name, X zones, X strains, X equipment, X team members, X SOPs
- Quota: "0 / [quota] plants registered"
- 3 big action buttons:
  - "Register Your First Plant" → `/plants` with create modal open
  - "Register Your First Container" → `/containers` with create modal open
  - "Go to Dashboard" → `/dashboard`

**Confetti animation** (subtle, brief). This is the payoff.

---

## When Does the Wizard Trigger?

On login, check:
```
IF facility has 0 zones → show wizard
ELSE → go to dashboard
```

The wizard can also be re-accessed from Settings if they want to add more zones/strains/equipment later.

---

## Technical Implementation

### New Schema Additions Needed
- **Strain** model (name, species, chemoType, growMethod, source, expectedYield, tenantId, facilityId)
- Add `onboardingComplete` boolean to Facility model

### New API Endpoints
- `POST /api/onboarding/facility` — Create/update facility with all setup data
- `POST /api/onboarding/zones` — Bulk create zones
- `POST /api/onboarding/strains` — Bulk create strains
- `POST /api/onboarding/equipment` — Bulk create equipment
- `POST /api/onboarding/team` — Bulk invite users
- `POST /api/onboarding/sops` — Apply SOP templates
- `POST /api/onboarding/complete` — Mark facility as onboarded

### Frontend
- `/onboarding` route — 8-step wizard with swipe navigation
- Each step is its own component
- State managed in a single Zustand store (wizard progresses even if API fails — sync on completion)
- Fully responsive: phone-first, works on tablet and desktop
- Progress bar at top: 8 segments, green fill animation

---

## Regulatory Compliance Checklist (What SAHPRA Expects)

Based on Section 22C(1)(b) and SAHPRA cultivation guidelines:

| SAHPRA Requirement | Wizard Step | Field |
|-------------------|-------------|-------|
| Facility identified by address | Step 2 | Address + GPS |
| License number on file | Step 3 | Section 22C number |
| INCB quota tracked | Step 3 | Annual quota |
| Zones defined with types | Step 4 | Zone name + type |
| Botanical identification (species, variety, chemo-type, origin) | Step 5 | Strain details |
| Materials traceable | Step 5 | Source / seed bank |
| Equipment calibrated | Step 6 | Calibration dates |
| Personnel qualified | Step 7 | Team + roles |
| SOPs in place | Step 8 | SOP templates |
| Records retention 10+ years | Automatic | Audit log (append-only, hash chain) |
| Batch numbering from earliest point | Automatic | Auto-generated batch IDs |
| Seed-to-sale tracking | Automatic | Plant → Container → Batch → Lab → COA |

---

## What Competitors Miss (Our Advantage)

| Competitor | What they do | What we do better |
|-----------|-------------|-------------------|
| **Cultrax** (SA) | ERP + tracking but complex enterprise setup | Phone-first wizard, 15-minute setup, AI photo scan |
| **Metrc** (US) | Government-mandated, complex training required | Zero training needed — the wizard IS the training |
| **BioTrack** (US) | Requires on-site team visit for setup | Self-service setup from a phone in the grow room |
| **TraceSol** (SA) | RFID hardware dependent | Photo scan with Claude Vision — no hardware |
| **Cannavigia** (EU) | EU-GMP focused, not SA-specific | Built for SAHPRA Section 22C from day one |

Our unfair advantage: **The onboarding IS the training.** By the time they finish the wizard, they understand how the system works because they just set it up themselves.
