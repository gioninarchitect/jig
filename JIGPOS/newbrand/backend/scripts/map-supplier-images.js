// Generic supplier image mapper. Matches DB products to a [{name,image}] list by normalised name.
// Usage: node map-supplier-images.js <images.json> <brandRegex> [--apply]
//   e.g. node map-supplier-images.js /tmp/lamelle_images.json lamelle --apply
const fs = require('fs');
const mongoose = require('mongoose');

const norm = (s) => String(s || '').toLowerCase()
  .replace(/['’®™.]/g, '')
  .replace(/iz/g, 'is')  // revitalizing -> revitalising (UK/US spelling)
  .replace(/\b\d+(\.\d+)?\s*(ml|g|mg|kg|caps|capsules|sachets|s)\b/g, ' ')  // drop sizes/units
  .replace(/[^a-z0-9]+/g, ' ').trim();

function score(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;
  // Jaccard token overlap — ranks the genuinely-closest name, avoids wrong sibling matches.
  const ta = new Set(a.split(' ').filter(Boolean));
  const tb = new Set(b.split(' ').filter(Boolean));
  const shared = [...tb].filter(t => ta.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  const j = union ? shared / union : 0;
  return j >= 0.6 ? Math.round(j * 60) : 0;  // max 60 < substring(80) < exact(100)
}

(async () => {
  const jsonPath = process.argv[2];
  const brandRx = new RegExp(process.argv[3], 'i');
  const apply = process.argv.includes('--apply');
  const imgs = JSON.parse(fs.readFileSync(jsonPath, 'utf8')).map(x => ({ name: x.name, image: x.image, n: norm(x.name) }));

  await mongoose.connect('mongodb://localhost:27017/origin');
  const col = mongoose.connection.db.collection('products');
  const rows = await col.find({ $or: [{ brand: brandRx }, { supplier: brandRx }] }).project({ name: 1, sku: 1, brand: 1, image: 1 }).toArray();
  console.log(`DB products for /${brandRx.source}/: ${rows.length} · scraped images: ${imgs.length}`);

  let matched = 0; const misses = [];
  for (const r of rows) {
    const dn = norm(r.name);
    let best = null, bestScore = 0;
    for (const im of imgs) {
      const sc = score(dn, im.n);
      if (sc > bestScore) { bestScore = sc; best = im; }
    }
    if (best && bestScore > 0) {
      matched++;
      if (apply) await col.updateOne({ _id: r._id }, { $set: { image: best.image, updatedAt: new Date() } });
      else console.log('  MATCH', r.name, '->', best.name);
    } else {
      misses.push(`${r.sku || ''} ${r.name}`);
      // Clear any previously-applied (possibly wrong) image so we never show a mismatched photo.
      if (apply && r.image) await col.updateOne({ _id: r._id }, { $unset: { image: '' } });
    }
  }
  console.log(`\n${apply ? 'APPLIED' : 'DRY-RUN'} — matched ${matched}/${rows.length}`);
  if (misses.length) console.log('Unmatched:\n  ' + misses.join('\n  '));
  process.exit(0);
})().catch(e => { console.error('error', e.message); process.exit(1); });
