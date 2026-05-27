# PureGro Rebrand — JIG → PureGro Token Mapping
**Generated:** 2026-02-20  
**Updated:** 2026-02-20 (DBC cleanup confirmed complete)
**Script:** `puregro-rebrand.js`  
**Playbook:** `REBRAND-PLAYBOOK.md`

## Pre-Flight Status

| Check | Status |
|-------|--------|
| DBC contamination eliminated | ✅ DONE |
| dbc-auth/core/utils.js renamed to jig-* | ✅ DONE |
| CSS class names fixed (.dbc-toast → .jig-toast) | ✅ DONE |
| Service worker cache names fixed | ✅ DONE |
| Favicon + PWA icons replaced | ✅ DONE |
| Grep sweep: 0 DBC refs in active source | ✅ VERIFIED |
| react-app/dist rebuild | ⚠️ PENDING — run `cd react-app && npm run build` |
| **JIG → PureGro rebrand** | 🔲 READY TO RUN |

---

## Color Mapping: JIG → PureGro

| Role | JIG Token | JIG Hex | PureGro Token | PureGro Hex |
|------|-----------|---------|---------------|-------------|
| Primary | `--purple` | `#7C3AED` | `--pg-green` | `#3FC041` |
| Primary dark | `--purple-dark` | `#6D28D9` | `--pg-green-muted` | `#2A8C2C` |
| Primary light | `--purple-light` | `#A855F7` | `--pg-green-bright` | `#56D458` |
| Secondary | `--amber` | `#D97706` | `--pg-gold` | `#F0A500` |
| Secondary dark | `--amber-dark` | `#B45309` | `--pg-gold` | `#F0A500` |
| Secondary light | `--amber-light` | `#F59E0B` | `--pg-gold-light` | `#F8C242` |
| Background | `--black` | `#0A0A0A` | `--pg-black` | `#0E0E0E` |
| Surface | `--slate` | `#1E1E1E` | `--pg-dark` | `#1A1A1A` |
| Surface 2 | `--slate-light` | `#2A2A2A` | `--pg-dark-2` | `#222222` |
| Text | `--white` | `#FAFAFA` | `--pg-white` | `#FFFFFF` |
| Text muted | `--gray-500` | `#9CA3AF` | `--pg-grey-2` | `#999999` |
| Text subtle | `--gray-400` | `#6B7280` | `--pg-grey-3` | `#666666` |
| Gradient | `--gradient-brand` | purple→amber | `--pg-grad-brand` | green→gold |

---

## Typography Mapping: JIG → PureGro

| Role | JIG Font | PureGro Font |
|------|----------|--------------|
| Display / Hero | Anton, Impact | Barlow Condensed 800–900, uppercase |
| Headings | Oswald, Arial Narrow | Barlow Condensed 700–800 |
| Body | Inter, -apple-system | Barlow 300–600 |
| Monospace / data | — | DM Mono 400–500 |

