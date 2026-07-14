# Loraine — scoped request (2026-07-14)

Source: 17 photos of the paper forms (02 Jul) + 3 pages of her hand-written system layout + the
overdue-task screenshot (29 Jun). Her words: *"Jy moet op elke kamer kan click en dan is al sy 'papier
werk' in sy eie vertrek en alles is gelink aanmekaar van cloning af tot dispatch. Elke ding moet die
batch nr by kry van clone tot in processing tot die dag wat hy by die hek uit gaan."*

Four workstreams. **A is urgent and security-related. B is a quick win. C is the big one. D is a new module.**

---

## A. ⏸️ PARKED — staff change (Edgar out, Gertrude in)

Loraine asked to remove Edgar from the system and put Gertrude on mothers + clones.

**Flo's call (2026-07-14): leave Edgar — do NOT action this.** No access was revoked, no PIN rotated,
no `edgar@` alias removed, Gertrude not provisioned. Recorded here only so the request isn't lost; do
not act on it without Flo saying so.

---

## B. Task-noise — "ons gaan forever click"

> *"Kan jy asb die uithaal by die checklist, ons gaan forever click."*

Her screenshot shows a wall of overdue **Temp & Humidity** tasks — one per tray, per day
(`SL-M3-1-T7`, `SL-M4-1-T9`, `SL-M4-1-T21`, `SL-M14-1-T21`, `CT-2026-001` …), all routed to the Nursery
Manager. This is the same class of bug as the cuttings-noise fix, but on the T&H side.

| # | Action |
|---|---|
| B1 | Stop generating one T&H task **per tray**. One reading covers the **room**, not each tray. |
| B2 | Collapse to **one T&H task per room per reading-slot** (clone room / mother bay / GH). |
| B3 | Clear the existing overdue backlog. |
| B4 | Remove the standalone **"Checklist"** nav item — replaced by the per-room checklists in §C. |

**This is the cheapest, highest-relief item.** Recommend doing it right after §A.

---

## C. Room-centric restructure (the big one)

Today the app is organised by *function* (Activity Log, Env Log, Cleaning, Tasks…). She wants it
organised by **room**, with each room holding its own paperwork.

### C1 — Navigation she drew
```
Cultivation
├── Greenhouse 1 → Bay 1 / Bay 2 / Bay 3 → Rows (as per BayGrid)
│      per row: Batch # · Amount harvested per row
├── Greenhouse 2 → same, but only 2 bays
├── Motherbay 1 → Current mothers (click → clone off them)
├── Motherbay 2 → same as Motherbay 1
└── Cloning → Clone schedule (Production / New mothers / Client)

Processing (same room-by-room treatment)
├── Wet material receiving · Dry room 1 · Dry room 2 · Trimming room
├── Weighing & packaging · Wash bay · Chemical storage · Receiving
├── Bulk storage · Final storage · Storage room · Sample room
├── Rejected goods · Dispatch
└── + the 2 hallways
```

### C2 — Every room carries its own logs
Temp & Humidity · Activity log · Scouting · Daily checklist · Cleaning checklist (daily / weekly /
after-batch) · Culling log (batch#, strain, weight) · Mortality log (batch#, strain, weight) ·
Defoliation log (batch#, strain, weight).

### C3 — Batch # is the golden thread
> *"Elke ding moet die batch nr by kry van clone tot in processing tot die dag wat hy by die hek uit gaan."*

Every record in every room stamps the **batch number**, giving one continuous chain
**clone → veg → flower → harvest → processing → dispatch**. This is the real prize — it *is* seed-to-sale
traceability, and it's what a SAHPRA inspector follows.

**Reality check:** this is a significant re-architecture of navigation + the data model (a `Room`
entity, every log FK'd to room + batch). Much of the underlying data already exists (BayGrid, activity
log, env log, cleaning, mortality) — this is mostly **re-parenting and re-navigating** what we have, plus
new logs (Scouting, Defoliation, Culling-by-batch). Not a rewrite, but not a week either.

**Decision needed:** full nav replacement, or add a "Rooms" view alongside the current one and migrate?
Recommend **incremental** — build the Room shell + move 2 rooms across first, prove it with her, then roll on.

---

## D. Inventory / stock module (new — replaces the paper)

She photographed the whole paper set. Three form shapes:

### D1 — Per-product inventory log (one per chemical)
Columns: `Date · Product In · Stock In · Stock Out · **Balance** · Name · Sign · Comment`
Products seen so far (she says more coming — *"ek sal fotos van als neem"*):
**Biodyne · Spliff · Pyrol · Diatomaceous Earth · Bittermag · Agrisil · Rooting Gel · Vectobac (Bacillus)
· Cerasulfur · Neudosan · Hypochlorous Acid (HOCL)**

### D2 — Category stock sheets (same columns, item picker)
- **Substrate stock sheet** — in **KG** (substrate bags · stock in kg · stock out kg · balance kg)
- **Cultivation supplies / consumables** — blades · scrogg net · baling twine
- **Hygiene inventory** — sanitizer · hand soap · hair nets · beard covers · sleeve covers · gloves

### D3 — Cultivation Chemical Product Inventory (master register)
Columns: `Date · Time · Chemical Name · **Batch Number** · **Expiry Date** · Checked By · Comments`
→ enables **expiry alerts** and ties a chemical batch to the plants it touched (GMP + SAHPRA gold).

### D4 — The wins over paper
- **Balance auto-calculates** (the single biggest cause of paper errors).
- **Stock-out auto-deducts** when a chemical is applied via the Activity Log (we already capture
  equipment # + dose there — this closes the loop).
- **Expiry + low-stock alerts.**
- Name/Sign → the logged-in user + audit trail (no wet signature needed).

---

## Recommended order

1. **§A — Edgar/Gertrude** (security, today).
2. **§B — kill the task flood** (cheap, immediate relief, she's drowning).
3. **§D — inventory module** (self-contained, high value, doesn't disturb anything else).
4. **§C — room restructure** (biggest, do it incrementally and prove each room with her).

## Open questions for Loraine
1. Gertrude — her own named login, or take over the `nm@` mailbox?
2. Should a chemical application in the Activity Log **auto-deduct** stock? (Recommend yes.)
3. Full product list for §D — she has more photos coming.
4. Room restructure: replace the nav outright, or run it alongside and migrate?
5. Scouting / Defoliation logs — what fields? (Not in the photos; new to us.)
