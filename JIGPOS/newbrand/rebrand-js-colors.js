#!/usr/bin/env node
/**
 * JIG Rebrand - Fix remaining off-brand colors in JS files
 * Run: node rebrand-js-colors.js
 */

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const jsFiles = [];
function walk(d) {
    if (d.includes('node_modules') || d.includes('.git') || d.includes('react-app')) return;
    fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.js') && !e.name.startsWith('rebrand')) jsFiles.push(full);
    });
}
walk(dir);

let processed = 0;

jsFiles.forEach(filePath => {
    let js = fs.readFileSync(filePath, 'utf8');
    const original = js;

    // Navy blues → JIG dark
    js = js.replace(/#1e3a5f/gi, '#1E1E1E');
    js = js.replace(/#0f172a/gi, '#0A0A0A');
    js = js.replace(/#1a1a2e/gi, '#0A0A0A');
    js = js.replace(/#1e293b/gi, '#1E1E1E');
    js = js.replace(/#16213e/gi, '#1E1E1E');

    // Tailwind slates → JIG grays
    js = js.replace(/#334155/gi, '#2A2A2A');
    js = js.replace(/#475569/gi, '#3A3A3A');
    js = js.replace(/#4a5568/gi, '#3A3A3A');
    js = js.replace(/#2d3748/gi, '#2A2A2A');

    // Light borders → dark borders
    js = js.replace(/#e8e4dc/gi, '#2A2A2A');
    js = js.replace(/#e8e4da/gi, '#2A2A2A');
    js = js.replace(/#e0e0e0/gi, '#2A2A2A');

    // Muted text
    js = js.replace(/#64748b/gi, '#6B7280');
    js = js.replace(/#94a3b8/gi, '#9CA3AF');

    // Status colors
    js = js.replace(/#f8d7da/gi, 'rgba(220, 38, 38, 0.15)');
    js = js.replace(/#d4edda/gi, 'rgba(34, 197, 94, 0.15)');
    js = js.replace(/#fff3cd/gi, 'rgba(245, 158, 11, 0.15)');
    js = js.replace(/#dc3545/gi, '#DC2626');
    js = js.replace(/#28a745/gi, '#22C55E');
    js = js.replace(/#856404/gi, '#D97706');
    js = js.replace(/#e67e22/gi, '#D97706');

    // Light backgrounds in dynamically generated HTML
    js = js.replace(/#f9f9f9/gi, '#111111');
    js = js.replace(/#f7f7f7/gi, '#111111');

    if (js !== original) {
        fs.writeFileSync(filePath, js, 'utf8');
        processed++;
        console.log(`DONE: ${path.relative(dir, filePath)}`);
    }
});

console.log(`\n=== JS COLOR FIX COMPLETE ===`);
console.log(`Processed: ${processed} / ${jsFiles.length} files`);
