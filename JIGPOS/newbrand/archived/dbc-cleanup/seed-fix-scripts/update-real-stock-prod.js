// update-real-stock-prod.js — Power's REAL stock from separation sheet
// Rule: Separation sheet = physical count = source of truth
//       POS SOH / 2 only for items NOT on separation sheet
//       Krush/Skitz identical in both sheets = count ONCE
// Run: mongosh dbc update-real-stock-prod.js

// Power's stock from separation: Office + Back Store (summed where in both rooms)
const powerStock = {
  // === GREENDOOR === (Office + Back)
  '611': 1463,    // Jungle Diamond: Off 1013 + Back 449.5
  '655': 960,     // Cheese: Off 660 + Back 300
  '7': 1217,      // Alien Cookies: Off 943 + Back 274
  '870': 890,     // Divine Storm: Off 890
  '315': 548,     // Gary Payton: Off 490 + Back 57.5
  '684': 110,     // Gorilla Zkittles: Back 109.5
  '680': 178,     // Beach Wedding: Back 178
  '318': 215,     // Black Cherry Punch: Back 215
  '775': 75,      // Super Cheese: Back 75
  '429': 20,      // Durban Sky: Back 20
  '972': 261,     // Strawberry Lemonade: Back 261

  // === INDOOR === (Office + Back)
  '720': 342,     // K-Snow: Off 178 + Back 163.5
  '719': 473,     // Zoap: Off 216 + Back 256.5
  '572': 872,     // Purple Peanut Butter: Off 835 + Back 36.5
  '86': 797,      // Pitbull: Off 750 + Back 47
  '710': 42,      // Face On Fire: Back 42
  '711': 118,     // Ice Queen: Back 118
  '708': 89,      // Frozen Peach: Back 88.5
  '709': 85,      // Blue Pava: Back 85
  '357': 1198,    // Block Berry: Indoor Back 312.5 + Pops Off 721 + Pops Back 164.5
  '683': 456,     // Pink Runtz: Back 456
  '687': 41,      // Kings Truck: Back 40.5
  '644': 42,      // Bakers: Back 41.5
  '1002': 216,    // Ice Cream Cake: Back 216

  // === KRUSH/SKITZ === (identical both sheets, count ONCE)
  '71': 750,      // MJ Roll Mix
  '83': 1098,     // Gold Roll Mix

  // === PRE-ROLLS ===
  '966': 36,      // Moonsticks (identical both sheets, count once)
  '198': 157,     // Honeymoon: Back 157
  '81': 95,       // Honey Combs: Back 95

  // === SYNERGY PRE-ROLLS === (Back)
  '694': 12,      // Church
  '55': 12,       // Apple Jax
  '695': 7,       // Watermelon Runtz
  '53': 7,        // Premium Blend
  '495': 7,       // Gold Leaf

  // === JUST BLAZE === (Back)
  '717': 7,       // Santas Stash
  '718': 47,      // Happy Holidays
  '689': 37,      // Tropical Pineapple
  '541': 3,       // The Baddie
  '671': 25,      // Blue Cheese
  '693': 29,      // Sour Diesel
  '852': 4,       // Drips
  '692': 29,      // Green Cream
  '451': 2,       // Wednesday Adams
  '614': 13,      // Blaze Royale: Indica 7 + Sativa 6
  '691': 0,       // Block Berry JB (not on separation)
  '1': 0,         // Banana Java (not on separation)

  // === DAB/CONCENTRATES === (Back)
  '836': 13,      // Budder
  '189': 18,      // Crumble
  '875': 6,       // Bud-Crum Combo
  '313': 6,       // Wax
  '858': 471,     // Kief (Krush section, count once)

  // === THC/CBD/TOPICALS === (Back)
  '165': 21,      // THC Cream
  '437': 3,       // CBD Pastilles
  '436': 10,      // Wave Hydration Drinks
  '821': 17,      // Hairfood Small (125ml)
  '822': 19,      // Hairfood Big (250ml)
  '466': 10,      // Super Bunny Women
  '457': 12,      // CBD Erect
  '458': 15,      // CBD Arouse
  '223': 12,      // Perfect Joint (sng)

  // === VAPES === (Back)
  '112': 37,      // 1ml Carts
  '608': 9,       // Game Changer
  '118': 6,       // Disposable Vapes
  '216': 19,      // Rossen Carts
  '343': 2,       // C Cell Battery

  // === PRE-PACKS === (Back)
  '238': 15,      // JMO 5g
  '660': 6,       // Block Berry 5g
  '485': 17,      // Super Cheese 5g
  '658': 8,       // Church 5g

  // === EDIBLES === (Back)
  '380': 134,     // Singles
  '381': 114,     // Lollipops
  '912': 42,      // Dope Rope

  // === NEW BACK STORE ITEMS === (Power's actual qty)
  'SB-MARSHMALLOW': 39, 'SB-SPACE-JAM': 15, 'SB-KING-JUICE': 18,
  'SB-HARRY-POTTER': 59, 'SB-OG-KUSH': 59, 'SB-SKITTLES': 55,
  'SB-GORILLA-SKITTLES': 35, 'SB-BLOCKERS-HYDRO': 83, 'SB-YUM-YUM': 8,
  'JB-BEETLE-JUICE': 2, 'JB-BLAZE-ROYALE-IND': 7, 'JB-BLAZE-ROYALE-SAT': 6,
  'MOONSTICKS-GD': 233, 'PP-LE-CHRON-5G': 7, 'PP-ORIGINAL-BLITZ-5G': 15,
  'THC-FIZZ': 9, 'CANNABIS-SPRAY': 1, 'TONGKAT-ALI': 10,
  'CLIT-OH-MAX': 13, 'HAIR-OIL': 7, 'BATH-SALTS': 2,
  'ACC-DAB-RIG-SM': 15, 'ACC-ASHTRAY': 11, 'ACC-STEEL-ASHTRAY': 4,
  'ACC-PAYPAY-BLADES': 2, 'ACC-BLUE-TORCH': 2, 'ACC-ELEMENTS': 60,
  'ACC-RAW-BLADES': 40, 'ACC-BLAZY-SUSAN': 68, 'ACC-OCB-BLACK': 18,
  'ACC-OCB-BROWN': 18, 'ACC-MRJOINT-SM': 6, 'ACC-MRJOINT-MD': 4,
  'ACC-MRJOINT-LG': 1, 'ACC-TRAY-SET': 4, 'ACC-LIGHTER-NORM': 1,
  'ACC-CLIPPER': 45, 'ACC-WOOD-PIPE': 6, 'ACC-TOP-PUFF': 3,
  'ACC-TRAY-LG': 1, 'ACC-TRAY-SET-BIG': 1, 'ACC-TRAY-SET-SM': 2,
  'ACC-TRAY-SM': 10, 'ACC-TRAY-MD': 8
};

