// update-real-stock.js — Power's REAL stock from separation sheet
// Rule: Separation sheet = physical count = source of truth
//       POS SOH / 2 only for items NOT on separation sheet
// Krush/Skitz identical in both sheets = count ONCE
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./backend/modules/database/models/Product');

// Power's stock from separation: Office + Back Store (summed where in both rooms)
// Krush/Skitz identical in both sheets → counted ONCE (not doubled)
// Moonsticks identical in both sheets → counted ONCE
const powerStock = {
  // === GREENDOOR === (Office + Back where applicable)
  '611': Math.round(1013 + 449.5),      // Jungle Diamond: Off 1013 + Back 449.5
  '655': Math.round(660 + 300),          // Cheese: Off 660 + Back 300
  '7': Math.round(943 + 274),            // Alien Cookies: Off 943 + Back 274
  '870': 890,                             // Divine Storm: Off 890 only
  '315': Math.round(490 + 57.5),         // Gary Payton: Off 490 + Back 57.5
  '684': 110,                             // Gorilla Zkittles: Back 109.5
  '680': 178,                             // Beach Wedding: Back 178
  '318': 215,                             // Black Cherry Punch: Back 215
  '775': 75,                              // Super Cheese: Back 75
  '429': 20,                              // Durban Sky: Back 20
  '972': 261,                             // Strawberry Lemonade: Back 261

  // === INDOOR === (Office + Back where applicable)
  '720': Math.round(178 + 163.5),        // K-Snow: Off 178 + Back 163.5
  '719': Math.round(216 + 256.5),        // Zoap: Off 216 + Back 256.5
  '572': Math.round(835 + 36.5),         // Purple Peanut Butter: Off 835 + Back 36.5
  '86': Math.round(750 + 47),            // Pitbull: Off 750 + Back 47
  '710': 42,                              // Face On Fire: Back 42
  '711': 118,                             // Ice Queen: Back 118
  '708': 89,                              // Frozen Peach: Back 88.5
  '709': 85,                              // Blue Pava: Back 85
  '357': Math.round(312.5 + 721 + 164.5), // Block Berry: Indoor Back 312.5 + Pops Off 721 + Pops Back 164.5
  '683': 456,                             // Pink Runtz: Back 456
  '687': 41,                              // Kings Truck: Back 40.5
  '644': 42,                              // Bakers: Back 41.5
  '1002': 216,                            // Ice Cream Cake: Back 216

  // Office-only indoor items (no back store entry)
  // These map via dupMap below

  // === KRUSH/SKITZ === (IDENTICAL in both sheets — count ONCE)
  // These are bulk products stored in one location, listed on both sheets
  '71': 750,                              // MJ Roll Mix: 750
  '83': 1098,                             // Gold Roll Mix: 1098

  // === POPS === (Office + Back — added to indoor qty for same POS SKU)
  // Dante's Inferno: Off 747.5 + Back 156.5 = 904 (tracked via dupMap DANTE-S-INFERNO)
  // Block Berry pops: Off 721 + Back 164.5 = 885.5 (added to indoor '357' above)

  // === PRE-ROLLS MADE BY MJ ===
  // Gold Rolls: Off 500 + Back 1000 = 1500 (different qtys = genuine)
  // Moonsticks: 36 in both (identical = count once)
  // MJ's: Off 1500 only
  '966': 36,                              // Moonsticks/Moon Stick G.D

  // === PRE-ROLLS FROM RYAN ===
  '198': 157,                             // Honeymoon
  '81': 95,                               // Honey Combs

  // === PRE-ROLLS FROM SYNERGY ===
  '694': 12,                              // Church Pre-Rolls
  '55': 12,                               // Apple Jax
  '695': 7,                               // Watermelon Runtz
  '53': 7,                                // Premium Blend
  '495': 7,                               // Gold Leaf

  // === JUST BLAZE === (Back store quantities)
  '717': 7,                               // Santas Stash
  '718': 47,                              // Happy Holidays
  '689': 37,                              // Tropical Pineapple
  '541': 3,                               // The Baddie
  '671': 25,                              // Blue Cheese
  '693': 29,                              // Sour Diesel
  '852': 4,                               // Drips
  '692': 29,                              // Green Cream
  '451': 2,                               // Wednesday Adams
  '614': Math.round(7 + 6),              // Blaze Royale (Indica 7 + Sativa 6)
  '691': 0,                               // Block Berry JB (not on separation separately)
  '1': 0,                                 // Banana Java (not on separation)

  // === DAB/CONCENTRATES === (Back store)
  '836': 13,                              // Budder
  '189': 18,                              // Crumble
  '875': 6,                               // Bud-Crum Combo
  '313': 6,                               // Wax Bad
  '858': 471,                             // Kief/Hashisha (Krush section, count once)

  // === THC/CBD/TOPICALS === (Back store)
  '165': 21,                              // THC Cream / MJ Cream
  '437': 3,                               // CBD Pastilles
  '436': 10,                              // Wave Hydration Drinks
  '821': 17,                              // Hairfood Small (125ml)
  '822': 19,                              // Hairfood Big (250ml)
  '466': 10,                              // Super Bunny Women
  '457': 12,                              // CBD Erect
  '458': 15,                              // CBD Arouse
  '223': 12,                              // Perfect Joint (sng) — back store

  // === VAPES === (Back store)
  '112': 37,                              // 1ml Carts
  '608': 9,                               // Game Changer
  '118': 6,                               // Disposable Vapes
  '216': 19,                              // Rossen Carts
  '343': 2,                               // C Cell Battery

  // === PRE-PACKS === (Back store)
  '238': 15,                              // JMO 5g
  '660': 6,                               // Block Berry 5g
  '485': 17,                              // Super Cheese 5g
  '658': 8,                               // Church 5g

  // === EDIBLES === (Back store)
  '380': 134,                             // Singles
  '381': 114,                             // Lollipops
  '912': 42,                              // Dope Rope

  // === NEW BACK STORE ITEMS === (Power's actual qty)
  'SB-MARSHMALLOW': 39,
  'SB-SPACE-JAM': 15,
  'SB-KING-JUICE': 18,
  'SB-HARRY-POTTER': 59,
  'SB-OG-KUSH': 59,
  'SB-SKITTLES': 55,
  'SB-GORILLA-SKITTLES': 35,
  'SB-BLOCKERS-HYDRO': 83,
  'SB-YUM-YUM': 8,
  'JB-BEETLE-JUICE': 2,
  'JB-BLAZE-ROYALE-IND': 7,
  'JB-BLAZE-ROYALE-SAT': 6,
  'MOONSTICKS-GD': 233,
  'PP-LE-CHRON-5G': 7,
  'PP-ORIGINAL-BLITZ-5G': 15,
  'THC-FIZZ': 9,
  'CANNABIS-SPRAY': 1,
  'TONGKAT-ALI': 10,
  'CLIT-OH-MAX': 13,
  'HAIR-OIL': 7,
  'BATH-SALTS': 2,
  'ACC-DAB-RIG-SM': 15,
  'ACC-ASHTRAY': 11,
  'ACC-STEEL-ASHTRAY': 4,
  'ACC-PAYPAY-BLADES': 2,
  'ACC-BLUE-TORCH': 2,
  'ACC-ELEMENTS': 60,
  'ACC-RAW-BLADES': 40,
  'ACC-BLAZY-SUSAN': 68,
  'ACC-OCB-BLACK': 18,
  'ACC-OCB-BROWN': 18,
  'ACC-MRJOINT-SM': 6,
  'ACC-MRJOINT-MD': 4,
  'ACC-MRJOINT-LG': 1,
  'ACC-TRAY-SET': 4,
  'ACC-LIGHTER-NORM': 1,
  'ACC-CLIPPER': 45,
  'ACC-WOOD-PIPE': 6,
  'ACC-TOP-PUFF': 3,
  'ACC-TRAY-LG': 1,
  'ACC-TRAY-SET-BIG': 1,
  'ACC-TRAY-SET-SM': 2,
  'ACC-TRAY-SM': 10,
  'ACC-TRAY-MD': 8,
};

