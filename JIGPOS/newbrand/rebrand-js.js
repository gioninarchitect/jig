#!/usr/bin/env node
/**
 * JIG Rebrand Script - JS Files
 * Updates DBC colors, fonts, and visible brand text in JS files
 * Run: node rebrand-js.js
 */

const fs = require('fs');
const path = require('path');

const dir = __dirname;

// Collect all JS files
const jsFiles = [];
function walkDir(d) {
    if (d.includes('node_modules') || d.includes('.git') || d.includes('react-app')) return;
    fs.readdirSync(d, { withFileTypes: true }).forEach(entry => {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) walkDir(full);
        else if (entry.name.endsWith('.js') && entry.name !== 'rebrand-to-jig.js' && entry.name !== 'rebrand-js.js') {
            jsFiles.push(full);
        }
    });
}
walkDir(dir);

let processed = 0;

jsFiles.forEach(filePath => {
    const rel = path.relative(dir, filePath);
    let js = fs.readFileSync(filePath, 'utf8');
    const original = js;

    // 1. HEX COLORS: Replace DBC brand colors with JIG equivalents
    js = js.replace(/#3A5F48/gi, '#7C3AED');    // green -> purple
    js = js.replace(/#2A4635/gi, '#6D28D9');    // green-dark -> purple-dark
    js = js.replace(/#1E3328/gi, '#0A0A0A');    // green-deep -> black
    js = js.replace(/#4A7A5D/gi, '#A855F7');    // green-light -> purple-light
    js = js.replace(/#F4F0E6/gi, '#0A0A0A');    // cream -> black
    js = js.replace(/#f0ede4/gi, '#0A0A0A');    // cream variant
    js = js.replace(/#D4AF37/gi, '#D97706');    // gold -> amber
    js = js.replace(/#B8922D/gi, '#B45309');    // gold-dark -> amber-dark
    js = js.replace(/#E8C45A/gi, '#F59E0B');    // gold-light -> amber-light
    js = js.replace(/#A63429/gi, '#DC2626');    // red -> red
    js = js.replace(/#8A2722/gi, '#B91C1C');    // red-dark -> red-dark

    // 2. RGBA COLORS
    js = js.replace(/rgba\(58,\s*95,\s*72/g, 'rgba(124, 58, 237');
    js = js.replace(/rgba\(42,\s*70,\s*53/g, 'rgba(109, 40, 217');
    js = js.replace(/rgba\(30,\s*51,\s*40/g, 'rgba(0, 0, 0');
    js = js.replace(/rgba\(45,\s*90,\s*61/g, 'rgba(124, 58, 237');
    js = js.replace(/rgba\(212,\s*175,\s*55/g, 'rgba(217, 119, 6');
    js = js.replace(/rgba\(184,\s*146,\s*45/g, 'rgba(180, 83, 9');
    js = js.replace(/rgba\(166,\s*52,\s*41/g, 'rgba(220, 38, 38');

    // 3. FONTS: Replace DBC fonts
    js = js.replace(/'Passion One',?\s*cursive/g, "'Oswald', sans-serif");
    js = js.replace(/'Passion One'/g, "'Oswald'");
    js = js.replace(/"Passion One"/g, '"Oswald"');
    js = js.replace(/'Crimson Pro',?\s*serif/g, "'Oswald', sans-serif");

    // 4. VISIBLE BRAND TEXT (user-facing strings only)
    // "De Bud Chef" -> "JIG Craft Cannabis" in string literals and template literals
    js = js.replace(/De Bud Chef/g, 'JIG Craft Cannabis');
    js = js.replace(/DE BUD CHEF/g, 'JIG CRAFT CANNABIS');
    js = js.replace(/de bud chef/g, 'jig craft cannabis');
    js = js.replace(/debudchef\.co\.za/g, 'jigcraftcannabis.co.za');

    // 5. LOGO references
    js = js.replace(/dbc-logo-nobg\.png/g, 'jig-logo-nobg.png');
    js = js.replace(/dbc-logo\.png/g, 'jig-logo-nobg.png');
    js = js.replace(/dbc-logo-sm\.png/g, 'jig-logo-nobg.png');
    js = js.replace(/favicon\.png/g, 'jig-logo-nobg.png');

    // 6. SKU/Order prefixes: DBC -> JIG
    js = js.replace(/'DBC-'/g, "'JIG-'");
    js = js.replace(/"DBC-"/g, '"JIG-"');
    js = js.replace(/'DBC' \+/g, "'JIG' +");
    js = js.replace(/"DBC" \+/g, '"JIG" +');
    // Order numbers
    js = js.replace(/`DBC\$/g, '`JIG$');
    js = js.replace(/`DBC-\$/g, '`JIG-$');

    // 7. COMMENTS: Update branding in comments
    js = js.replace(/\/\/ DBC /g, '// JIG ');
    js = js.replace(/\/\/ De Bud Chef/g, '// JIG Craft Cannabis');
    js = js.replace(/DBC Stock Seed/g, 'JIG Stock Seed');
    js = js.replace(/DBC Wellness/g, 'JIG Wellness');
    js = js.replace(/Seed De Bud Chef/g, 'Seed JIG Craft Cannabis');
    js = js.replace(/DBC Ormonde/g, 'JIG Ormonde');

    // 8. DBC branch name stripping (inv-stocktake.js pattern)
    js = js.replace(/\.replace\('DBC '/g, ".replace('JIG '");

    // 9. Config email fromName
    js = js.replace(/fromName:\s*'De Bud Chef'/g, "fromName: 'JIG Craft Cannabis'");
    js = js.replace(/fromName:\s*"De Bud Chef"/g, 'fromName: "JIG Craft Cannabis"');

    // 10. JWT secret reference (just the name, not a real secret change)
    js = js.replace(/dbc_secret_key/g, 'jig_secret_key');

    // 11. MongoDB name
    js = js.replace(/mongodb:\/\/localhost:27017\/dbc/g, 'mongodb://localhost:27017/jig');

    // 12. IndexedDB name
    js = js.replace(/'DBCOffline'/g, "'JIGOffline'");

    // 13. Swagger / API docs
    js = js.replace(/title:\s*'De Bud Chef/g, "title: 'JIG Craft Cannabis");

    // 14. DBC prefix in business names
    js = js.replace(/businessName:\s*'DBC/g, "businessName: 'JIG");
    js = js.replace(/businessName:\s*`DBC/g, "businessName: `JIG");

    // 15. Company legal name in PDFs
    js = js.replace(/JIG Craft Cannabis \(Pty\) Ltd/g, 'JIG Craft Cannabis (Pty) Ltd');

    if (js !== original) {
        fs.writeFileSync(filePath, js, 'utf8');
        processed++;
        console.log(`DONE: ${rel}`);
    }
});

console.log(`\n=== JS REBRAND COMPLETE ===`);
console.log(`Processed: ${processed} / ${jsFiles.length} JS files`);
