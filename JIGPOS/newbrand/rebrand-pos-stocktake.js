#!/usr/bin/env node
/**
 * JIG Rebrand - POS & Stocktake deep styling
 * Replaces Odyssey/DBC off-brand colors with JIG design system
 * Run: node rebrand-pos-stocktake.js
 */

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = [
    'pos.html',
    'stocktake-app.html',
    'packer-app.html',
    'dispatch-app.html',
    'inventory-manager-dashboard.html',
    'admin.html',
    'owner-dashboard.html',
    'dashboard.html',
    'login.html',
    'wholesale-pos.html',
    'menu-board.html',
    'branch-receiving.html',
    'stock-receiving-app.html',
    'drive-through-staff.html',
    'supplier-portal.html',
    'pnd-dashboard.html',
].map(f => path.join(dir, f)).filter(f => fs.existsSync(f));

// Also include all remaining HTML files
const allHtml = [];
fs.readdirSync(dir).forEach(f => {
    if (f.endsWith('.html')) allHtml.push(path.join(dir, f));
});
const feDir = path.join(dir, 'frontend');
if (fs.existsSync(feDir)) {
    fs.readdirSync(feDir).forEach(f => {
        if (f.endsWith('.html')) allHtml.push(path.join(feDir, f));
    });
}

// Use all HTML files for comprehensive cleanup
const targetFiles = [...new Set([...files, ...allHtml])];

let processed = 0;

targetFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    const basename = path.basename(filePath);
    // Skip reference files
    if (['debudchef-design-system.html', 'dbc-design-system.html', 'DBC-SOFTWARE-SPEC.html', 'dbc-testing-guide.html'].includes(basename)) return;

    let html = fs.readFileSync(filePath, 'utf8');
    const original = html;

    // === ODYSSEY NAVY BLUES → JIG DARK ===
    html = html.replace(/#1e3a5f/gi, '#1E1E1E');     // navy → slate
    html = html.replace(/#0f172a/gi, '#0A0A0A');     // dark navy → black
    html = html.replace(/#1a1a2e/gi, '#0A0A0A');     // dark blue → black
    html = html.replace(/#1e293b/gi, '#1E1E1E');     // slate blue → slate
    html = html.replace(/#16213e/gi, '#1E1E1E');     // dark blue → slate
    html = html.replace(/#162447/gi, '#1E1E1E');     // dark blue → slate
    html = html.replace(/#0a1128/gi, '#0A0A0A');     // deep navy → black

    // === TAILWIND SLATE GRAYS → JIG GRAYS ===
    html = html.replace(/#334155/gi, '#2A2A2A');     // slate-700 → jig gray-200
    html = html.replace(/#475569/gi, '#3A3A3A');     // slate-600 → jig gray-300
    html = html.replace(/#4a5568/gi, '#3A3A3A');     // gray-600 → jig gray-300
    html = html.replace(/#2d3748/gi, '#2A2A2A');     // gray-800 → jig gray-200
    html = html.replace(/#1e2746/gi, '#1E1E1E');     // custom dark → slate

    // === MUTED TEXT COLORS → JIG GRAY ===
    html = html.replace(/#64748b/gi, '#6B7280');     // slate-500 → jig gray-400
    html = html.replace(/#94a3b8/gi, '#9CA3AF');     // slate-400 → jig gray-500

    // === LIGHT BORDERS → DARK THEME BORDERS ===
    // DBC cream/light borders → dark subtle borders
    html = html.replace(/#e8e4dc/gi, '#2A2A2A');     // cream border → dark border
    html = html.replace(/#e8e4da/gi, '#2A2A2A');     // cream variant → dark border
    html = html.replace(/#e0e0e0/gi, '#2A2A2A');     // light gray border → dark border
    html = html.replace(/#d1d1d1/gi, '#3A3A3A');     // gray-300 → dark border

    // === LIGHT BACKGROUNDS → DARK ===
    html = html.replace(/#f9f9f9/gi, '#111111');     // near-white → near-black
    html = html.replace(/#f7f7f7/gi, '#111111');     // near-white → near-black
    html = html.replace(/#f3f3f3/gi, '#111111');     // near-white → near-black

    // === STATUS BACKGROUNDS → DARK THEME VERSIONS ===
    html = html.replace(/#f8d7da/gi, 'rgba(220, 38, 38, 0.15)');   // error bg → dark red tint
    html = html.replace(/#d4edda/gi, 'rgba(34, 197, 94, 0.15)');   // success bg → dark green tint
    html = html.replace(/#fff3cd/gi, 'rgba(245, 158, 11, 0.15)');  // warning bg → dark amber tint

    // === STATUS TEXT COLORS → CONSISTENT ===
    html = html.replace(/#dc3545/gi, '#DC2626');     // bootstrap red → jig red
    html = html.replace(/#28a745/gi, '#22C55E');     // bootstrap green → jig green
    html = html.replace(/#856404/gi, '#D97706');     // bootstrap warning text → amber
    html = html.replace(/#e67e22/gi, '#D97706');     // orange → amber
    html = html.replace(/#16a34a/gi, '#22C55E');     // green-600 → jig green

    // === ODYSSEY COMMENT LABELS ===
    html = html.replace(/ODYSSEY STYLE/gi, 'JIG STYLE');
    html = html.replace(/like Odyssey/gi, 'JIG design');
    html = html.replace(/Dark blue header/g, 'Dark header');

    // === PRODUCT CARD CATEGORY BACKGROUNDS ===
    // Fix the accessories card that still references cream
    html = html.replace(
        /\.product-card\[data-category="accessories"\]\s*\{[^}]*\}/g,
        '.product-card[data-category="accessories"] { background: linear-gradient(135deg, #2A2A2A 0%, #1E1E1E 100%); color: var(--white); }'
    );

    // === ENSURE BODY DARK TEXT COLOR ===
    // Any leftover "color: var(--gray-700)" or similar light-on-dark issues
    // In dark theme, body text should be light
    html = html.replace(/body\s*\{([^}]*?)color:\s*var\(--gray-700\)/g, (match) => {
        return match.replace(/color:\s*var\(--gray-700\)/, 'color: var(--white)');
    });

    if (html !== original) {
        fs.writeFileSync(filePath, html, 'utf8');
        processed++;
        console.log(`DONE: ${basename}`);
    }
});

console.log(`\n=== POS/STOCKTAKE DEEP REBRAND COMPLETE ===`);
console.log(`Processed: ${processed} files`);