**Google Fonts link for PureGro:**
```html
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,700&family=Barlow:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## Text Mapping: JIG → PureGro

| JIG Text | PureGro Text |
|----------|--------------|
| JIG Craft Cannabis | PureGro Premium Cannabis Care |
| JIG Craft | PureGro |
| Craft Cannabis | Premium Cannabis Care |
| JIG B2B | PureGro B2B |
| JIG POS | PureGro POS |
| JIG Online Store | PureGro Online Store |
| jigcraftcannabis.co.za | puregro.co.za |
| @JIGb2b | @PureGrob2b |

---

## CSS File Renames

| Old File | New File |
|----------|----------|
| `css/jig-brand.css` | `css/pg-brand.css` |
| `css/dbc-brand.css` | `css/pg-brand.css` (delete old) |
| `frontend/dbc-auth.js` | `frontend/pg-auth.js` |
| `frontend/dbc-core.js` | `frontend/pg-core.js` |
| `frontend/dbc-utils.js` | `frontend/pg-utils.js` |
| `frontend/jig-core.js` | `frontend/pg-core.js` |

---

## Branch Code Mapping

| JIG Code | PureGro Code | Location |
|----------|-------------|----------|
| JIG-ONL | PG-ONL | PureGro Online Store |
| JIG-ORM | PG-CPT-01 | Cape Town Store 1 |
| *(update remaining 8 stores)* | PG-[suburb] | Western Cape |

**Update `config/branches.json` with PureGro's 9 Western Cape store locations.**

---

## PureGro CSS :root Block (replace JIG :root entirely)

```css
:root {
  /* ── CORE PALETTE ── */
  --pg-black:        #0E0E0E;
  --pg-dark:         #1A1A1A;
  --pg-dark-2:       #222222;
  --pg-dark-3:       #2A2A2A;
  --pg-dark-4:       #333333;

  /* ── GREEN SCALE ── */
  --pg-green:        #3FC041;
  --pg-green-bright: #56D458;
  --pg-green-muted:  #2A8C2C;
  --pg-green-dim:    #1F6620;
  --pg-card-top:     #4CAF50;

  /* ── GOLD ACCENT ── */
  --pg-gold:         #F0A500;
  --pg-gold-light:   #F8C242;

  /* ── NEUTRALS ── */
  --pg-white:        #FFFFFF;
  --pg-grey-1:       #CCCCCC;
  --pg-grey-2:       #999999;
  --pg-grey-3:       #666666;
  --pg-grey-4:       #444444;

  /* ── SEMANTIC ── */
  --pg-success:      #3FC041;
  --pg-warning:      #F0A500;
  --pg-error:        #E05252;
  --pg-info:         #4A9ECC;

  /* ── GRADIENTS ── */
  --pg-grad-brand:   linear-gradient(135deg, #3FC041 0%, #56D458 40%, #F0A500 100%);
  --pg-grad-green:   linear-gradient(135deg, #3FC041 0%, #2A8C2C 100%);
  --pg-grad-gold:    linear-gradient(135deg, #F0A500 0%, #F8C242 100%);
  --pg-grad-dark:    linear-gradient(180deg, #1A1A1A 0%, #0E0E0E 100%);
  --pg-grad-card:    linear-gradient(180deg, #4CAF50 0%, #3A8C3C 40%, #555555 100%);

  /* ── TYPOGRAPHY ── */
  --font-display:    'Barlow Condensed', 'Arial Narrow', sans-serif;
  --font-body:       'Barlow', -apple-system, sans-serif;
  --font-mono:       'DM Mono', 'Courier New', monospace;

  /* ── SHADOWS ── */
  --shadow-green:    0 4px 20px rgba(63,192,65,0.25);
  --shadow-green-lg: 0 8px 40px rgba(63,192,65,0.35);
  --shadow-gold:     0 4px 20px rgba(240,165,0,0.3);
  --shadow-dark:     0 4px 24px rgba(0,0,0,0.4);
}
```

---

## Manual Tasks Checklist

```
[ ] Run: node puregro-rebrand.js
[ ] Run all 10 verification greps (see script output)
[ ] Replace logo → pg-removebg-preview.png (transparent PNG)
[ ] Replace favicon.ico / favicon.png
[ ] Create new Telegram bot via @BotFather → update TELEGRAM_BOT_TOKEN in .env
[ ] Update nginx.conf: server_name puregro.co.za
[ ] Update nginx.conf: SSL cert paths
[ ] Update PM2 config: process names → puregro-*
[ ] Update config/branches.json: PureGro's 9 Western Cape store locations
[ ] Update database/seed.ts: product names, client data
[ ] Add Google Fonts link (Barlow Condensed + Barlow + DM Mono)
[ ] npm run build (React dist rebuild)
[ ] Visual audit: every page in browser
[ ] Mobile audit: nav, cards, touch targets, PWA prompts
```
