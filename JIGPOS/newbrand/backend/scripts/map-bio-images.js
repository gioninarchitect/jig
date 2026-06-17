// Map Bio Sculpture Gemini images to DB products by colour NUMBER (exact, reliable).
// Usage: node map-bio-images.js /tmp/bio_images.json [--apply]
const fs = require('fs');
const mongoose = require('mongoose');

(async () => {
  const apply = process.argv.includes('--apply');
  const imgs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const byNum = {};
  for (const x of imgs) if (x.number != null && x.image) byNum[x.number] = x.image;
  console.log(`scraped bio images by number: ${Object.keys(byNum).length}`);

  await mongoose.connect('mongodb://localhost:27017/origin');
  const col = mongoose.connection.db.collection('products');
  const rows = await col.find({ $or: [{ brand: /bio.?sculpture|gemini/i }, { sku: /^BS-/i }] }).project({ name: 1, sku: 1, image: 1 }).toArray();

  let matched = 0; const misses = [];
  for (const r of rows) {
    const m = String(r.name || '').match(/no\.?\s*(\d+)/i);
    const num = m ? parseInt(m[1]) : null;
    const img = num != null ? byNum[num] : null;
    if (img) {
      matched++;
      if (apply) await col.updateOne({ _id: r._id }, { $set: { image: img, updatedAt: new Date() } });
      else console.log('  MATCH', r.name, '->', img.split('/').pop());
    } else {
      misses.push(`${r.sku} ${r.name}`);
    }
  }
  console.log(`\n${apply ? 'APPLIED' : 'DRY-RUN'} — matched ${matched}/${rows.length}`);
  if (misses.length && !apply) console.log('Unmatched (no scraped image for that number):\n  ' + misses.slice(0, 40).join('\n  '));
  process.exit(0);
})().catch(e => { console.error('error', e.message); process.exit(1); });
