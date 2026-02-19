#!/usr/bin/env node
/**
 * JIG Rebrand Script v2
 * Converts all DBC (De Bud Chef) branding to JIG Craft Cannabis design system v3
 * Run: node rebrand-to-jig.js
 */

const fs = require('fs');
const path = require('path');

const dir = __dirname;

// Get all HTML files (top-level + frontend/)
const htmlFiles = [];
fs.readdirSync(dir).forEach(f => {
    if (f.endsWith('.html')) htmlFiles.push(path.join(dir, f));
});
const frontendDir = path.join(dir, 'frontend');
if (fs.existsSync(frontendDir)) {
    fs.readdirSync(frontendDir).forEach(f => {
        if (f.endsWith('.html')) htmlFiles.push(path.join(frontendDir, f));
    });
}

// Skip design system reference files
const skip = ['debudchef-design-system.html', 'dbc-design-system.html', 'DBC-SOFTWARE-SPEC.html', 'dbc-testing-guide.html'];

let processed = 0;
let skipped = 0;

const JIG_FONTS_LINK = `https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap`;

// JIG :root variables block to replace DBC ones
const JIG_ROOT_VARS = `            /* JIG Craft Cannabis Brand Colors */
            --black: #0A0A0A;
            --white: #FAFAFA;
            --purple: #7C3AED;
            --purple-dark: #6D28D9;
            --purple-light: #A855F7;
            --green: #15803D;
            --green-dark: #166534;
            --green-light: #22C55E;
            --amber: #D97706;
            --amber-dark: #B45309;
            --amber-light: #F59E0B;
            --slate: #1E1E1E;
            --slate-light: #2A2A2A;
            /* Legacy aliases */
            --cream: #0A0A0A;
            --green-deep: #0A0A0A;
            --gold: #D97706;
            --gold-dark: #B45309;
            --gold-light: #F59E0B;
            --red: #DC2626;
            --red-dark: #B91C1C;
            --red-light: #EF4444;
            /* Neutrals (inverted for dark theme) */
            --gray-50: #111111;
            --gray-100: #1A1A1A;
            --gray-200: #2A2A2A;
            --gray-300: #3A3A3A;
            --gray-400: #6B7280;
            --gray-500: #9CA3AF;
            --gray-600: #D1D5DB;
            --gray-700: #E5E7EB;
            --gray-800: #F3F4F6;
            --gray-900: #FAFAFA;
            /* Semantic */
            --success: #22C55E;
            --warning: #F59E0B;
            --danger: #DC2626;
            --error: #EF4444;
            --info: #3B82F6;
            /* Shadows */
            --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
            --shadow-md: 0 8px 24px rgba(0,0,0,0.4);
            --shadow-lg: 0 16px 48px rgba(0,0,0,0.5);
            --shadow-xl: 0 24px 60px rgba(0,0,0,0.6);
            --shadow-purple: 0 8px 32px rgba(124,58,237,0.25);
            --shadow-gold: 0 8px 32px rgba(217,119,6,0.2);
            --shadow-green: 0 8px 32px rgba(21,128,61,0.2);
            --shadow-red: 0 8px 32px rgba(220,38,38,0.2);
            /* Gradients */
            --gradient-brand: linear-gradient(135deg, #7C3AED 0%, #A855F7 40%, #D97706 100%);
            --gradient-dark: linear-gradient(180deg, #1E1E1E 0%, #0A0A0A 100%);`;

