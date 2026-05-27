#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
//  PUREGRO REBRAND SCRIPT — JIG → PureGro  (v2 — 2026-02-20)
//  Run from repo root: node puregro-rebrand.js
//  Covers ALL THREE SYSTEMS:
//    System 1: src/        (B2B Wholesale Portal — ~740 refs)
//    System 2: src/server/chat/ (Telegram Bot — ~63 refs)
//    System 3: JIGPOS/newbrand/ (POS Multi-App — ~2,222 refs)
//  Total: ~489 files, ~4,178 references
//
//  UPDATED: 2026-02-20 — DBC cleanup confirmed DONE in JIG codebase:
//    ✅ dbc-auth/core/utils.js renamed → jig-auth/core/utils.js
//    ✅ _dbcShowConfirm etc. → _jigShowConfirm (7 JS files fixed)
//    ✅ .dbc-toast → .jig-toast CSS classes fixed
//    ✅ Service worker cache names fixed (dbc-pos-v1 → jig-pos-v1)
//    ✅ Favicon + PWA icons replaced
//    ✅ Grep sweep: 0 DBC refs in active source files (VERIFIED)
//    ⚠️  react-app/dist/ needs rebuild: cd react-app && npm run build
//  Script targets JIG → PureGro ONLY. No dbc-* renames needed.
// ═══════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const glob = require('glob');

// ─────────────────────────────────────────────────────────────────
//  PUREGRO BRAND IDENTITY
//  Source of truth — all values from the PureGro Design System v1.0
// ─────────────────────────────────────────────────────────────────

const PUREGRO = {
  // Brand names
  nameFull:       'PureGro',
  nameSlug:       'puregro',
  nameDash:       'puregro',
  nameUnderscore: 'puregro',
  tagline:        'Premium Cannabis Care',
  taglineFull:    'PureGro Premium Cannabis Care',
  domain:         'puregro.co.za',
  email:          'info@puregro.co.za',
  telegramBot:    '@PureGrob2b',

  // Primary green
  green:          '#3FC041',
  greenDark:      '#2A8C2C',
  greenLight:     '#56D458',
  greenDim:       '#1F6620',
  greenCard:      '#4CAF50',

  // Gold accent
  gold:           '#F0A500',
  goldLight:      '#F8C242',

  // Backgrounds (dark theme — same direction as JIG)
  black:          '#0E0E0E',
  dark:           '#1A1A1A',
  dark2:          '#222222',
  dark3:          '#2A2A2A',
  dark4:          '#333333',

  // Text / neutrals
  white:          '#FFFFFF',
  offWhite:       '#F0F0F0',
  grey1:          '#CCCCCC',
  grey2:          '#999999',
  grey3:          '#666666',
  grey4:          '#444444',

  // Semantic
  error:          '#E05252',
  info:           '#4A9ECC',

  // Typography
  fontDisplay:    "'Barlow Condensed', 'Arial Narrow', sans-serif",
  fontBody:       "'Barlow', -apple-system, sans-serif",
  fontMono:       "'DM Mono', 'Courier New', monospace",

  // CSS variable prefix
  varPrefix:      'pg',
};

// ─────────────────────────────────────────────────────────────────
//  REBRAND CONFIG
// ─────────────────────────────────────────────────────────────────

