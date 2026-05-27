#!/usr/bin/env node
/**
 * Load Branch Stock — All 8 DBC Branches
 * Source: Stock Take PDFs (Odyssey Software POS) — January 2026
 *
 * What it does:
 *   1. Creates/finds 8 Branch records
 *   2. Matches PRODUCT CODE → Product.sku
 *   3. Creates/updates BranchInventory: quantity = SOH (clamped >= 0)
 *   4. Updates Product.inventory.quantity = SUM of all branch quantities
 *
 * Usage:
 *   node load-branch-stock.js              — Run for real (local dev, port 3002)
 *   node load-branch-stock.js --dry-run    — Preview only, no DB writes
 */

const mongoose = require('mongoose');
const path = require('path');

// Load env from newbrand/.env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Product = require('./backend/modules/database/models/Product');
const BranchInventory = require('./backend/modules/database/models/BranchInventory');
const Branch = require('./backend/modules/database/models/Branch');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';
const DRY_RUN = process.argv.includes('--dry-run');
const CLEAR_FIRST = process.argv.includes('--clear');
const VERIFY_ONLY = process.argv.includes('--verify');

// ============================================================================
// BRANCH DEFINITIONS
// ============================================================================
const branchDefs = [
  { code: 'DBC-ORM', name: 'PureGro Ormonde',    city: 'Johannesburg', province: 'Gauteng',    phone: '000-000-0000', type: 'retail' },
  { code: 'DBC-FBG', name: 'DBC Ficksburg',   city: 'Ficksburg',    province: 'Free State',  phone: '000-000-0001', type: 'retail' },
  { code: 'DBC-KDP', name: 'DBC Klerksdorp',  city: 'Klerksdorp',   province: 'North West',  phone: '000-000-0002', type: 'retail' },
  { code: 'DBC-MYF', name: 'DBC Mayfair',     city: 'Johannesburg', province: 'Gauteng',    phone: '000-000-0003', type: 'retail' },
  { code: 'DBC-LDB', name: 'DBC Ladybrand',   city: 'Ladybrand',    province: 'Free State',  phone: '000-000-0004', type: 'retail' },
  { code: 'DBC-RSB', name: 'DBC Rustenburg',  city: 'Rustenburg',   province: 'North West',  phone: '000-000-0005', type: 'retail' },
  { code: 'DBC-SPV', name: 'DBC Spruitview',  city: 'Johannesburg', province: 'Gauteng',    phone: '000-000-0006', type: 'retail' },
  { code: 'DBC-WBM', name: 'DBC Wonderboom',  city: 'Pretoria',     province: 'Gauteng',    phone: '000-000-0007', type: 'retail' },
];

// ============================================================================
// STOCK DATA: { branchCode: { sku: soh, ... } }
// Extracted from Stock Take PDFs — PRODUCT CODE → SOH column
// Negative SOH values will be clamped to 0 at insert time
// ============================================================================

