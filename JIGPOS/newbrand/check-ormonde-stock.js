const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/jig").then(async () => {
  // Must register Product model first for populate to work
  require("./backend/modules/database/models/Product");
  const BranchInventory = require("./backend/modules/database/models/BranchInventory");
  const Branch = require("./backend/modules/database/models/Branch");

  const branch = await Branch.findOne({ branchCode: "DBC-ORM" });
  if (!branch) { console.log("DBC-ORM not found"); process.exit(1); }

  const items = await BranchInventory.find({ branchId: branch._id }).populate("productId", "name sku posCode").lean();

  items.sort((a, b) => {
    const nameA = a.productId?.name || "";
    const nameB = b.productId?.name || "";
    return nameA.localeCompare(nameB);
  });

  console.log("POS_CODE  QTY        PRODUCT NAME");
  console.log("--------  ---------  ----------------------------------------");
  for (const item of items) {
    const name = item.productId?.name || "UNKNOWN";
    const posCode = item.productId?.posCode || item.productId?.sku || "?";
    console.log(String(posCode).padEnd(10) + String(item.quantity).padStart(9) + "  " + name.substring(0, 50));
  }
  console.log("");
  console.log("Total items:", items.length);
  mongoose.disconnect();
});
