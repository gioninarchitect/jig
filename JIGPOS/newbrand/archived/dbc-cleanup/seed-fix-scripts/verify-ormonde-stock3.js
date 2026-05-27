const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/jig").then(async () => {
  const Product = require("./backend/modules/database/models/Product");
  const BranchInventory = require("./backend/modules/database/models/BranchInventory");
  const Branch = require("./backend/modules/database/models/Branch");

  const branch = await Branch.findOne({ branchCode: "DBC-ORM" });
  const items = await BranchInventory.find({ branchId: branch._id }).populate("productId", "name sku").lean();

  // Build lookup by SKU
  const dbBySku = {};
  for (const item of items) {
    if (item.productId?.sku) {
      dbBySku[item.productId.sku] = { qty: item.quantity, name: item.productId.name };
    }
  }

  // PDF SOH values - product code = SKU in our DB
  const pdfData = [
    { sku: "1", name: "Just blaze Banana Java", soh: 0 },
    { sku: "691", name: "Just blaze Block Berry", soh: 10 },
    { sku: "671", name: "Just blaze Blue cheese", soh: 25 },
    { sku: "688", name: "Just blaze California Black Rose", soh: 21 },
    { sku: "718", name: "Just blaze Happy Holidays", soh: 19 },
    { sku: "689", name: "Just blaze Tropical Pineapple", soh: 33 },
    { sku: "451", name: "Just blaze Wednesday Adams", soh: 21 },
    { sku: "7", name: "Alien Cookie", soh: 78.36 },
    { sku: "644", name: "Bakers", soh: 157.26 },
    { sku: "680", name: "Beach Wedding (g.d)", soh: 136.87 },
    { sku: "318", name: "Black Cherry Punch", soh: 169.79 },
    { sku: "357", name: "Block Berry", soh: 78.26 },
    { sku: "660", name: "Block Berry (5g) i.d", soh: 3 },
    { sku: "709", name: "Blue Pava", soh: 92.8 },
    { sku: "663", name: "Blue Zucci", soh: 81 },
    { sku: "836", name: "Budder", soh: 6 },
    { sku: "343", name: "C Cell Battery", soh: 3 },
    { sku: "655", name: "Cheese", soh: 91.98 },
    { sku: "315", name: "Gary Payton", soh: 240 },
    { sku: "83", name: "Gold Roll", soh: 111 },
    { sku: "684", name: "Gorilla Zkittles", soh: 112.55 },
    { sku: "611", name: "Jungle Diamond", soh: 198.18 },
    { sku: "720", name: "K-Snow", soh: 162.36 },
    { sku: "687", name: "Kings Truck", soh: 73.8 },
    { sku: "1002", name: "Ice Cream Cake (i.d)", soh: 96.57 },
    { sku: "966", name: "Moon Stick (G.D)", soh: 66 },
    { sku: "85", name: "Moon Stick (I.D)", soh: 34 },
    { sku: "683", name: "PINK RUNTZ", soh: 84.2 },
    { sku: "86", name: "Pitbull", soh: 65.39 },
    { sku: "972", name: "Strawberry Lemonade (SPECIAL)", soh: 130.58 },
    { sku: "775", name: "Super Cheese", soh: 442.19 },
    { sku: "719", name: "Zoap", soh: 137 },
    { sku: "118", name: "Disposable Vapes", soh: 208 },
    { sku: "615", name: "Dynamic Threesome (3g)", soh: 68 },
    { sku: "708", name: "Frozen Peach", soh: 94.52 },
    { sku: "710", name: "Face On Fire", soh: 67.2 },
    { sku: "304", name: "Water", soh: 26 },
    { sku: "429", name: "Durban Sky", soh: -14 },
    { sku: "381", name: "Lollipops", soh: 12 },
    { sku: "380", name: "Singles", soh: 43 },
    { sku: "71", name: "MJ Roll", soh: 11 },
    { sku: "188", name: "OG Gummies 150mg", soh: 13 },
    { sku: "110", name: "Wacky worms 300mg", soh: 11 },
    { sku: "313", name: "Wax Bad", soh: 5 },
    { sku: "112", name: "1ml carts", soh: 8 },
    { sku: "134", name: "20ml THC Oil Drops", soh: 6 },
    { sku: "455", name: "420 Magic", soh: 19 },
    { sku: "870", name: "Divine Storm", soh: 48.32 },
    { sku: "572", name: "PURPLE PEANUT BUTTER", soh: 52.7 },
    { sku: "682", name: "RAINBOW ROYALE (I.D)", soh: 29.9 },
    { sku: "681", name: "Rainbow Sherbit (I.D)", soh: 67 },
  ];

  let match = 0;
  let mismatch = 0;
  let notFound = 0;

  console.log("SKU    PDF_SOH    DB_QTY     MATCH  DB_NAME");
  console.log("-----  ---------  ---------  -----  ----------------------------------------");

  for (const p of pdfData) {
    const db = dbBySku[p.sku];
    if (!db) {
      console.log(`${p.sku.padEnd(7)}${String(p.soh).padStart(9)}  ${"NOT FOUND".padStart(9)}  MISS   ${p.name}`);
      notFound++;
    } else {
      const isMatch = Math.abs(db.qty - p.soh) < 0.01;
      if (isMatch) {
        match++;
        console.log(`${p.sku.padEnd(7)}${String(p.soh).padStart(9)}  ${String(db.qty).padStart(9)}  OK     ${db.name}`);
      } else {
        mismatch++;
        console.log(`${p.sku.padEnd(7)}${String(p.soh).padStart(9)}  ${String(db.qty).padStart(9)}  DIFF   ${db.name} (off by ${(db.qty - p.soh).toFixed(2)})`);
      }
    }
  }

  console.log("");
  console.log("========================================");
  console.log(`MATCH: ${match} | MISMATCH: ${mismatch} | NOT FOUND: ${notFound} | TOTAL CHECKED: ${pdfData.length}`);
  console.log("========================================");

  mongoose.disconnect();
});