// Items ONLY on POS (not on separation sheet) → use SOH / 2
const posOnlySOH = {
  '663': 93,       // Blue Zucci
  '85': 75,        // Moon Stick I.D
  '672': 37.51,    // Don Perinon
  '681': 67,       // Rainbow Sherbit I.D
  '682': 37.9,     // Rainbow Royale I.D
  '646': 50,       // Monster Zkittles
  '490': 5,        // Rainbow Runtz
  '538': 0,        // Pink Cookies
  '615': 89,       // Dynamic Threesome
  '612': 3,        // Banana Cake 5g
  '164': 4,        // Candy Dave 5g
  '657': 0,        // Gelato 5g
  '659': 4,        // White Runtz 5g
  '222': 1,        // Perfect Joint box
  // JB only on POS:
  '805': 4,        // Blue Dream
  '688': 22,       // California Black Rose
  '676': 2,        // Charlottes Web
  '597': 6,        // Cloud Muffin
  '674': 1,        // Darth Vader
  '598': 2,        // Frosted Apricot
  '662': 0,        // Gelato
  '645': 3,        // Haunted Harvest
  '968': 1,        // Jedi Diesel
  '578': 4,        // Petal Puffs
  '634': 0,        // Plat Gorilla
  '664': 10,       // Purple Rush
  '24': 0,         // Sherbit
  '234': 1,        // Space Jam (JB)
  '690': 5,        // Sugar High
  // Edibles only on POS:
  '455': 21,       // 420 Magic
  '489': 2,        // Bang Bar
  '93': 8,         // Blazed Blocks
  '100': 8,        // Buzz Pops
  '594': 13,       // Candy Cartel
  '104': 11,       // Cookies 90mg
  '102': 7,        // Fab Fudge
  '595': 12,       // Forbidden Fruit
  '98': 4,         // Fruit Pastelles
  '109': 11,       // Gummies Bears
  '573': 7,        // Heart Stopper 200mg
  '331': 13,       // Heart Stopper 400mg
  '94': 12,        // Loaded Leaf
  '246': 6,        // Medibles
  '188': 21,       // OG Gummies 150mg
  '92': 13,        // OG Gummies 330mg
  '97': 12,        // Rainbow Strips
  '96': 8,         // Red Ropes
  '99': 10,        // Toffees
  '110': 12,       // Wacky Worms
  // CBD/Lifestyle only on POS:
  '150': 5,        // Ashwaganda Lifted
  '459': 4,        // CBD Bunny Men
  '491': 1,        // Coffee Latte
  '716': 0,        // Cordyceps
  '301': 5,        // Dope Grapefruit
  '302': 1,        // Dope Pineapple
  '303': 2,        // Dope Watermelon
  '349': 4,        // Fruity CBD Gummies
  '330': 13,       // Lucky Club Juice
  '411': 15,       // Sodaze
  '304': 31,       // Water
  '113': 2,        // Batteries
  // Topicals only on POS:
  '134': 7,        // 20ml THC Oil Drops
  '480': 3,        // Herbal Pain Balm
};

