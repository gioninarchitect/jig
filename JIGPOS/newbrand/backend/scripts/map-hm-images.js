// Map Harmonic Mycology product images (scraped Shopify CDN) onto Origin products by normalised name.
// Usage: node map-hm-images.js /tmp/hm_products_api.json [--apply]
const fs = require('fs');
const mongoose = require('mongoose');

const norm = (s) => String(s || '').toLowerCase().replace(/['’.]/g, '').replace(/\b5-in-1\b/g, '5 in 1').replace(/[^a-z0-9]+/g, ' ').trim();

(async () => {
  const jsonPath = process.argv[2] || '/tmp/hm_products_api.json';
  const apply = process.argv.includes('--apply');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const products = data.products || data;

  // Build normalised-title -> best image src
  const imgByName = {};
  for (const p of products) {
    const src = (p.images && p.images[0] && p.images[0].src) ? p.images[0].src : null;
    if (src) imgByName[norm(p.title)] = src;
  }
  console.log(`Scraped images: ${Object.keys(imgByName).length}`);

  await mongoose.connect('mongodb://localhost:27017/origin');
  const col = mongoose.connection.db.collection('products');
  const rows = await col.find({ sku: /^HM-/i }).project({ name: 1, sku: 1, image: 1 }).toArray();

  let matched = 0; const misses = [];
  for (const r of rows) {
    const src = imgByName[norm(r.name)];
    if (src) {
      matched++;
      if (apply) await col.updateOne({ _id: r._id }, { $set: { image: src, updatedAt: new Date() } });
      else console.log('  MATCH', r.sku, r.name, '->', src.slice(0, 70));
    } else {
      misses.push(`${r.sku} ${r.name}`);
    }
  }
  console.log(`\n${apply ? 'APPLIED' : 'DRY-RUN'} — matched ${matched}/${rows.length}`);
  if (misses.length) console.log('Unmatched:\n  ' + misses.join('\n  '));
  process.exit(0);
})().catch(e => { console.error('error', e.message); process.exit(1); });