// Items ONLY on POS (not on separation sheet) → use SOH / 2
const posOnlySOH = {
  '663': 93, '85': 75, '672': 37.51, '681': 67, '682': 37.9,
  '646': 50, '490': 5, '538': 0, '615': 89, '612': 3,
  '164': 4, '657': 0, '659': 4, '222': 1,
  // JB only on POS:
  '805': 4, '688': 22, '676': 2, '597': 6, '674': 1,
  '598': 2, '662': 0, '645': 3, '968': 1, '578': 4,
  '634': 0, '664': 10, '24': 0, '234': 1, '690': 5,
  // Edibles only on POS:
  '455': 21, '489': 2, '93': 8, '100': 8, '594': 13,
  '104': 11, '102': 7, '595': 12, '98': 4, '109': 11,
  '573': 7, '331': 13, '94': 12, '246': 6, '188': 21,
  '92': 13, '97': 12, '96': 8, '99': 10, '110': 12,
  // CBD/Lifestyle only on POS:
  '150': 5, '459': 4, '491': 1, '716': 0, '301': 5,
  '302': 1, '303': 2, '349': 4, '330': 13, '411': 15,
  '304': 31, '113': 2,
  // Topicals only on POS:
  '134': 7, '480': 3
};

// Duplicate SKU → mapped value (string = lookup in powerStock/posOnlySOH, number = direct qty)
const dupMap = {
  'GD-ALIEN-COOKIES': '7',
  'GD-BEACH-WEDDING': '680',
  'GD-STRAWBERRY-LEMONADE': '972',
  'IN-BLU-ZUCHI': '663',
  'IN-ICE-CREAM-CAKE': '1002',
  'IN-KING-TRUCK': '687',
  'GUMMY-BEARS-150MG': '109',
  'RED-ROPES-200MG': '96',
  'HONEYCOMB-PRE-ROLL': '81',
  'WAVE-HYDRATION-CBD': '436',
  'PERFECT-JOINT-SINGLE': '223',
  'GOLD-ROLLS': 1500,
  'MOONSTICKS': '966',
  'MJ-PRE-ROLLS': 1500,
  'MJ-ROLL-MIX': '71',
  'JELL-O': 316,
  'RAINBOW-ROYALE': '682',
  'RAINBOW-SHERBET': '681',
  'DANTE-S-INFERNO': 904,
  'EXCEL-CHEESE': 1000,
  'PRIME-CHEESE': 189,
  'KIEF': '858',
  'WHITE-RUNTZ': 387,
  'QUEEN-OF-THE-SOUTH': 447,
  'MOCHI': 384,
  'PITBULL-POPS': 1000,
  'XL': 1398,
  'MJ-KRUSH': 813,
  'GOLD-ROLL-FLOWER-MIX': 2000,
  'GOLD-ROLL-KRUSH': 1000,
  'GOLD-ROLL-MIX': '83',
  'DBC-IND-BLACKBERRY': 0,
  'PRE-ROLLS-CONES': 0,
  'BLADES': 0,
  'ACC-PIPE-SPOON': 22,
  'ACC-JAR-500ML': 0,
  'ACC-PAPERS-KING': 0,
  'ACC-GRINDER-4PC': 0,
  'ACC-TRAY-METAL': 0,
  'ACC-VAPE-PORT': 0
};