htmlFiles.forEach(filePath => {
    const basename = path.basename(filePath);
    if (skip.includes(basename)) {
        skipped++;
        console.log(`SKIP: ${basename} (reference file)`);
        return;
    }

    let html = fs.readFileSync(filePath, 'utf8');
    const original = html;

    // 1. TITLE: Replace "De Bud Chef" in titles
    html = html.replace(/(<title>)([^<]*)(De Bud Chef)([^<]*)(<\/title>)/gi, (match, open, before, brand, after, close) => {
        const newTitle = (before + 'JIG Craft Cannabis' + after)
            .replace(/\|\s*Craft Cannabis\s*/g, '| Craft Cannabis ')
            .replace(/JIG Craft Cannabis\s*\|\s*Craft Cannabis/g, 'JIG Craft Cannabis')
            .trim();
        return `${open}${newTitle}${close}`;
    });

    // 2. GOOGLE FONTS: Replace Passion One / Crimson Pro with Anton / Oswald
    html = html.replace(
        /https:\/\/fonts\.googleapis\.com\/css2\?family=Passion\+One[^"']*/g,
        JIG_FONTS_LINK
    );
    // Also catch already-converted Anton links that might have been mangled
    html = html.replace(
        /https:\/\/fonts\.googleapis\.com\/css2\?family=Anton[^"']*/g,
        JIG_FONTS_LINK
    );

    // 3. THEME COLOR meta tag
    html = html.replace(/content="#3A5F48"/g, 'content="#7C3AED"');
    html = html.replace(/content="#7C3AED"/g, 'content="#7C3AED"'); // idempotent
    html = html.replace(/content="#2A4635"/g, 'content="#0A0A0A"');

    // 4. FONT-FAMILY: Replace DBC fonts with JIG fonts
    html = html.replace(/font-family:\s*'Passion One',?\s*cursive;?/g, "font-family: 'Oswald', sans-serif;");
    html = html.replace(/font-family:\s*'Passion One',?\s*sans-serif;?/g, "font-family: 'Oswald', sans-serif;");
    html = html.replace(/font-family:\s*'Crimson Pro',?\s*serif;?/g, "font-family: 'Oswald', sans-serif;");
    html = html.replace(/'Passion One'/g, "'Oswald'");
    html = html.replace(/'Crimson Pro'/g, "'Oswald'");

    // 5. EXPLICIT HEX COLORS: Replace DBC colors with JIG equivalents
    // These run BEFORE the :root replacement so the root block overwrites them
    // Primary green -> purple (as accent)
    html = html.replace(/#3A5F48/gi, '#7C3AED');
    html = html.replace(/#2A4635/gi, '#6D28D9');
    html = html.replace(/#1E3328/gi, '#0A0A0A');
    html = html.replace(/#4A7A5D/gi, '#A855F7');
    // Cream -> black
    html = html.replace(/#F4F0E6/gi, '#0A0A0A');
    html = html.replace(/#f0ede4/gi, '#0A0A0A');
    // Gold -> amber
    html = html.replace(/#D4AF37/gi, '#D97706');
    html = html.replace(/#B8922D/gi, '#B45309');
    html = html.replace(/#E8C45A/gi, '#F59E0B');
    // Red (DBC) -> Red (JIG)
    html = html.replace(/#A63429/gi, '#DC2626');
    html = html.replace(/#8A2722/gi, '#B91C1C');
    // Light neutrals to dark (for dark theme) - outside of :root only
    // Skip #FAFAFA since it's used as --white in JIG
    html = html.replace(/#F5F5F5/gi, '#1A1A1A');
    html = html.replace(/#E8E8E8/gi, '#2A2A2A');

    // 6. RGBA COLORS: Replace rgba versions of DBC colors
    html = html.replace(/rgba\(58,\s*95,\s*72/g, 'rgba(124, 58, 237');
    html = html.replace(/rgba\(42,\s*70,\s*53/g, 'rgba(109, 40, 217');
    html = html.replace(/rgba\(30,\s*51,\s*40/g, 'rgba(0, 0, 0');
    html = html.replace(/rgba\(45,\s*90,\s*61/g, 'rgba(124, 58, 237');
    html = html.replace(/rgba\(212,\s*175,\s*55/g, 'rgba(217, 119, 6');
    html = html.replace(/rgba\(184,\s*146,\s*45/g, 'rgba(180, 83, 9');
    html = html.replace(/rgba\(166,\s*52,\s*41/g, 'rgba(220, 38, 38');

    // 7. ROOT VARIABLES: Replace the DBC :root block with JIG
    // This runs AFTER hex replacements to ensure correct values in :root
    html = html.replace(/:root\s*\{([^}]*)\}/g, (match, content) => {
        // Replace if it contains JIG brand colors (from previous run) or any DBC remnants
        if (content.includes('#7C3AED') || content.includes('#0A0A0A') || content.includes('#D97706') ||
            content.includes('#F4F0E6') || content.includes('#3A5F48') || content.includes('#D4AF37') ||
            content.includes('#2A4635') || content.includes('DBC Brand') || content.includes('JIG')) {
            return `:root {\n${JIG_ROOT_VARS}\n        }`;
        }
        return match;
    });

    // 8. LOGO: Replace DBC logo references
    html = html.replace(/dbc-logo-nobg\.png/g, 'jig-logo-nobg.png');
    html = html.replace(/dbc-logo\.png/g, 'jig-logo-nobg.png');
    html = html.replace(/favicon\.png/g, 'jig-logo-nobg.png');

    // 9. BRAND TEXT in HTML content
    html = html.replace(/De Bud Chef/g, 'JIG Craft Cannabis');
    html = html.replace(/DE BUD CHEF/g, 'JIG CRAFT CANNABIS');
    html = html.replace(/de bud chef/g, 'jig craft cannabis');
    html = html.replace(/debudchef\.co\.za/g, 'jigcraftcannabis.co.za');

    // 10. DBC variable aliases -> JIG
    html = html.replace(/--dbc-green:/g, '--jig-purple:');
    html = html.replace(/--dbc-green-light:/g, '--jig-purple-light:');
    html = html.replace(/--dbc-cream:/g, '--jig-black:');
    html = html.replace(/--dbc-earth:/g, '--jig-amber:');
    html = html.replace(/--dbc-charcoal:/g, '--jig-slate:');
    html = html.replace(/--dbc-gold:/g, '--jig-amber:');
    html = html.replace(/var\(--dbc-green\)/g, 'var(--purple)');
    html = html.replace(/var\(--dbc-green-light\)/g, 'var(--purple-light)');
    html = html.replace(/var\(--dbc-cream\)/g, 'var(--black)');
    html = html.replace(/var\(--dbc-earth\)/g, 'var(--amber-dark)');
    html = html.replace(/var\(--dbc-charcoal\)/g, 'var(--slate)');
    html = html.replace(/var\(--dbc-gold\)/g, 'var(--amber)');

    // 11. BODY BACKGROUND: Ensure dark backgrounds
    html = html.replace(/background:\s*var\(--cream\)/g, 'background: var(--black)');
    html = html.replace(/background:\s*#FFFFFF(?!.*--white)/gi, 'background: #0A0A0A');
    html = html.replace(/background:\s*white(?!-)/g, 'background: #0A0A0A');

    // 12. TEXT COLOR: Light text on dark background
    html = html.replace(/color:\s*var\(--green-deep\)/g, 'color: var(--white)');
    html = html.replace(/color:\s*var\(--green\)(?!-)/g, 'color: var(--purple)');

    // 13. LINEAR GRADIENTS: Replace green gradients
    html = html.replace(/linear-gradient\(135deg,\s*var\(--green\)\s*0%,\s*var\(--green-dark\)\s*100%\)/g,
        'linear-gradient(135deg, #1E1E1E 0%, #0A0A0A 100%)');
    html = html.replace(/linear-gradient\(160deg,\s*var\(--green\)\s*0%,\s*var\(--green-dark\)\s*40%,\s*var\(--green-deep\)\s*100%\)/g,
        'linear-gradient(160deg, #1E1E1E 0%, #0A0A0A 40%, #0A0A0A 100%)');

    // 14. COMMENT HEADERS
    html = html.replace(/DBC Brand Colors/g, 'JIG Brand Colors');
    html = html.replace(/DBC Typography/g, 'JIG Typography');
    html = html.replace(/DBC Brand mapping/g, 'JIG Brand mapping');

    // Write back if changed
    if (html !== original) {
        fs.writeFileSync(filePath, html, 'utf8');
        processed++;
        console.log(`DONE: ${basename}`);
    } else {
        console.log(`UNCHANGED: ${basename}`);
    }
});

console.log(`\n=== REBRAND COMPLETE ===`);
console.log(`Processed: ${processed} files`);
console.log(`Skipped: ${skipped} files`);
console.log(`Unchanged: ${htmlFiles.length - processed - skipped} files`);