const CONFIG = {

  // ── 1. TEXT REPLACEMENTS ─────────────────────────────────────
  // CRITICAL: longest strings FIRST to prevent partial replacements
  text: [
    // Full brand names
    { find: 'JIG Craft Cannabis',       replace: 'PureGro Premium Cannabis Care' },
    { find: 'jig craft cannabis',       replace: 'puregro premium cannabis care' },
    { find: 'JIG Craft',                replace: 'PureGro' },
    { find: 'jig-craft-cannabis',       replace: 'puregro' },
    { find: 'jig_craft_cannabis',       replace: 'puregro' },
    { find: 'jigcraftcannabis',         replace: 'puregro' },
    { find: 'Craft Cannabis',           replace: 'Premium Cannabis Care' },
    { find: 'craft-cannabis',           replace: 'premium-cannabis-care' },
    { find: 'craft_cannabis',           replace: 'premium_cannabis_care' },

    // Short brand name (case-sensitive variants)
    { find: 'JIG Wholesale',            replace: 'PureGro Wholesale' },
    { find: 'JIG B2B',                  replace: 'PureGro B2B' },
    { find: 'JIG POS',                  replace: 'PureGro POS' },
    { find: 'JIG Online Store',         replace: 'PureGro Online Store' },
    { find: 'JIG Online',               replace: 'PureGro Online' },

    // Domain & email
    { find: 'jigcraftcannabis.co.za',   replace: 'puregro.co.za' },
    { find: 'jig.co.za',                replace: 'puregro.co.za' },

    // Telegram bot
    { find: '@JIGb2b',                  replace: '@PureGrob2b' },
    { find: 'JIGb2b',                   replace: 'PureGrob2b' },

    // CSS/JS identifiers (jig- prefix)
    { find: 'jig-brand',                replace: 'pg-brand' },
    { find: 'jig-core',                 replace: 'pg-core' },
    { find: 'jig-auth',                 replace: 'pg-auth' },
    { find: 'jig-utils',                replace: 'pg-utils' },
    { find: 'jig-purple',               replace: 'pg-green' },
    { find: 'jig-amber',                replace: 'pg-gold' },
    { find: 'jig-black',                replace: 'pg-black' },

    // NOTE: dbc-* identifiers already eliminated from codebase (2026-02-20 cleanup)
    // Keeping as safety net in case any were missed in comments/strings
    { find: 'dbc-auth',                 replace: 'pg-auth' },
    { find: 'dbc-core',                 replace: 'pg-core' },
    { find: 'dbc-utils',                replace: 'pg-utils' },
    { find: 'dbc-brand',                replace: 'pg-brand' },
    { find: '_dbcShowConfirm',          replace: '_pgShowConfirm' },
    { find: '_dbcShowAlert',            replace: '_pgShowAlert' },
    { find: 'createDBCWorldState',      replace: 'createPGWorldState' },
    { find: 'dbc-pos-v1',               replace: 'pg-pos-v1' },
    { find: 'dbc-dispatch-v1',          replace: 'pg-dispatch-v1' },
    { find: 'dbc-packer-v1',            replace: 'pg-packer-v1' },
    { find: 'window.DBC',               replace: 'window.PG' },

    // PM2 / deploy process names
    { find: 'jig-server',               replace: 'puregro-server' },
    { find: 'jig-app',                  replace: 'puregro-app' },
    { find: 'jig-api',                  replace: 'puregro-api' },
    { find: 'jig-pos',                  replace: 'puregro-pos' },
    { find: 'jig-wholesale',            replace: 'puregro-wholesale' },

    // Branch codes (JIG- prefix → PG-)
    { find: 'JIG-ONL',                  replace: 'PG-ONL' },
    { find: 'JIG-ORM',                  replace: 'PG-CPT' },   // Update per PureGro store codes
    { find: '/^JIG-/',                  replace: '/^PG-/' },
    { find: 'branchCode: /^JIG-/',      replace: 'branchCode: /^PG-/' },

    // localStorage / sessionStorage keys
    { find: 'jig_branch',               replace: 'pg_branch' },
    { find: 'jig_token',                replace: 'pg_token' },
    { find: 'jig_user',                 replace: 'pg_user' },
    { find: 'jig_cart',                 replace: 'pg_cart' },
    { find: 'jig_session',              replace: 'pg_session' },

    // Copyright & legal text
    { find: 'JIG Craft Cannabis (Pty)',  replace: 'PureGro (Pty)' },
    { find: '© JIG',                    replace: '© PureGro' },

    // Short form — do LAST to avoid partial mismatches
    { find: 'JIG',                      replace: 'PureGro' },
    { find: 'jig-',                     replace: 'puregro-' },
    { find: 'jig_',                     replace: 'puregro_' },
    // NOTE: bare 'jig' (no prefix/suffix) is intentionally NOT replaced
    // to avoid false positives in words like "jiggle", "config", etc.
    // Run the verification grep after and manually review remaining 'jig' hits.
  ],

  // ── 2. CSS CLASS REPLACEMENTS ─────────────────────────────────
  classes: [
    { find: 'jig-purple',               replace: 'pg-green' },
    { find: 'jig-amber',                replace: 'pg-gold' },
    { find: 'jig-black',                replace: 'pg-black' },
    { find: 'jig-brand',                replace: 'pg-brand' },
    { find: 'jig-core',                 replace: 'pg-core' },
    { find: 'dbc-brand',                replace: 'pg-brand' },
  ],

  // ── 3. CSS VARIABLE REPLACEMENTS ─────────────────────────────
  // Replaces JIG variable REFERENCES (not the :root definitions)
  // The :root block in jig-brand.css will be replaced via the hex section
  cssValues: [
    // JIG purple → PureGro green
    { find: 'var(--purple)',            replace: 'var(--pg-green)' },
    { find: 'var(--purple-dark)',       replace: 'var(--pg-green-muted)' },
    { find: 'var(--purple-light)',      replace: 'var(--pg-green-bright)' },

    // JIG amber → PureGro gold
    { find: 'var(--amber)',             replace: 'var(--pg-gold)' },
    { find: 'var(--amber-dark)',        replace: 'var(--pg-gold)' },
    { find: 'var(--amber-light)',       replace: 'var(--pg-gold-light)' },

    // JIG backgrounds → PureGro backgrounds (theme stays dark)
    { find: 'var(--black)',             replace: 'var(--pg-black)' },
    { find: 'var(--slate)',             replace: 'var(--pg-dark)' },
    { find: 'var(--slate-light)',       replace: 'var(--pg-dark-2)' },

    // JIG text → PureGro text
    { find: 'var(--white)',             replace: 'var(--pg-white)' },
    { find: 'var(--gray-500)',          replace: 'var(--pg-grey-2)' },
    { find: 'var(--gray-400)',          replace: 'var(--pg-grey-3)' },

    // JIG gradient brand
    { find: 'var(--gradient-brand)',    replace: 'var(--pg-grad-brand)' },
  ],

  // ── 4. HARDCODED HEX REPLACEMENTS ────────────────────────────
  // JIG purple scale → PureGro green scale
  // JIG amber scale  → PureGro gold scale
  // JIG backgrounds  → PureGro backgrounds (values are same-ish, dark theme)
  hex: [
    // ── JIG purple → PureGro green ──
    { find: '#7C3AED',                  replace: '#3FC041' },  // purple → green primary
    { find: '#6D28D9',                  replace: '#2A8C2C' },  // purple-dark → green-muted
    { find: '#A855F7',                  replace: '#56D458' },  // purple-light → green-bright

    // ── JIG amber → PureGro gold ──
    { find: '#D97706',                  replace: '#F0A500' },  // amber → gold
    { find: '#B45309',                  replace: '#F0A500' },  // amber-dark → gold
    { find: '#F59E0B',                  replace: '#F8C242' },  // amber-light → gold-light

    // ── rgba variants ──
    { find: 'rgba(124,58,237',          replace: 'rgba(63,192,65' },   // purple rgba → green rgba
    { find: 'rgba(124, 58, 237',        replace: 'rgba(63, 192, 65' }, // with spaces
    { find: 'rgba(109,40,217',          replace: 'rgba(42,140,44' },   // purple-dark rgba
    { find: 'rgba(109, 40, 217',        replace: 'rgba(42, 140, 44' },
    { find: 'rgba(168,85,247',          replace: 'rgba(86,212,88' },   // purple-light rgba
    { find: 'rgba(217,119,6',           replace: 'rgba(240,165,0' },   // amber rgba → gold rgba
    { find: 'rgba(217, 119, 6',         replace: 'rgba(240, 165, 0' },

    // ── SVG data URI hex (URL-encoded) ──
    { find: '%237C3AED',                replace: '%233FC041' },  // purple → green
    { find: '%236D28D9',                replace: '%232A8C2C' },  // purple-dark → green-muted
    { find: '%23A855F7',                replace: '%2356D458' },  // purple-light → green-bright
    { find: '%23D97706',                replace: '%23F0A500' },  // amber → gold
    { find: '%23B45309',                replace: '%23F0A500' },
    { find: '%23F59E0B',                replace: '%23F8C242' },

    // ── JIG backgrounds (keep dark theme, update to PureGro exact values) ──
    { find: '#0A0A0A',                  replace: '#0E0E0E' },   // jig-black → pg-black
    { find: '#1E1E1E',                  replace: '#1A1A1A' },   // jig-slate → pg-dark
    { find: '#2A2A2A',                  replace: '#222222' },   // jig-slate-light → pg-dark-2
    // NOTE: #FAFAFA (white) intentionally NOT replaced — same value essentially

    // ── JIG gradient ──
    { find: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 40%, #D97706 100%)',
      replace: 'linear-gradient(135deg, #3FC041 0%, #56D458 40%, #F0A500 100%)' },
  ],

  // ── 5. CSS :root BLOCK REPLACEMENT ────────────────────────────
  // Replace the entire JIG :root variable block with PureGro tokens
  // This handles jig-brand.css cleanly
  rootBlock: {
    find: `  --purple: #7C3AED;
  --purple-dark: #6D28D9;
  --purple-light: #A855F7;`,
    replace: `  --pg-green: #3FC041;
  --pg-green-muted: #2A8C2C;
  --pg-green-bright: #56D458;`,
  },

  // ── 6. FONT REPLACEMENTS ─────────────────────────────────────
  fonts: [
    // JIG display font → PureGro display font
    { find: "'Anton'",                  replace: "'Barlow Condensed'" },
    { find: '"Anton"',                  replace: '"Barlow Condensed"' },
    { find: 'Anton,',                   replace: 'Barlow Condensed,' },

    // JIG heading font → PureGro heading font
    { find: "'Oswald'",                 replace: "'Barlow Condensed'" },
    { find: '"Oswald"',                 replace: '"Barlow Condensed"' },
    { find: 'Oswald,',                  replace: 'Barlow Condensed,' },

    // JIG body font → PureGro body font
    { find: "'Inter'",                  replace: "'Barlow'" },
    { find: '"Inter"',                  replace: '"Barlow"' },
    { find: "'Inter',",                 replace: "'Barlow'," },

    // Google Fonts link
    { find: 'family=Anton',             replace: 'family=Barlow+Condensed:wght@700;800;900' },
    { find: 'family=Oswald',            replace: 'family=Barlow+Condensed:wght@400;600;700' },
    { find: 'family=Inter',             replace: 'family=Barlow:wght@300;400;500;600' },
  ],

  // ── 7. FILE RENAMES ───────────────────────────────────────────
  renames: [
    // CSS
    { from: 'JIGPOS/newbrand/css/jig-brand.css',          to: 'JIGPOS/newbrand/css/pg-brand.css' },
    // Frontend JS (dbc-* files still present)
    // dbc-* files already renamed to jig-* in cleanup (2026-02-20) — handled below
    // { from: 'JIGPOS/newbrand/frontend/dbc-auth.js',  to: 'JIGPOS/newbrand/frontend/pg-auth.js' },
    { from: 'JIGPOS/newbrand/frontend/jig-core.js',       to: 'JIGPOS/newbrand/frontend/pg-core.js' },
    // Root CSS (if it exists at root level)
    { from: 'css/jig-brand.css',                           to: 'css/pg-brand.css' },
    { from: 'css/dbc-brand.css',                           to: 'css/pg-brand.css' },
  ],

  // ── 8. FILE PATTERNS (covers ALL three systems) ───────────────
  include: [
    // System 1: B2B Wholesale Portal + Telegram Bot
    'src/**/*.ts',
    'src/**/*.tsx',
    'src/**/*.js',
    'src/**/*.jsx',
    'src/**/*.json',
    'database/**/*.sql',
    'database/**/*.ts',
    'deploy/**/*.sh',
    'deploy/**/*.conf',
    'vite.config.ts',
    'vite.config.js',
    'package.json',
    'tailwind.config.ts',
    'tailwind.config.js',
    // System 3: JIGPOS Multi-App Ecosystem
    'JIGPOS/newbrand/**/*.html',
    'JIGPOS/newbrand/**/*.css',
    'JIGPOS/newbrand/**/*.js',
    'JIGPOS/newbrand/**/*.jsx',
    'JIGPOS/newbrand/**/*.json',
    'JIGPOS/newbrand/**/*.ts',
    'JIGPOS/newbrand/**/*.tsx',
  ],

  exclude: [
    'node_modules/**',
    'dist/**',
    'archived/**',
    '.git/**',
    'REBRAND-PLAYBOOK.md',
    'puregro-rebrand.js',   // don't rewrite ourselves
  ],
};

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyReplacements(content, replacements, flags = 'g') {
  let count = 0;
  for (const { find, replace } of replacements) {
    const regex = new RegExp(escapeRegex(find), flags);
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, replace);
      count += matches.length;
    }
  }
  return { content, count };
}

