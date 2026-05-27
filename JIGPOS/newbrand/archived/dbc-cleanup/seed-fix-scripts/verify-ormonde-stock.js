const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/jig").then(async () => {
  require("./backend/modules/database/models/Product");
  const BranchInventory = require("./backend/modules/database/models/BranchInventory");
  const Branch = require("./backend/modules/database/models/Branch");

  const branch = await Branch.findOne({ branchCode: "DBC-ORM" });
  const items = await BranchInventory.find({ branchId: branch._id }).populate("productId", "name sku posCode").lean();

  // Build lookup by posCode
  const dbByPosCode = {};
  for (const item of items) {
    if (item.productId?.posCode) {
      dbByPosCode[item.productId.posCode] = { qty: item.quantity, name: item.productId.name };
    }
  }

  // PDF SOH values from Ormonde stocktake (30/01/2026) - key items to verify
  const pdfData = [
    { code: "1", name: ".Just blaze Banana Java", soh: 0 },
    { code: "691", name: ".Just blaze Block Berry", soh: 10 },
    { code: "671", name: ".Just blaze Blue cheese", soh: 25 },
    { code: "688", name: ".Just blaze California Black Rose", soh: 21 },
    { code: "718", name: ".Just blaze Happy Holidays", soh: 19 },
    { code: "689", name: ".Just blaze Tropical Pineapple", soh: 33 },
    { code: "451", name: ".Just blaze Wednesday Adams", soh: 21 },
    { code: "7", name: "Alien Cookie", soh: 78.36 },
    { code: "644", name: "Bakers", soh: 157.26 },
    { code: "680", name: "Beach Wedding (g.d)", soh: 136.87 },
    { code: "318", name: "Black Cherry Punch", soh: 169.79 },
    { code: "357", name: "Block Berry", soh: 78.26 },
    { code: "660", name: "Block Berry (5g) i.d", soh: 3 },
    { code: "709", name: "Blue Pava", soh: 92.8 },
    { code: "663", name: "Blue Zucci", soh: 81 },
    { code: "836", name: "Budder", soh: 6 },
    { code: "343", name: "C Cell Battery", soh: 3 },
    { code: "655", name: "Cheese", soh: 91.98 },
    { code: "315", name: "Gary Payton", soh: 240 },
    { code: "83", name: "Gold Roll", soh: 111 },
    { code: "684", name: "Gorilla Zkittles", soh: 112.55 },
    { code: "611", name: "Jungle Diamond", soh: 198.18 },
    { code: "720", name: "K-Snow", soh: 162.36 },
    { code: "687", name: "Kings Truck", soh: 73.8 },
    { code: "1002", name: "Ice Cream Cake (i.d)", soh: 96.57 },
    { code: "966", name: "Moon Stick (G.D)", soh: 66 },
    { code: "85", name: "Moon Stick (I.D)", soh: 34 },
    { code: "683", name: "PINK RUNTZ", soh: 84.2 },
    { code: "86", name: "Pitbull", soh: 65.39 },
    { code: "972", name: "Strawberry Lemonade (SPECIAL)", soh: 130.58 },
    { code: "775", name: "Super Cheese", soh: 442.19 },
    { code: "719", name: "Zoap", soh: 137 },
    { code: "118", name: "Disposable Vapes", soh: 208 },
    { code: "615", name: "Dynamic Threesome (3g)", soh: 68 },
    { code: "708", name: "Frozen Peach", soh: 94.52 },
    { code: "710", name: "Face On Fire", soh: 67.2 },
    { code: "304", name: "Water", soh: 26 },
    { code: "429", name: "Durban Sky", soh: -14 },
    { code: "381", name: "Lollipops", soh: 12 },
    { code: "380", name: "Singles", soh: 43 },
    { code: "71", name: "MJ Roll", soh: 11 },
    { code: "188", name: "OG Gummies 150mg", soh: 13 },
    { code: "110", name: "Wacky worms 300mg", soh: 11 },
    { code: "313", name: "Wax Bad", soh: 5 },
    { code: "112", name: "1. ml carts", soh: 8 },
    { code: "134", name: "20ml THC Oil Drops", soh: 6 },
    { code: "455", name: "420 Magic", soh: 19 },
    { code: "870", name: "Divine Storm", soh: 48.32 },
    { code: "572", name: "PURPLE PEANUT BUTTER", soh: 52.7 },
    { code: "682", name: "RAINBOW ROYALE (I.D)", soh: 29.9 },
    { code: "681", name: "Rainbow Sherbit (I.D)", soh: 67 },
  ];

  let match = 0;
  let mismatch = 0;
  let notFound = 0;

  console.log("CODE   PDF_SOH    DB_QTY     MATCH  PRODUCT");
  console.log("-----  ---------  ---------  -----  ----------------------------------------");

  for (const p of pdfData) {
    const db = dbByPosCode[p.code];
    if (!db) {
      console.log(`${p.code.padEnd(7)}${String(p.soh).padStart(9)}  ${"NOT FOUND".padStart(9)}  MISS   ${p.name}`);
      notFound++;
    } else {
      const isMatch = Math.abs(db.qty - p.soh) < 0.01;
      if (isMatch) {
        match++;
        console.log(`${p.code.padEnd(7)}${String(p.soh).padStart(9)}  ${String(db.qty).padStart(9)}  OK     ${db.name}`);
      } else {
        mismatch++;
        console.log(`${p.code.padEnd(7)}${String(p.soh).padStart(9)}  ${String(db.qty).padStart(9)}  DIFF   ${db.name}`);
      }
    }
  }

  console.log("");
  console.log(`=== RESULTS: ${match} match, ${mismatch} mismatch, ${notFound} not found out of ${pdfData.length} checked ===`);
  mongoose.disconnect();
});