// ============================================================================
// STOCK DATA — Re-extracted from PDFs on 11 Feb 2026
// Source: "DBC stock/" folder — 8 Stock Take PDFs, SOH column (rightmost)
// Format: { branchCode: { posProductCode: sohValue, ... } }
// Negative SOH = clamped to 0 at insert time
// ============================================================================
const stockData = {

  // ── ORMONDE DBC ── 135 items, 30/01/2026 ──────────────────────────────────
  'DBC-ORM': {
    '1':0,'614':2,'691':10,'671':25,'805':1,'688':21,'676':2,'597':4,'674':1,'852':7,
    '598':2,'662':0,'692':18,'718':19,'645':3,'968':1,'578':4,'634':0,'664':7,'717':4,
    '24':0,'693':11,'234':0,'690':3,'541':0,'689':33,'451':21,
    '112':8,'134':6,'455':19,'7':78.36,'55':1,'150':5,'644':157.26,'612':3,'489':2,'113':2,
    '680':136.87,'318':169.79,'93':8,'357':78.26,'660':3,'709':92.8,'663':81,'875':7,'836':6,'100':7,
    '343':3,'594':7,'164':4,'458':4,'459':4,'457':2,'466':3,'655':91.98,'491':1,'104':7,
    '716':0,'189':8,'118':208,'216':4,'870':48.32,'672':35.51,'301':5,'302':1,'912':8,'303':2,
    '429':-14,'615':68,'102':6,'710':67.2,'595':7,'708':94.52,'98':4,'349':4,'608':3,'315':240,
    '657':0,'495':1,'83':111,'684':112.55,'109':8,'821':7,'822':4,'858':5,'573':7,'331':12,
    '480':3,'198':22,'81':54,'1002':96.57,'711':87,'238':3,'611':198.18,'720':162.36,'687':73.8,'94':11,
    '381':12,'330':8,'246':6,'165':5,'71':11,'646':46,'966':66,'85':34,'188':13,'92':13,
    '437':5,'222':1,'223':10,'538':0,'683':84.2,'86':65.39,'53':6,'572':52.7,'682':29.9,'490':5,
    '681':67,'97':12,'96':8,'380':43,'411':12,'972':130.58,'775':442.19,'485':3,'658':2,'694':3,
    '99':9,'110':11,'304':26,'695':0,'436':2,'313':5,'659':3,'719':137
  },

  // ── FICKSBURG DBC ── 84 items, 23/01/2026 ─────────────────────────────────
  'DBC-FBG': {
    '203':0,'614':2,'852':0,'667':0,'668':0,'634':2,'541':0,'543':0,'689':1,'112':2,
    '134':1,'559':39,'7':109,'612':0,'489':2,'113':5,'475':0,'438':1,'318':0,'120':0,
    '245':0,'93':0,'357':25,'660':0,'620':0,'875':2,'836':3,'100':0,'111':0,'345':2,
    '205':0,'276':0,'104':0,
    '189':3,'118':1,'216':5,'429':694,'615':11,'102':2,'349':0,'98':0,'608':4,'315':22,
    '563':26,'83':414,'684':27,'916':-8,'109':0,'198':1,'129':1,'562':138,'896':36,'631':92,
    '239':1,'871':33,'611':93,'702':3,'275':1,'246':5,'247':0,'71':100,
    '966':13,'85':10,'188':0,'92':2,'437':5,'538':22,'683':3,'86':97,'412':63,'678':-1,
    '705':3,'682':43,'681':23,'97':1,'204':-9,'96':2,'202':-14,'1004':3,'380':0,'972':51,
    '775':613,'658':8,'99':0,'66':4,'906':0,'110':0,'88':87
  },

  // ── KLERKSDORP DBC ── 100 items, 28/01/2026 ───────────────────────────────
  'DBC-KDP': {
    '575':3,'603':3,'691':5,'671':0,'805':12,'565':0,'677':0,'599':1,'688':10,'597':12,
    '674':3,'852':3,'598':6,'662':0,'692':10,'661':3,'564':0,'566':0,'673':0,'234':0,
    '606':0,'669':0,'690':0,'689':8,'112':6,'680':108.21,'318':13.75,
    '54':0,'93':0,'307':0,'620':8.38,'663':36,'875':3,'836':3,'100':0,'27':0,'594':26.1,
    '655':58.08,'34':0,'189':3,'118':5,'870':86.55,'672':28.26,'912':0,'429':34.81,'615':7,'708':39.89,
    '98':0,'30':0,'315':242.05,'657':0,'579':11.91,'83':15,'581':6.78,'493':11.35,'924':0,'916':25.99,
    '62':0,'477':4,'821':5,'822':5,'198':4,'81':31,'978':10.9,'1002':24.1,'711':29.45,'631':103.71,
    '611':100.62,'580':31.84,'472':8.68,'687':44.04,'94':0,'64':0,'596':32.9,'71':58,'966':0,'85':10,
    '300':8.15,'188':0,'92':0,'538':35.91,'683':36.19,'86':20.81,'53':0,'572':42.25,'678':11.08,'33':0,
    '97':0,'582':20.99,'492':0,'972':46.74,'775':31.68,'485':0,'658':0,'864':44,'110':0,'63':0,
    '313':2,'659':0,'88':32.89
  },

  // ── MAYFAIR DBC ── 103 items, 28/01/2026 ──────────────────────────────────
  'DBC-MYF': {
    '575':0,'603':0,'614':4,'691':0,'677':0,'688':6,'597':0,'598':0,'662':0,'667':5,
    '661':0,'668':0,'675':0,'72':1,'634':0,'664':13,'693':5,'543':0,'689':12,'638':0,
    '641':0,'642':0,'112':6,'637':4,'134':2,'7':27.08,'55':9,
    '612':0,'113':2,'680':73.32,'318':35.13,'93':0,'357':32.56,'660':2,'620':0,'613':2,'663':0,
    '616':0,'875':8,'836':6,'100':0,'231':0,'107':2,'104':2,'236':0,'118':4,'216':1,
    '870':95.06,'295':0,'429':61,'615':23,'102':4,'98':0,'608':2,'315':31.74,'657':1,'495':9,
    '83':168,'493':0,'684':63.48,'916':0,'477':1,'821':2,'822':2,'198':0,'81':23,'1002':23.57,
    '237':0,'631':0,'611':27.66,'610':0,'94':0,'381':10,'330':3,'246':6,'165':5,'71':52,
    '966':24,'85':4,'471':0,'188':0,'92':0,'470':0,'538':0,'86':44,'53':3,'412':0,
    '572':0,'682':30.28,'681':17,'97':5,'96':5,'380':50,'411':4,'972':18.44,'775':102.57,'694':9,
    '99':3,'110':1,'695':8,'313':9,'659':1,'88':0
  },

  // ── LADYBRAND DBC ── 142 items, 21/01/2026 ────────────────────────────────
  'DBC-LDB': {
    '575':6,'603':0,'614':0,'671':3,'805':0,'676':0,'597':0,'674':0,'852':10,'598':0,
    '645':6,'661':0,'675':0,'564':0,'634':2,'566':0,'448':0,'670':0,'234':0,'606':0,
    '543':0,'689':9,'638':0,'641':0,'642':0,'112':9,'637':7,'134':3,
    '455':0,'148':0,'539':7,'224':0,'338':0,'612':4,'489':2,'113':2,'476':0,'475':0,
    '438':1,'318':0,'120':0,'245':0,'93':0,'357':47,'620':0,'836':0,'111':3,'100':10,
    '594':18,'164':5,'161':4,'260':0,'232':22,'474':0,'973':4,'205':0,'276':3,'104':13,
    '621':0,'74':2,'118':4,'216':0,'429':1.7,'615':17,'277':0,'413':0,'867':0,'98':8,
    '349':11,'30':0,'608':1,'315':98,'657':0,'579':0,'609':0,'16':173,'581':0,'483':0,
    '684':14,'916':0,'206':-7,'109':12,'821':2,'822':3,'331':4,'233':0,'978':0,'896':42,
    '890':0,'631':87,'239':1,'871':0,'244':0,'580':0,'472':0,'610':0,'80':0,'275':0,
    '246':1,'247':0,'165':5,'71':148,'646':26,'17':9,'248':0,'300':4.82,'188':0,'92':13,
    '473':0,'437':5,'222':0,'223':0,'482':0,'538':0,'683':0.57,'86':0,'412':0,'682':30,
    '204':6,'97':6,'77':2,'96':0,'202':0,'1004':2,'380':0,'76':1,'582':0,'411':4,
    '972':25,'775':-7,'485':1,'486':2,'658':0,'99':11,'186':1,'203':0,'110':0,'317':0,
    '436':2,'324':0,'659':0,'545':0,'88':4.8
  },

  // ── RUSTENBURG DBC ── 107 items, 28/01/2026 ───────────────────────────────
  'DBC-RSB': {
    '614':2,'691':-1,'671':-6,'805':0,'598':6,'662':0,'667':0,'692':7,'645':-1,'661':16,
    '634':0,'664':0,'693':3,'606':2,'690':0,'689':8,'112':30,'637':7,'134':1,'559':16.2,
    '7':6.3,'55':1,'171':2.26,'214':2.91,'113':8,'475':1,'93':0,
    '357':57.08,'567':0,'620':140.22,'306':2.04,'709':100,'663':22.4,'100':0,'343':2,'594':17.34,'164':1,
    '466':1,'655':43.7,'474':20.4,'308':26.05,'104':4,'118':7,'870':35,'672':18.45,'295':0,'429':135.4,
    '615':12,'102':0,'710':100,'708':100,'315':18.06,'571':8.79,'579':0,'609':250,'495':4,'83':255,
    '581':0,'493':0,'684':25,'916':0,'821':2,'822':0,'81':19,'978':7.29,'1002':80.07,'711':100,
    '896':6.8,'631':7.3,'871':0,'611':56.7,'580':25.08,'472':19.41,'610':0,'195':30.25,'544':0,'596':11.4,
    '165':2,'71':237,'966':29,'85':2,'300':10,'188':0,'92':0,'473':0,'222':0,'223':-9,
    '538':15.54,'683':13.75,'86':52.91,'53':1,'412':26.02,'572':35.07,'682':72.77,'681':57.39,'97':-1,'96':1,
    '380':0,'582':0,'972':110.2,'775':22.9,'694':-1,'186':-2,'110':0,'695':4,'545':0,'88':104.05
  },

  // ── SPRUITVIEW DBC ── 90 items, 30/01/2026 ────────────────────────────────
  'DBC-SPV': {
    '603':4,'614':2,'599':2,'597':8,'852':2,'635':6,'662':12,'667':1,'692':6,'577':2,
    '645':9,'661':7,'578':2,'634':0,'664':3,'448':1,'693':0,'234':39,'606':1,'451':3,
    '639':1,'112':1,'559':13,'455':7,'7':76.27,'644':126.82,'489':2,
    '113':2,'680':6,'620':7,'663':80.95,'103':1,'875':4,'836':4,'100':5,'497':1.18,'104':5,
    '189':4,'118':1,'216':2,'615':6,'98':13,'349':1,'608':2,'315':74.69,'579':43.11,'83':189,
    '821':2,'822':3,'858':5,'198':6,'81':14,'978':22.4,'1002':79.75,'896':45,'631':88.45,'472':71.6,
    '94':3,'381':6,'275':9,'330':4,'165':3,'71':151,'966':17,'85':13,'188':3,'92':15,
    '437':36,'465':4,'222':1,'223':6,'482':3.26,'86':29.9,'412':237.15,'572':22.95,'678':20.52,'490':10,
    '681':81.5,'411':9,'972':39.1,'540':7.3,'775':84.54,'99':5,'186':5,'906':0,'110':4,'304':17,
    '436':12,'313':3,'88':22.11
  },

  // ── WONDERBOOM DBC ── 127 items, 23/01/2026 ───────────────────────────────
  'DBC-WBM': {
    '614':1,'691':7,'805':8,'676':9,'597':12,'939':1,'852':1,'598':3,'662':0,'937':1,
    '542':1,'292':4,'668':9,'967':4,'675':5,'448':17,'932':2,'670':4,'606':2,'690':7,
    '689':7,'112':8,'135':2,'132':3,'133':5,'7':62.74,'442':1,
    '113':7,'476':6.18,'318':71.77,'357':43.66,'863':16.1,'709':40.64,'663':51.76,'891':1.17,'836':5,'100':1,
    '164':1,'497':4.34,'345':5,'276':4,'621':1.15,'189':7,'236':1,'70':47.73,'74':1,'400':27.43,
    '118':9,'216':6,'912':3,'295':45.66,'429':0.1,'615':7,'102':2,'98':0,'710':48.92,'608':1,
    '315':43.62,'979':27.56,'928':1.82,'609':4.92,'83':60,'581':3.67,'441':2,'109':1,'331':3,'233':2.27,
    '978':97.81,'1002':55.72,'631':34.84,'871':14.54,'244':6.32,'611':40.63,'472':37.61,'702':5,'195':41.72,'275':3,
    '246':1,'247':0,'165':8,'646':15.32,'966':18,'85':15,'248':2,'300':0,'92':0,'115':0,
    '363':26.32,'122':8.55,'473':88.52,'222':0,'223':0,'683':12.12,'4':26.75,'929':1.7,'53':2,'274':6.6,
    '701':5,'572':18.24,'705':4,'682':43.66,'316':15.5,'97':3,'364':3.63,'96':5,'1004':3,'922':3,
    '380':38,'553':1,'432':19.5,'582':22.39,'492':2,'137':0,'243':12.48,'775':42.17,'485':3,'956':5.79,
    '486':2,'955':8.54,'703':5,'99':0,'116':0,'494':2,'203':0,'110':0,'313':1,'6':44.19
  }
};

