// prod-add-new-products.js — Run on production server via mongosh
// Usage: mongosh dbc prod-add-new-products.js
//
// Adds Power's new stock items from Back Store Room that aren't on production yet.
// Also sets mdcStage on all existing products.

const newProducts = [
  // SILVERBACK PRE-ROLLS (9)
  { name: 'Silverback Marshmallow', sku: 'SB-MARSHMALLOW', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Silverback Space Jam', sku: 'SB-SPACE-JAM', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Silverback King Juice', sku: 'SB-KING-JUICE', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Silverback Harry Potter', sku: 'SB-HARRY-POTTER', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Silverback OG Kush', sku: 'SB-OG-KUSH', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Silverback Skittles', sku: 'SB-SKITTLES', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Silverback Gorilla Skittles', sku: 'SB-GORILLA-SKITTLES', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Silverback Blockers Hydro', sku: 'SB-BLOCKERS-HYDRO', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Silverback Yum Yum', sku: 'SB-YUM-YUM', price: 80, category: 'flower', track: 'lifestyle' },

  // JUST BLAZE NEW VARIANTS (3)
  { name: 'Just Blaze Beetle Juice', sku: 'JB-BEETLE-JUICE', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Blaze Royale Indica', sku: 'JB-BLAZE-ROYALE-IND', price: 800, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Blaze Royale Sativa', sku: 'JB-BLAZE-ROYALE-SAT', price: 800, category: 'flower', track: 'lifestyle' },

  // PRE-ROLLS (1)
  { name: 'Moonsticks Greendoor', sku: 'MOONSTICKS-GD', price: 80, category: 'flower', track: 'lifestyle' },

  // PRE-PACKS 5g (2)
  { name: 'Le Chron (5g)', sku: 'PP-LE-CHRON-5G', price: 300, category: 'flower', track: 'lifestyle' },
  { name: 'Original Blitz (5g)', sku: 'PP-ORIGINAL-BLITZ-5G', price: 300, category: 'flower', track: 'lifestyle' },

  // THC/CBD (6)
  { name: 'THC Fizz', sku: 'THC-FIZZ', price: 80, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Cannabis Spray', sku: 'CANNABIS-SPRAY', price: 200, category: 'lifestyle-cbd', track: 'medical' },
  { name: 'Tongkat Ali', sku: 'TONGKAT-ALI', price: 300, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Clit-Oh-Max', sku: 'CLIT-OH-MAX', price: 200, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Hair Oil', sku: 'HAIR-OIL', price: 150, category: 'topicals', track: 'lifestyle' },
  { name: 'Bath Salts', sku: 'BATH-SALTS', price: 150, category: 'topicals', track: 'lifestyle' },

  // ACCESSORIES (23)
  { name: 'Dab Rig Small', sku: 'ACC-DAB-RIG-SM', price: 350, category: 'accessories', track: 'lifestyle' },
  { name: 'Ashtray', sku: 'ACC-ASHTRAY', price: 80, category: 'accessories', track: 'lifestyle' },
  { name: 'Steel Ashtray', sku: 'ACC-STEEL-ASHTRAY', price: 120, category: 'accessories', track: 'lifestyle' },
  { name: 'Pay Pay Blades', sku: 'ACC-PAYPAY-BLADES', price: 40, category: 'accessories', track: 'lifestyle' },
  { name: 'Blue Torch', sku: 'ACC-BLUE-TORCH', price: 150, category: 'accessories', track: 'lifestyle' },
  { name: 'Elements Papers', sku: 'ACC-ELEMENTS', price: 30, category: 'accessories', track: 'lifestyle' },
  { name: 'Raw Blades', sku: 'ACC-RAW-BLADES', price: 40, category: 'accessories', track: 'lifestyle' },
  { name: 'Blazy Susan Papers', sku: 'ACC-BLAZY-SUSAN', price: 50, category: 'accessories', track: 'lifestyle' },
  { name: 'OCB Black Papers', sku: 'ACC-OCB-BLACK', price: 30, category: 'accessories', track: 'lifestyle' },
  { name: 'OCB Brown Papers', sku: 'ACC-OCB-BROWN', price: 30, category: 'accessories', track: 'lifestyle' },
  { name: 'Mr Joint Set Small', sku: 'ACC-MRJOINT-SM', price: 150, category: 'accessories', track: 'lifestyle' },
  { name: 'Mr Joint Set Medium', sku: 'ACC-MRJOINT-MD', price: 200, category: 'accessories', track: 'lifestyle' },
  { name: 'Mr Joint Set Big', sku: 'ACC-MRJOINT-LG', price: 250, category: 'accessories', track: 'lifestyle' },
  { name: 'Tray Set', sku: 'ACC-TRAY-SET', price: 200, category: 'accessories', track: 'lifestyle' },
  { name: 'Normal Lighter', sku: 'ACC-LIGHTER-NORM', price: 15, category: 'accessories', track: 'lifestyle' },
  { name: 'Clipper Lighter', sku: 'ACC-CLIPPER', price: 50, category: 'accessories', track: 'lifestyle' },
  { name: 'Wood Pipe', sku: 'ACC-WOOD-PIPE', price: 100, category: 'accessories', track: 'lifestyle' },
  { name: 'Top Puff', sku: 'ACC-TOP-PUFF', price: 150, category: 'accessories', track: 'lifestyle' },
  { name: 'Large Tray', sku: 'ACC-TRAY-LG', price: 150, category: 'accessories', track: 'lifestyle' },
  { name: 'Big Tray Set', sku: 'ACC-TRAY-SET-BIG', price: 250, category: 'accessories', track: 'lifestyle' },
  { name: 'Small Tray Set', sku: 'ACC-TRAY-SET-SM', price: 120, category: 'accessories', track: 'lifestyle' },
  { name: 'Small Tray', sku: 'ACC-TRAY-SM', price: 80, category: 'accessories', track: 'lifestyle' },
  { name: 'Medium Tray', sku: 'ACC-TRAY-MD', price: 120, category: 'accessories', track: 'lifestyle' },
];

// Step 1: Set mdcStage on existing products that don't have it
print('--- Setting mdcStage on existing products ---');
const activeResult = db.products.updateMany(
  { status: 'active', mdcStage: { $exists: false } },
  { $set: { mdcStage: 'live' } }
);
print('Active products set to live: ' + activeResult.modifiedCount);

const draftResult = db.products.updateMany(
  { status: { $ne: 'active' }, mdcStage: { $exists: false } },
  { $set: { mdcStage: 'pending' } }
);
print('Non-active products set to pending: ' + draftResult.modifiedCount);

// Step 2: Insert new products
print('\n--- Adding new products ---');
let inserted = 0;
let skipped = 0;

for (const p of newProducts) {
  const exists = db.products.findOne({ sku: p.sku });
  if (exists) {
    print('  SKIP (exists): ' + p.name + ' [' + p.sku + ']');
    skipped++;
    continue;
  }

  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const now = new Date();

  try {
    db.products.insertOne({
      name: p.name,
      sku: p.sku,
      slug: slug,
      price: p.price,
      category: p.category,
      track: p.track,
      description: p.name,
      status: 'draft',
      isPublished: false,
      mdcStage: 'pending',
      inventory: {
        quantity: 0,
        reserved: 0,
        lowStockThreshold: 10,
        trackQuantity: true,
        allowBackorder: false
      },
      createdAt: now,
      updatedAt: now
    });
    print('  ADDED: ' + p.name + ' [' + p.sku + ']');
    inserted++;
  } catch (e) {
    // Try with suffix if slug collision
    try {
      const suffix = '-' + Math.random().toString(36).substring(2, 6);
      db.products.insertOne({
        name: p.name,
        sku: p.sku,
        slug: slug + suffix,
        price: p.price,
        category: p.category,
        track: p.track,
        description: p.name,
        status: 'draft',
        isPublished: false,
        mdcStage: 'pending',
        inventory: {
          quantity: 0,
          reserved: 0,
          lowStockThreshold: 10,
          trackQuantity: true,
          allowBackorder: false
        },
        createdAt: now,
        updatedAt: now
      });
      print('  ADDED (slug fix): ' + p.name + ' [' + p.sku + ']');
      inserted++;
    } catch (e2) {
      print('  ERROR: ' + p.name + ' - ' + e2.message);
    }
  }
}

const total = db.products.countDocuments();
print('\n=== COMPLETE ===');
print('Inserted: ' + inserted);
print('Skipped: ' + skipped);
print('Total products now: ' + total);
