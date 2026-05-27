const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/jig").then(async () => {
  const Product = require("./backend/modules/database/models/Product");

  // Check how posCode is stored - sample a few products
  const samples = await Product.find({ name: /Alien Cookie|Bakers|Zoap|Gary Payton|Block Berry/i })
    .select("name sku posCode")
    .lean();

  console.log("=== PRODUCT posCode FIELD CHECK ===");
  for (const p of samples) {
    console.log(`name: "${p.name}" | sku: "${p.sku}" | posCode: "${p.posCode}"`);
  }

  console.log("");
  console.log("=== FIRST 10 PRODUCTS WITH posCode ===");
  const withPosCode = await Product.find({ posCode: { $exists: true, $ne: null } })
    .select("name sku posCode")
    .limit(10)
    .lean();
  for (const p of withPosCode) {
    console.log(`posCode: "${p.posCode}" (type: ${typeof p.posCode}) | name: "${p.name}" | sku: "${p.sku}"`);
  }

  console.log("");
  console.log("=== PRODUCTS WITHOUT posCode (first 10) ===");
  const noPosCode = await Product.find({ $or: [{ posCode: null }, { posCode: { $exists: false } }] })
    .select("name sku")
    .limit(10)
    .lean();
  for (const p of noPosCode) {
    console.log(`name: "${p.name}" | sku: "${p.sku}"`);
  }

  console.log("");
  const totalWithPosCode = await Product.countDocuments({ posCode: { $exists: true, $ne: null } });
  const totalWithout = await Product.countDocuments({ $or: [{ posCode: null }, { posCode: { $exists: false } }] });
  console.log(`Products with posCode: ${totalWithPosCode}`);
  console.log(`Products without posCode: ${totalWithout}`);

  mongoose.disconnect();
});