function renameFiles(renames) {
  console.log('\n📁  File renames:');
  for (const { from, to } of renames) {
    if (fs.existsSync(from)) {
      // Ensure destination directory exists
      const dir = path.dirname(to);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.renameSync(from, to);
      console.log(`  ✅  ${from} → ${to}`);

      // After rename, update all references in the codebase
      const oldFilename = path.basename(from);
      const newFilename = path.basename(to);
      if (oldFilename !== newFilename) {
        CONFIG.text.push({ find: oldFilename, replace: newFilename });
        // Also handle without extension for script src tags
        const oldBase = oldFilename.replace(/\.[^.]+$/, '');
        const newBase = newFilename.replace(/\.[^.]+$/, '');
        if (oldBase !== newBase) {
          CONFIG.text.push({ find: oldBase, replace: newBase });
        }
      }
    } else {
      console.log(`  ⚠️   ${from} — not found (skipping)`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  MAIN REBRAND FUNCTION
// ─────────────────────────────────────────────────────────────────

function rebrand() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  PUREGRO REBRAND SCRIPT — JIG → PureGro');
  console.log('  Covering all 3 systems (~489 files, ~4,178 refs)');
  console.log('═══════════════════════════════════════════════════════');

  // Step 1: Rename files first (before content replacement)
  renameFiles(CONFIG.renames);

  // Step 2: Glob all files
  const files = glob.sync(CONFIG.include, { ignore: CONFIG.exclude });
  console.log(`\n📂  Found ${files.length} files to process\n`);

  let totalReplacements = 0;
  let filesModified = 0;
  const log = [];

  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (e) {
      console.warn(`  ⚠️  Could not read ${file}: ${e.message}`);
      continue;
    }

    const original = content;
    let fileCount = 0;

    // Apply all replacement groups
    const groups = [
      { label: 'text',      list: CONFIG.text,      flags: 'g'  },
      { label: 'classes',   list: CONFIG.classes,   flags: 'g'  },
      { label: 'cssValues', list: CONFIG.cssValues,  flags: 'g'  },
      { label: 'hex',       list: CONFIG.hex,        flags: 'gi' },
      { label: 'fonts',     list: CONFIG.fonts,      flags: 'g'  },
    ];

    for (const { list, flags } of groups) {
      const result = applyReplacements(content, list, flags);
      content = result.content;
      fileCount += result.count;
    }

    // :root block replacement (for brand CSS files)
    if (CONFIG.rootBlock && content.includes(CONFIG.rootBlock.find)) {
      content = content.replace(CONFIG.rootBlock.find, CONFIG.rootBlock.replace);
      fileCount++;
    }

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      filesModified++;
      totalReplacements += fileCount;
      log.push({ file, count: fileCount });
      process.stdout.write(`  ✅  ${file} (${fileCount})\n`);
    }
  }

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  ✅  DONE`);
  console.log(`  Files scanned:   ${files.length}`);
  console.log(`  Files modified:  ${filesModified}`);
  console.log(`  Total replacements: ${totalReplacements}`);
  console.log('═══════════════════════════════════════════════════════');

  // ── Post-run verification reminder ──
  console.log(`
⚠️  NEXT STEPS — Run these verification greps from repo root:

# 1. Remaining JIG brand references
grep -rni "JIG Craft\\|jig-craft\\|jigcraft\\|JIG-\\|@JIGb2b" \\
  --include="*.html" --include="*.js" --include="*.ts" --include="*.tsx" \\
  --include="*.jsx" --include="*.css" --include="*.json" --include="*.sql" \\
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \\
  --exclude="REBRAND-PLAYBOOK.md" --exclude="puregro-rebrand.js"

# 2. Remaining JIG hex colors
grep -rni "#7C3AED\\|#6D28D9\\|#A855F7\\|#D97706\\|124,58,237" \\
  --include="*.html" --include="*.css" --include="*.js" --include="*.ts" \\
  --exclude-dir=node_modules --exclude-dir=dist

# 3. SVG data URIs with JIG colors
grep -rni "%237C3AED\\|%23D97706\\|%236D28D9" \\
  --include="*.html" --include="*.css" --exclude-dir=node_modules

# 4. Inline styles with JIG colors
grep -rni 'style="[^"]*purple\\|style="[^"]*amber\\|style="[^"]*#7C3' \\
  --include="*.html" --exclude-dir=node_modules

# 5. Remaining JIG CSS variable references
grep -rni "var(--purple)\\|var(--amber)\\|var(--gradient-brand)" \\
  --include="*.html" --include="*.css" --include="*.js" \\
  --exclude-dir=node_modules

# 6. Telegram bot messages
grep -rni "JIG\\|jig" src/server/chat/ --include="*.ts"

# 7. B2B portal
grep -rni "JIG\\|jig" src/server/ src/frontend/ src/world-model/ \\
  --include="*.ts" --include="*.tsx" --exclude-dir=node_modules

# 8. Database seed data
grep -rni "JIG\\|jig" database/ --include="*.sql" --include="*.ts"

# 9. Deploy scripts
grep -rni "JIG\\|jig" deploy/ --include="*.sh" --include="*.conf"

# 10. Unrenamed dbc-/jig- prefixed files
find JIGPOS/newbrand -name "dbc-*" -o -name "jig-*" 2>/dev/null

MANUAL TASKS (script cannot do these):
  [ ] Replace logo files with pg-removebg-preview.png
  [ ] Replace favicon.ico / favicon.png
  [ ] Create new bot via @BotFather → update TELEGRAM_BOT_TOKEN in .env
  [ ] Update nginx.conf server_name → puregro.co.za
  [ ] Update SSL cert paths in nginx.conf
  [ ] Update PM2 ecosystem.config.js process names
  [ ] Update config/branches.json with PureGro store codes & locations:
        PG-CPT-01 Cape Town (HQ)
        PG-[suburb] for each of the 9 Western Cape stores
  [ ] Update database/seed.ts product/client data
  [ ] Google Fonts link: swap Anton/Oswald/Inter → Barlow Condensed/Barlow/DM Mono
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900&family=Barlow:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
  [ ] Run: npm run build (React dist)
  [ ] Visual audit: open EVERY page in browser (see playbook Phase 9)
`);
}

// ─────────────────────────────────────────────────────────────────
//  RUN
// ─────────────────────────────────────────────────────────────────

rebrand();