// Duplicate SKU → mapped value (either primary SKU string or direct qty number)
const dupMap = {
  'GD-ALIEN-COOKIES': '7',
  'GD-BEACH-WEDDING': '680',
  'GD-STRAWBERRY-LEMONADE': '972',        // → powerStock 261 (separation)
  'IN-BLU-ZUCHI': '663',
  'IN-ICE-CREAM-CAKE': '1002',
  'IN-KING-TRUCK': '687',
  'GUMMY-BEARS-150MG': '109',
  'RED-ROPES-200MG': '96',
  'HONEYCOMB-PRE-ROLL': '81',
  'WAVE-HYDRATION-CBD': '436',
  'PERFECT-JOINT-SINGLE': '223',
  'GOLD-ROLLS': 1500,          // Off 500 + Back 1000
  'MOONSTICKS': '966',
  'MJ-PRE-ROLLS': 1500,        // MJ's: Off 1500
  'MJ-ROLL-MIX': '71',
  'JELL-O': 316,                // Back store 316
  'RAINBOW-ROYALE': '682',
  'RAINBOW-SHERBET': '681',
  'DANTE-S-INFERNO': 904,       // Off 747.5 + Back 156.5
  'EXCEL-CHEESE': 1000,         // Off 1000
  'PRIME-CHEESE': 189,          // Back 188.5
  'KIEF': '858',
  'WHITE-RUNTZ': 387,           // Off 387
  'QUEEN-OF-THE-SOUTH': 447,   // Off 447
  'MOCHI': 384,                 // Off 384
  'PITBULL-POPS': 1000,         // Off 1000
  'XL': Math.round(1000 + 397.5), // Off 1000 + Back 397.5
  'MJ-KRUSH': 813,              // Krush section, count once
  'GOLD-ROLL-FLOWER-MIX': 2000, // Krush section, count once
  'GOLD-ROLL-KRUSH': 1000,      // Krush section, count once
  'GOLD-ROLL-MIX': '83',
  'DBC-IND-BLACKBERRY': 0,
  'PRE-ROLLS-CONES': 0,
  'BLADES': 0,
  'ACC-PIPE-SPOON': 22,         // Glass Pipe: Back 22
  'ACC-JAR-500ML': 0,
  'ACC-PAPERS-KING': 0,
  'ACC-GRINDER-4PC': 0,
  'ACC-TRAY-METAL': 0,
  'ACC-VAPE-PORT': 0,
};

