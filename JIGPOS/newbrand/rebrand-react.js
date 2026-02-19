#!/usr/bin/env node
// JIG Rebrand — React JSX Files
// Replaces all DBC/De Bud Chef references in react-app/src JSX files

const fs = require('fs');
const path = require('path');

const REACT_SRC = path.join(__dirname, 'react-app', 'src');

// ─── Replacement Rules (order matters — longer/more-specific first) ───

const replacements = [
  // ── Brand Text ──
  ['De Bud Chef Collection', 'JIG Craft Cannabis Collection'],
  ['About De Bud Chef', 'About JIG Craft Cannabis'],
  ['Experience the De Bud Chef difference', 'Experience the JIG Craft Cannabis difference'],
  ['Find a De Bud Chef collection point near you', 'Find a JIG Craft Cannabis collection point near you'],
  ['Interested in bringing De Bud Chef to your area', 'Interested in bringing JIG Craft Cannabis to your area'],
  ['The De Bud Chef affiliate program', 'The JIG Craft Cannabis affiliate program'],
  ['using the De Bud Chef website', 'using the JIG Craft Cannabis website'],
  ['De Bud Chef shall not be liable', 'JIG Craft Cannabis shall not be liable'],
  ['De Bud Chef operates in full compliance', 'JIG Craft Cannabis operates in full compliance'],
  ['De Bud Chef was founded', 'JIG Craft Cannabis was founded'],
  ['quality counts at De Bud Chef', 'quality counts at JIG Craft Cannabis'],
  ['Account: De Bud Chef', 'Account: JIG Craft Cannabis'],
  ['Account Holder: De Bud Chef', 'Account Holder: JIG Craft Cannabis'],
  ['>De Bud Chef<', '>JIG Craft Cannabis<'],
  ['alt="De Bud Chef"', 'alt="JIG Craft Cannabis"'],
  ['De Bud Chef', 'JIG Craft Cannabis'],

  // ── DBC Abbreviation (context-sensitive) ──
  ['Your DBC Account', 'Your JIG Account'],
  ['DBC Components', 'JIG Components'],
  ['products and orders with DBC', 'products and orders with JIG'],
  ['>DBC<', '>JIG<'],
  ['alt="DBC"', 'alt="JIG"'],
  ['// P20+P34 — World Model Context Provider for DBC', '// P20+P34 — World Model Context Provider for JIG'],
  ['vanilla dbc-brand.css', 'vanilla jig-brand.css'],
  ['vanilla dbc-core.js', 'vanilla jig-core.js'],
  ['user@dbc.co.za', 'user@jig.cleva-ai.co.za'],

  // ── Email Addresses ──
  ['hello@debudchef.co.za', 'hello@jig.cleva-ai.co.za'],
  ['support@debudchef.co.za', 'support@jig.cleva-ai.co.za'],
  ['payments@debudchef.co.za', 'payments@jig.cleva-ai.co.za'],
  ['privacy@debudchef.co.za', 'privacy@jig.cleva-ai.co.za'],
  ['info@debudchef.co.za', 'info@jig.cleva-ai.co.za'],
  ['ormonde@debudchef.co.za', 'ormonde@jig.cleva-ai.co.za'],
  ['spruitview@debudchef.co.za', 'spruitview@jig.cleva-ai.co.za'],
  ['rustenburg@debudchef.co.za', 'rustenburg@jig.cleva-ai.co.za'],
  ['klerksdorp@debudchef.co.za', 'klerksdorp@jig.cleva-ai.co.za'],
  ['mayfair@debudchef.co.za', 'mayfair@jig.cleva-ai.co.za'],
  ['ladybrand@debudchef.co.za', 'ladybrand@jig.cleva-ai.co.za'],
  ['ficksburg@debudchef.co.za', 'ficksburg@jig.cleva-ai.co.za'],
  ['wonderboom@debudchef.co.za', 'wonderboom@jig.cleva-ai.co.za'],
  ['@debudchef.co.za', '@jig.cleva-ai.co.za'],

  // ── Image Paths ──
  ['dbc-logo-nobg.png', 'jig-logo-nobg.png'],

  // ── localStorage Keys ──
  ["'dbc_cart'", "'jig_cart'"],
  ["'dbc_age_verified'", "'jig_age_verified'"],

  // ── Hex Colors (DBC -> JIG) ──
  ['#D4AF37', '#D97706'],   // gold -> amber
  ['#d4af37', '#D97706'],   // lowercase variant
  ['#3A5F48', '#7C3AED'],   // green -> purple
  ['#3a5f48', '#7C3AED'],
  ['#2A4635', '#6D28D9'],   // green-dark -> purple-dark
  ['#2a4635', '#6D28D9'],
  ['#1E3328', '#1E1E1E'],   // green-deep -> slate
  ['#1e3328', '#1E1E1E'],
  ['#F4F0E6', '#0A0A0A'],   // cream -> black
  ['#f4f0e6', '#0A0A0A'],
  ['#A63429', '#DC2626'],   // old red -> jig red

  // ── Fonts ──
  ["'Passion One', cursive", "'Anton', sans-serif"],
  ["'Passion One'", "'Anton'"],
  ['"Passion One"', '"Anton"'],
  ["'Playfair Display', serif", "'Oswald', sans-serif"],
  ["'Playfair Display'", "'Oswald'"],
  ['"Playfair Display"', '"Oswald"'],
  ["'Crimson Pro'", "'Oswald'"],
  ['"Crimson Pro"', '"Oswald"'],

  // ── Tailwind Classes: dbc-* -> jig-* ──
  // green-deep -> white (was dark text on light bg, now light text on dark bg)
  ['text-dbc-green-deep', 'text-white'],
  ['bg-dbc-green-deep', 'bg-jig-slate'],
  ['border-dbc-green-deep', 'border-jig-slate'],

  // green-dark -> purple-dark
  ['text-dbc-green-dark', 'text-jig-purple-dark'],
  ['bg-dbc-green-dark', 'bg-jig-purple-dark'],
  ['border-dbc-green-dark', 'border-jig-purple-dark'],

  // green -> purple (primary)
  ['text-dbc-green', 'text-jig-purple'],
  ['bg-dbc-green', 'bg-jig-purple'],
  ['border-dbc-green', 'border-jig-purple'],
  ['ring-dbc-green', 'ring-jig-purple'],
  ['focus:ring-dbc-green', 'focus:ring-jig-purple'],
  ['focus:border-dbc-green', 'focus:border-jig-purple'],
  ['hover:bg-dbc-green', 'hover:bg-jig-purple'],
  ['hover:text-dbc-green', 'hover:text-jig-purple'],
  ['hover:border-dbc-green', 'hover:border-jig-purple'],

  // gold-dark -> amber-dark
  ['text-dbc-gold-dark', 'text-jig-amber-dark'],
  ['bg-dbc-gold-dark', 'bg-jig-amber-dark'],
  ['border-dbc-gold-dark', 'border-jig-amber-dark'],

  // gold -> amber
  ['text-dbc-gold', 'text-jig-amber'],
  ['bg-dbc-gold', 'bg-jig-amber'],
  ['border-dbc-gold', 'border-jig-amber'],
  ['focus:border-dbc-gold', 'focus:border-jig-amber'],
  ['focus:shadow-[0_0_0_4px_rgba(212,175,55,0.15)]', 'focus:shadow-[0_0_0_4px_rgba(124,58,237,0.15)]'],

  // cream -> jig-slate (bg) / gray-100 (text)
  ['bg-dbc-cream', 'bg-jig-slate'],
  ['text-dbc-cream', 'text-gray-100'],
  ['border-dbc-cream', 'border-jig-slate'],
  ['hover:bg-dbc-cream', 'hover:bg-jig-slate'],

  // red -> jig-red
  ['text-dbc-red', 'text-jig-red'],
  ['bg-dbc-red', 'bg-jig-red'],
  ['border-dbc-red', 'border-jig-red'],
  ['hover:text-dbc-red', 'hover:text-jig-red'],
  ['hover:bg-dbc-red', 'hover:bg-jig-red'],

  // ── Gradient prefixes (from-, via-, to-) ──
  // green-deep
  ['from-dbc-green-deep', 'from-jig-slate'],
  ['via-dbc-green-deep', 'via-jig-slate'],
  ['to-dbc-green-deep', 'to-jig-slate'],
  // green-dark
  ['from-dbc-green-dark', 'from-jig-purple-dark'],
  ['via-dbc-green-dark', 'via-jig-purple-dark'],
  ['to-dbc-green-dark', 'to-jig-purple-dark'],
  // green-light
  ['from-dbc-green-light', 'from-jig-purple-light'],
  ['via-dbc-green-light', 'via-jig-purple-light'],
  ['to-dbc-green-light', 'to-jig-purple-light'],
  // green
  ['from-dbc-green', 'from-jig-purple'],
  ['via-dbc-green', 'via-jig-purple'],
  ['to-dbc-green', 'to-jig-purple'],
  // gold-dark
  ['from-dbc-gold-dark', 'from-jig-amber-dark'],
  ['via-dbc-gold-dark', 'via-jig-amber-dark'],
  ['to-dbc-gold-dark', 'to-jig-amber-dark'],
  // gold-light
  ['from-dbc-gold-light', 'from-jig-amber-light'],
  ['via-dbc-gold-light', 'via-jig-amber-light'],
  ['to-dbc-gold-light', 'to-jig-amber-light'],
  // gold
  ['from-dbc-gold', 'from-jig-amber'],
  ['via-dbc-gold', 'via-jig-amber'],
  ['to-dbc-gold', 'to-jig-amber'],
  // red
  ['from-dbc-red', 'from-jig-red'],
  ['via-dbc-red', 'via-jig-red'],
  ['to-dbc-red', 'to-jig-red'],

  // ── Border direction variants (border-l, border-t, border-r, border-b) ──
  ['border-l-dbc-green', 'border-l-jig-purple'],
  ['border-t-dbc-green', 'border-t-jig-purple'],
  ['border-l-dbc-gold', 'border-l-jig-amber'],
  ['border-t-dbc-gold', 'border-t-jig-amber'],
  ['border-l-dbc-red', 'border-l-jig-red'],
  ['border-t-dbc-red', 'border-t-jig-red'],

  // ── accent- (checkbox/radio) ──
  ['accent-dbc-green', 'accent-jig-purple'],
  ['accent-dbc-gold', 'accent-jig-amber'],

  // ── ring variants ──
  ['ring-dbc-gold', 'ring-jig-amber'],
  ['ring-dbc-red', 'ring-jig-red'],

  // ── Comment cleanup ──
  ['dbc_age_verified', 'jig_age_verified'],
];

// ─── File Discovery ───

function getJsxFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getJsxFiles(full));
    } else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

// ─── Run ───

const files = getJsxFiles(REACT_SRC);
let totalChanges = 0;
let changedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  let fileChanges = 0;

  for (const [find, replace] of replacements) {
    if (content.includes(find)) {
      const count = content.split(find).length - 1;
      content = content.split(find).join(replace);
      fileChanges += count;
    }
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    const rel = path.relative(__dirname, file);
    console.log(`  [${fileChanges} changes] ${rel}`);
    totalChanges += fileChanges;
    changedFiles++;
  }
}

console.log(`\nDone: ${totalChanges} replacements across ${changedFiles} files (${files.length} scanned)`);