// ============================================================================
// POS CODE → FORMATTED SKU MAPPING
// Some products have formatted SKUs (e.g. IN-PITBULL) in the DB but are
// referenced by numeric PRODUCT CODEs in the POS stock takes.
// This map bridges numeric POS codes to their formatted DB SKUs.
// ============================================================================
const posCodeToSku = {
  '86':  'IN-PITBULL',             // Pitbull
  '315': 'GD-GARY-PEYTON',        // Gary Payton
  '318': 'GD-BLACK-CHERRY',       // Black Cherry Punch
  '572': 'IN-PURPLE-PB',          // Purple Peanut Butter
  '611': 'GD-JUNGLE-DIAMOND',     // Jungle Diamond
  '644': 'DBC-IND-BAKERS',        // Bakers
  '646': 'DBC-IND-MONSTER-ZK',    // Monster Zkittles
  '655': 'GD-CHEESE',             // Cheese
  '672': 'IN-DON-PERINON',        // Don Perinon
  '719': 'IN-ZOAP',               // Zoap
  '720': 'IN-K-SNOW',             // K-Snow
  '775': 'GD-SUPER-CHEESE',       // Super Cheese
  '870': 'GD-DIVINE-STORM',       // Divine Storm
  '412': 'PRIME-CHEESE',          // Prime Cheese
  '477': 'HAIR-OIL',              // Hair Oil
  '631': 'JELL-O',                // Jello-O
  '702': 'PP-LE-CHRON-5G',        // Le Chron (5g) g.d
  '16':  'GOLD-ROLLS',            // Gold Rolls
  '916': 'GD-GORILLA-ZKITTLES',   // Gorilla Zkittles (SPECIAL/Big)
  '4':   'IN-PITBULL',            // Pitbull (Wonderboom uses code 4)
  '17':  '85',                    // Moon Stick (I.D) (Ladybrand uses code 17)
  '562': 'IN-ICE-CREAM-CAKE',    // Ice Cream Cake (duplicate POS code)
  '703': '658',                   // The Church 5g G.D (duplicate POS code)
};