async function updateStock() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB:', uri);

  const products = await Product.find({});
  console.log('Total products:', products.length);

  let updated = 0;
  let noMatch = 0;
  let totalUnits = 0;

  for (const p of products) {
    let newQty = null;

    // 1. Direct match in separation-based powerStock
    if (powerStock.hasOwnProperty(p.sku)) {
      newQty = powerStock[p.sku];
    }
    // 2. POS-only items (not on separation) → SOH / 2
    else if (posOnlySOH.hasOwnProperty(p.sku)) {
      newQty = Math.round(posOnlySOH[p.sku] / 2);
    }
    // 3. Duplicate mapping
    else if (dupMap.hasOwnProperty(p.sku)) {
      const mapped = dupMap[p.sku];
      if (typeof mapped === 'number') {
        newQty = Math.round(mapped);
      } else if (powerStock.hasOwnProperty(mapped)) {
        newQty = powerStock[mapped];
      } else if (posOnlySOH.hasOwnProperty(mapped)) {
        newQty = Math.round(posOnlySOH[mapped] / 2);
      } else {
        newQty = 0;
      }
    }
    // 4. No match
    else {
      newQty = 0;
      noMatch++;
      console.log('  NO MATCH (set 0):', p.name, '[' + p.sku + ']');
    }

    await Product.updateOne(
      { _id: p._id },
      { $set: { 'inventory.quantity': newQty } }
    );
    totalUnits += newQty;
    updated++;
  }

  console.log('\n=== STOCK UPDATE COMPLETE ===');
  console.log('Updated:', updated);
  console.log('No match (set 0):', noMatch);
  console.log('Total units:', totalUnits);

  const summary = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 }, totalStock: { $sum: '$inventory.quantity' } } },
    { $sort: { _id: 1 } }
  ]);
  console.log('\nStock by category:');
  let grandTotal = 0;
  const gramCategories = ['flower', 'concentrates'];
  for (const s of summary) {
    const label = gramCategories.includes(s._id) ? 'grams' : 'units';
    console.log('  ' + s._id + ': ' + s.count + ' products, ' + s.totalStock + ' ' + label);
    grandTotal += s.totalStock;
  }
  console.log('  GRAND TOTAL: ' + grandTotal + ' (grams + units)');

  await mongoose.disconnect();
}

updateStock().catch(err => { console.error('Fatal:', err); process.exit(1); });