print('=== UPDATING STOCK — SEPARATION SHEET VALUES ===');
print('Separation = source of truth. POS SOH/2 only for non-separation items.');
print('');

const cursor = db.products.find({});
let updated = 0;
let noMatch = 0;
let totalUnits = 0;

while (cursor.hasNext()) {
  const p = cursor.next();
  const sku = p.sku;
  let newQty = null;

  // 1. Direct match in separation-based powerStock
  if (powerStock.hasOwnProperty(sku)) {
    newQty = powerStock[sku];
  }
  // 2. POS-only items → SOH / 2
  else if (posOnlySOH.hasOwnProperty(sku)) {
    newQty = Math.round(posOnlySOH[sku] / 2);
  }
  // 3. Duplicate mapping
  else if (dupMap.hasOwnProperty(sku)) {
    const mapped = dupMap[sku];
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
    print('  NO MATCH (set 0): ' + p.name + ' [' + sku + ']');
  }

  db.products.updateOne(
    { _id: p._id },
    { $set: { 'inventory.quantity': newQty } }
  );
  totalUnits += newQty;
  updated++;
}

print('');
print('=== STOCK UPDATE COMPLETE ===');
print('Updated: ' + updated);
print('No match (set 0): ' + noMatch);
print('Total units: ' + totalUnits);

const summary = db.products.aggregate([
  { $group: { _id: '$category', count: { $sum: 1 }, stock: { $sum: '$inventory.quantity' } } },
  { $sort: { _id: 1 } }
]).toArray();
print('\nStock by category:');
const gramCats = ['flower', 'concentrates'];
summary.forEach(s => {
  const label = gramCats.indexOf(s._id) >= 0 ? 'grams' : 'units';
  print('  ' + s._id + ': ' + s.count + ' products, ' + s.stock + ' ' + label);
});