// ============================================================================
// MAIN
// ============================================================================

async function run() {
  console.log('='.repeat(70));
  console.log('  DBC Branch Stock Loader');
  console.log('  Source: 8 Stock Take PDFs (January 2026)');
  if (DRY_RUN) console.log('  *** DRY RUN — no database writes ***');
  console.log('='.repeat(70));
  console.log();

  // Connect
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${MONGO_URI}`);
  console.log();

  // ── Verify-only mode: compare DB values against source data ─────────────
  if (VERIFY_ONLY) {
    console.log('VERIFY MODE — Checking DB values against source data...\n');
    const allProds = await Product.find({}, 'sku name').lean();
    const skuLookup = {};
    for (const p of allProds) skuLookup[String(p.sku)] = p;

    let totalChecked = 0, totalMatch = 0, totalMismatch = 0, totalMissing = 0;
    const mismatches = [];

    for (const [branchCode, items] of Object.entries(stockData)) {
      const branch = await Branch.findOne({ branchCode });
      if (!branch) { console.log(`  SKIP ${branchCode} — branch not found`); continue; }

      let checked = 0, match = 0, mismatch = 0, missing = 0;
      for (const [sku, expectedRaw] of Object.entries(items)) {
        const expected = Math.max(0, expectedRaw);
        let product = skuLookup[sku];
        if (!product && posCodeToSku[sku]) product = skuLookup[posCodeToSku[sku]];
        if (!product) { missing++; totalMissing++; continue; }

        const inv = await BranchInventory.findOne({ branchId: branch._id, productId: product._id }).lean();
        const dbQty = inv ? inv.quantity : -1;
        checked++; totalChecked++;

        if (Math.abs(dbQty - expected) < 0.01) {
          match++; totalMatch++;
        } else {
          mismatch++; totalMismatch++;
          if (mismatches.length < 30) {
            mismatches.push({ branch: branchCode, product: product.name, sku, expected, dbQty });
          }
        }
      }
      const pct = checked > 0 ? ((match / checked) * 100).toFixed(1) : '0';
      console.log(`  ${branchCode}: ${match}/${checked} match (${pct}%) | ${mismatch} mismatch | ${missing} unmapped SKUs`);
    }

    console.log(`\n  TOTAL: ${totalMatch}/${totalChecked} match | ${totalMismatch} mismatch | ${totalMissing} unmapped`);
    if (mismatches.length > 0) {
      console.log('\n  MISMATCHES (first 30):');
      for (const m of mismatches) {
        console.log(`    ${m.branch} | ${m.product.substring(0,30).padEnd(30)} | expected=${String(m.expected).padStart(8)} | db=${String(m.dbQty).padStart(8)}`);
      }
    }
    if (totalMismatch === 0) console.log('\n  ALL VALUES MATCH — Stock is accurate.');
    await mongoose.disconnect();
    return;
  }

  // ── Step 1: Create/find branches ──────────────────────────────────────────
  console.log('STEP 1: Ensuring branch records exist...');
  const branchMap = {}; // code → branch doc

  for (const def of branchDefs) {
    let branch = await Branch.findOne({ branchCode: def.code });
    if (!branch) {
      if (DRY_RUN) {
        console.log(`  [DRY] Would create branch: ${def.name} (${def.code})`);
        branchMap[def.code] = { _id: 'dry-run-id', branchCode: def.code, name: def.name };
        continue;
      }
      branch = await Branch.create({
        branchCode: def.code,
        name: def.name,
        type: def.type,
        address: {
          city: def.city,
          province: def.province,
          country: 'South Africa'
        },
        phone: def.phone,
        isActive: true,
        hasLifestyleTrack: true,
        hasMedicalTrack: true
      });
      console.log(`  CREATED: ${branch.name} (${branch.branchCode}) → ${branch._id}`);
    } else {
      console.log(`  EXISTS:  ${branch.name} (${branch.branchCode}) → ${branch._id}`);
    }
    branchMap[def.code] = branch;
  }
  console.log();

  // ── Step 1b: Clear existing BranchInventory if --clear ────────────────────
  if (CLEAR_FIRST && !DRY_RUN) {
    const deleteResult = await BranchInventory.deleteMany({});
    console.log(`CLEARED: Deleted ${deleteResult.deletedCount} existing BranchInventory records`);
    console.log();
  }

  // ── Step 2: Load all products into a SKU lookup map ───────────────────────
  console.log('STEP 2: Loading product catalog...');
  const allProducts = await Product.find({}, 'sku name category inventory');
  const skuMap = {}; // sku string → product doc
  for (const p of allProducts) {
    skuMap[String(p.sku)] = p;
  }
  console.log(`  ${allProducts.length} products loaded`);
  console.log();

  // ── Step 3: Process each branch ───────────────────────────────────────────
  console.log('STEP 3: Loading branch inventory...');
  console.log();

  const globalStats = {
    totalEntries: 0,
    matched: 0,
    notFound: 0,
    created: 0,
    updated: 0,
    clampedToZero: 0
  };
  const unmatchedSkus = []; // { branchCode, sku }
  const productBranchTotals = {}; // productId → sum of all branch quantities

  for (const [branchCode, items] of Object.entries(stockData)) {
    const branch = branchMap[branchCode];
    const skus = Object.keys(items);
    let matched = 0;
    let notFound = 0;
    let created = 0;
    let updated = 0;
    let clamped = 0;

    console.log(`  ── ${branchCode} (${branchDefs.find(b => b.code === branchCode).name}) ──`);
    console.log(`     ${skus.length} items from stock take`);

    for (const sku of skus) {
      globalStats.totalEntries++;
      const rawSoh = items[sku];
      const soh = Math.max(0, rawSoh); // Clamp negatives to 0

      if (rawSoh < 0) {
        clamped++;
        globalStats.clampedToZero++;
      }

      // Find product by SKU (try numeric first, then posCodeToSku fallback)
      let product = skuMap[sku];
      if (!product && posCodeToSku[sku]) {
        product = skuMap[posCodeToSku[sku]];
      }
      if (!product) {
        notFound++;
        globalStats.notFound++;
        unmatchedSkus.push({ branchCode, sku });
        continue;
      }

      matched++;
      globalStats.matched++;

      // Track global totals for this product
      const pid = String(product._id);
      if (!productBranchTotals[pid]) productBranchTotals[pid] = 0;
      productBranchTotals[pid] += soh;

      if (DRY_RUN) continue;

      // Upsert BranchInventory
      const existing = await BranchInventory.findOne({
        branchId: branch._id,
        productId: product._id
      });

      if (existing) {
        existing.quantity = soh;
        existing.lastCountedAt = new Date();
        await existing.save();
        updated++;
        globalStats.updated++;
      } else {
        await BranchInventory.create({
          branchId: branch._id,
          productId: product._id,
          quantity: soh,
          isActive: true,
          isAvailableForSale: true,
          lastCountedAt: new Date()
        });
        created++;
        globalStats.created++;
      }
    }

    console.log(`     Matched: ${matched} | Not found: ${notFound} | Created: ${created} | Updated: ${updated} | Clamped to 0: ${clamped}`);
    console.log();
  }

  // ── Step 4: Update global Product.inventory.quantity ──────────────────────
  console.log('STEP 4: Updating global Product.inventory.quantity (sum of all branches)...');

  let globalUpdated = 0;
  for (const [pid, total] of Object.entries(productBranchTotals)) {
    if (DRY_RUN) {
      globalUpdated++;
      continue;
    }
    await Product.findByIdAndUpdate(pid, {
      $set: { 'inventory.quantity': total }
    });
    globalUpdated++;
  }
  console.log(`  ${globalUpdated} products updated with summed branch totals`);
  console.log();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Total stock take entries:  ${globalStats.totalEntries}`);
  console.log(`  Matched to products:       ${globalStats.matched}`);
  console.log(`  SKUs not found in DB:      ${globalStats.notFound}`);
  console.log(`  BranchInventory created:   ${globalStats.created}`);
  console.log(`  BranchInventory updated:   ${globalStats.updated}`);
  console.log(`  Negative SOH clamped to 0: ${globalStats.clampedToZero}`);
  console.log(`  Global quantities updated: ${globalUpdated}`);
  console.log();

  // Print unmatched SKUs grouped by branch
  if (unmatchedSkus.length > 0) {
    console.log('  UNMATCHED SKUs (not found in Product collection):');
    const grouped = {};
    for (const { branchCode, sku } of unmatchedSkus) {
      if (!grouped[branchCode]) grouped[branchCode] = [];
      grouped[branchCode].push(sku);
    }
    for (const [code, skuList] of Object.entries(grouped)) {
      // Deduplicate (same SKU might appear across branches)
      console.log(`    ${code}: ${skuList.join(', ')}`);
    }
    console.log();
  }

  // Print top 10 products by total stock
  const sortedTotals = Object.entries(productBranchTotals)
    .map(([pid, total]) => {
      const p = allProducts.find(x => String(x._id) === pid);
      return { name: p ? p.name : pid, sku: p ? p.sku : '?', total: Math.round(total * 100) / 100 };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  console.log('  TOP 15 PRODUCTS BY TOTAL STOCK (all branches):');
  for (const item of sortedTotals) {
    const unit = ['flower', 'concentrates'].includes(
      allProducts.find(p => p.sku === item.sku)?.category
    ) ? 'g' : 'units';
    console.log(`    ${item.name} (SKU ${item.sku}): ${item.total} ${unit}`);
  }
  console.log();

  if (DRY_RUN) {
    console.log('  *** DRY RUN COMPLETE — no changes were made ***');
  } else {
    console.log('  DONE — All branch stock loaded successfully.');
  }
  console.log('='.repeat(70));

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('FATAL:', err);
  mongoose.disconnect();
  process.exit(1);
});
