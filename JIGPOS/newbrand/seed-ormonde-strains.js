/**
 * Seed Ormonde Branch Strain Inventory
 * Products with researched descriptions from Leafly, AllBud, etc.
 * Run: node seed-ormonde-strains.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';

// GreenDoor Products (Greenhouse strains) - R40-R70
const greendoorStrains = [
  {
    name: 'Gary Payton',
    price: 70,
    thc: '20-25%',
    strain: 'hybrid',
    description: 'Named after the NBA Hall of Famer, Gary Payton is a potent hybrid bred by Cookies and Powerzzzup Genetics. Crossing The Y with Snowman creates balanced effects - euphoric mental clarity paired with calming physical relaxation. Known for its nutty, earthy aroma with berry undertones. Helps with stress, pain, and mood enhancement.',
    effects: ['Euphoric', 'Relaxed', 'Creative', 'Focused', 'Happy'],
    flavors: ['Earthy', 'Nutty', 'Berry', 'Pine']
  },
  {
    name: 'Black Cherry Punch',
    price: 70,
    thc: '24-25%',
    strain: 'indica',
    description: 'A powerful indica-dominant hybrid (80/20) from Purple Punch x Black Cherry Pie. Delivers a rush of unfocused euphoria followed by deep physical relaxation. Sweet fruity cherry flavor with spicy florals and woody pine. Perfect for evening relaxation and sleep.',
    effects: ['Relaxed', 'Euphoric', 'Sleepy', 'Happy', 'Hungry'],
    flavors: ['Cherry', 'Berry', 'Sweet', 'Pine']
  },
  {
    name: 'Alien Cookies',
    price: 60,
    thc: '20-24%',
    strain: 'hybrid',
    description: 'A perfectly balanced 50/50 hybrid from Alien Dawg x Girl Scout Cookies by Jaws Gear Genetics. Delivers calming effects to both body and mind with a slow-building high. Sweet and earthy with vanilla and nutty undertones. Great for chronic pain, insomnia, and appetite loss.',
    effects: ['Calming', 'Relaxed', 'Euphoric', 'Hungry', 'Sleepy'],
    flavors: ['Sweet', 'Earthy', 'Vanilla', 'Nutty']
  },
  {
    name: 'Beach Wedding',
    price: 60,
    thc: '22-29%',
    strain: 'hybrid',
    description: 'An evenly balanced hybrid from Tropicanna Cookies x Wedding Cake. Fast-acting euphoria with physical relaxation. In small doses provides energy and motivation; larger doses bring sedation. Sweet tropical flavor perfect for stress, anxiety, and chronic pain.',
    effects: ['Euphoric', 'Relaxed', 'Creative', 'Focused', 'Happy'],
    flavors: ['Tropical', 'Sweet', 'Cake', 'Citrus']
  },
  {
    name: 'Gorilla Zkittles Big',
    price: 60,
    thc: '20-26%',
    strain: 'indica',
    description: 'A slightly indica-dominant hybrid (60/40) from Original Glue x Zkittlez by Barney\'s Farm. Creeping high builds into euphoric bliss with creative boosts before settling into sedation. Sweet fruity tropical flavor with chocolate undertones. Ideal for evening relaxation.',
    effects: ['Relaxed', 'Euphoric', 'Creative', 'Sleepy', 'Happy'],
    flavors: ['Tropical', 'Fruity', 'Chocolate', 'Sweet']
  },
  {
    name: 'Super Cheese',
    price: 50,
    thc: '18-22%',
    strain: 'hybrid',
    description: 'Classic cheese genetics with enhanced potency. Delivers the iconic pungent cheese aroma with earthy undertones. Balanced hybrid effects - uplifting cerebral buzz paired with body relaxation. Perfect for social situations and creative activities.',
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Uplifted', 'Creative'],
    flavors: ['Cheese', 'Earthy', 'Pungent', 'Skunky']
  },
  {
    name: 'Strawberry Lemonade',
    price: 40,
    thc: '18-28%',
    strain: 'sativa',
    description: 'A sativa-dominant hybrid from Lemon OG x Strawberry Cough. Winner of Best Sativa Concentrate at 2015 Cannabis Cup. Energizing and euphoric with enhanced focus and creativity. Sweet strawberry and tangy lemon flavors. Great for daytime use and ADHD.',
    effects: ['Energetic', 'Euphoric', 'Creative', 'Focused', 'Uplifted'],
    flavors: ['Strawberry', 'Lemon', 'Sweet', 'Citrus']
  },
  {
    name: 'Cheese',
    price: 60,
    thc: '17-20%',
    strain: 'indica',
    description: 'The legendary UK Cheese strain with its unmistakable pungent aroma. An indica-dominant hybrid that delivers potent relaxation with a euphoric mental lift. The iconic skunky cheese flavor is beloved worldwide. Excellent for stress relief and relaxation.',
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Sleepy', 'Hungry'],
    flavors: ['Cheese', 'Skunky', 'Earthy', 'Pungent']
  },
  {
    name: 'Jungle Diamond',
    price: 70,
    thc: '17-24%',
    strain: 'indica',
    description: 'A slightly indica-dominant hybrid (60/40) from Slurricane x Gorilla Glue #4. Happy effects boost spirits while a tingly body sensation removes aches and pains. Sweet chocolate and fresh berry flavors with spicy mocha coffee aroma. Ideal for experienced users.',
    effects: ['Euphoric', 'Happy', 'Relaxed', 'Tingly', 'Hungry'],
    flavors: ['Chocolate', 'Berry', 'Coffee', 'Spicy']
  },
  {
    name: 'Divine Storm',
    price: 70,
    thc: '19-29%',
    strain: 'indica',
    description: 'A slightly indica-dominant hybrid (60/40) from Divine Gelato x Slurricane by In House Genetics. Creeping high brings mental focus and energy before deep body relaxation takes over. Sweet creamy apple pie flavor. Perfect for chronic pain and evening use.',
    effects: ['Focused', 'Relaxed', 'Euphoric', 'Sleepy', 'Happy'],
    flavors: ['Apple', 'Cream', 'Vanilla', 'Earthy']
  }
];

// Indoor Premium Strains - R80-R150
const indoorStrains = [
  {
    name: 'Blu Zuchi',
    price: 150,
    thc: '26-33%',
    strain: 'indica',
    description: 'A premium indica-dominant hybrid (60/40) from Zkittlez x Kush Mints by TenCo. Exceptionally potent with euphoric, creative, and uplifting effects. Slow-building high brings mental clarity before deep relaxation. Sweet earthy flavor with spicy floral notes. Top-shelf quality.',
    effects: ['Euphoric', 'Creative', 'Relaxed', 'Uplifted', 'Focused'],
    flavors: ['Sweet', 'Earthy', 'Floral', 'Herbal']
  },
  {
    name: 'Blackberry',
    price: 100,
    thc: '18-22%',
    strain: 'indica',
    description: 'A classic indica with sweet berry flavors and powerful relaxing effects. Dense purple-tinted buds deliver full-body relaxation perfect for evening use. Sweet blackberry and earthy undertones create a smooth smoking experience. Great for insomnia and pain relief.',
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Euphoric', 'Hungry'],
    flavors: ['Blackberry', 'Berry', 'Sweet', 'Earthy']
  },
  {
    name: 'Monster Zkittles',
    price: 100,
    thc: '22-26%',
    strain: 'indica',
    description: 'A potent Zkittlez phenotype with enhanced size and effects. Sweet tropical candy flavors burst through with each hit. Delivers relaxing body effects with a happy, euphoric mental state. Perfect for stress relief and appetite stimulation.',
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Hungry', 'Sleepy'],
    flavors: ['Candy', 'Tropical', 'Sweet', 'Fruity']
  },
  {
    name: 'Purple Peanut',
    price: 80,
    thc: '18-24%',
    strain: 'indica',
    description: 'A unique indica-dominant hybrid with nutty, earthy flavors and stunning purple coloration. Delivers heavy body relaxation with a euphoric mental lift. Creamy peanut butter undertones make for a unique flavor profile. Great for evening relaxation.',
    effects: ['Relaxed', 'Euphoric', 'Sleepy', 'Happy', 'Hungry'],
    flavors: ['Nutty', 'Earthy', 'Cream', 'Sweet']
  },
  {
    name: 'Bakers',
    price: 80,
    thc: '20-25%',
    strain: 'hybrid',
    description: 'A delicious hybrid with sweet, doughy flavors reminiscent of fresh-baked goods. Balanced effects provide mental clarity and physical relaxation. Perfect for creative activities and social gatherings. Sweet vanilla and dough notes dominate.',
    effects: ['Relaxed', 'Happy', 'Creative', 'Euphoric', 'Uplifted'],
    flavors: ['Sweet', 'Vanilla', 'Dough', 'Cream']
  },
  {
    name: 'Rainbow Sherbit',
    price: 150,
    thc: '20-26%',
    strain: 'hybrid',
    description: 'An evenly balanced hybrid from Champagne x Blackberry. Immediate cerebral rush brings creativity and focus before deep body relaxation. Sweet berry fruity flavor with sugary exhale and fresh mint. Premium quality for chronic pain and stress.',
    effects: ['Creative', 'Relaxed', 'Euphoric', 'Focused', 'Happy'],
    flavors: ['Berry', 'Sweet', 'Mint', 'Fruity']
  },
  {
    name: 'Rainbow Royal',
    price: 150,
    thc: '22-28%',
    strain: 'hybrid',
    description: 'A regal hybrid with vibrant colors and exceptional potency. Delivers a euphoric, uplifting high with creative energy followed by soothing relaxation. Sweet fruity flavors with candy undertones. Top-shelf strain for special occasions.',
    effects: ['Euphoric', 'Creative', 'Relaxed', 'Uplifted', 'Happy'],
    flavors: ['Fruity', 'Sweet', 'Candy', 'Berry']
  },
  {
    name: 'Don Pernan',
    price: 120,
    thc: '20-25%',
    strain: 'indica',
    description: 'A rare indica-dominant hybrid with Champagne and Y Life genetics. Named after the famous champagne, it delivers sophisticated effects - immediate mood uplift and creativity followed by deep relaxation. Rich mango, mint, and coffee flavors. Truly luxurious.',
    effects: ['Euphoric', 'Creative', 'Relaxed', 'Happy', 'Calm'],
    flavors: ['Mango', 'Mint', 'Coffee', 'Rose']
  },
  {
    name: 'Ice Cream Cake',
    price: 100,
    thc: '20-25%',
    strain: 'indica',
    description: 'A premium indica-dominant hybrid (75/25) from Wedding Cake x Gelato #33 by Seed Junky Genetics. Sedating effects bring happiness and deep relaxation. Creamy vanilla and sugary dough flavors. Perfect for nighttime use, pain relief, and insomnia.',
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Euphoric', 'Hungry'],
    flavors: ['Vanilla', 'Cream', 'Sweet', 'Dough']
  },
  {
    name: 'Pitbull',
    price: 100,
    thc: '22-28%',
    strain: 'indica',
    description: 'A hard-hitting indica with powerful body effects. Dense buds deliver intense relaxation and couch-lock. Earthy and pungent with diesel undertones. Not for beginners - best suited for experienced users seeking strong pain relief and sedation.',
    effects: ['Relaxed', 'Sleepy', 'Euphoric', 'Happy', 'Hungry'],
    flavors: ['Earthy', 'Diesel', 'Pungent', 'Pine']
  },
  {
    name: 'King Truck',
    price: 100,
    thc: '20-24%',
    strain: 'indica',
    description: 'A powerful indica-dominant strain fit for royalty. Heavy-hitting effects deliver deep body relaxation and sedation. Earthy pine flavors with subtle sweetness. Excellent for chronic pain, insomnia, and muscle spasms. Evening use recommended.',
    effects: ['Relaxed', 'Sleepy', 'Euphoric', 'Happy', 'Hungry'],
    flavors: ['Earthy', 'Pine', 'Sweet', 'Herbal']
  },
  {
    name: 'Pink Runts',
    price: 80,
    thc: '23-25%',
    strain: 'hybrid',
    description: 'A balanced hybrid (50/50) phenotype of Runtz (Zkittlez x Gelato). Euphoric rush fills the mind with unfocused bliss while the body tingles with relaxation. Sweet cherry berry candy flavors. Great for depression, chronic stress, and fatigue.',
    effects: ['Euphoric', 'Relaxed', 'Happy', 'Giggly', 'Creative'],
    flavors: ['Cherry', 'Berry', 'Candy', 'Sweet']
  },
  {
    name: 'K. Snow',
    price: 80,
    thc: '20-26%',
    strain: 'hybrid',
    description: 'A frosty hybrid covered in crystal trichomes like fresh snow. Balanced effects bring cerebral euphoria and physical relaxation. Sweet and earthy with pine undertones. The heavy trichome coverage indicates exceptional quality and potency.',
    effects: ['Euphoric', 'Relaxed', 'Happy', 'Creative', 'Uplifted'],
    flavors: ['Sweet', 'Earthy', 'Pine', 'Citrus']
  },
  {
    name: 'Zoap',
    price: 80,
    thc: '22-27%',
    strain: 'hybrid',
    description: 'An evenly balanced hybrid (50/50) from Rainbow Sherbet x Pink Guava by Deo Farms. Fast-acting euphoria lifts the mind while relaxing the body. Sweet sour fruity citrus with cherry exhale and signature "soapy" aroma. Great for depression, stress, and pain.',
    effects: ['Euphoric', 'Creative', 'Relaxed', 'Focused', 'Giggly'],
    flavors: ['Citrus', 'Cherry', 'Fruity', 'Sour']
  }
];

async function seedOrmondeStrains() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB: dbc');

    const Product = require('./backend/modules/database/models/Product');
    const Branch = require('./backend/modules/database/models/Branch');
    const BranchInventory = require('./backend/modules/database/models/BranchInventory');

    // Get Ormonde branch
    const ormonde = await Branch.findOne({ branchCode: 'ORM' });
    if (!ormonde) {
      console.error('Ormonde branch not found! Run: node backend/scripts/seed-branches.js first');
      process.exit(1);
    }
    console.log(`Found Ormonde branch: ${ormonde.name} (${ormonde._id})`);

    let created = 0;
    let updated = 0;
    let inventoryCreated = 0;

    // Helper to create/update a strain product
    async function seedStrain(strainData, tier) {
      const sku = `JIG-${tier === 'indoor' ? 'IND' : 'GRD'}-${strainData.name.toUpperCase().replace(/\s+/g, '-').slice(0, 10)}`;

      // Check for existing product by name, SKU, or slug
      const slugName = strainData.name.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '');
      let product = await Product.findOne({
        $or: [
          { sku },
          { name: strainData.name },
          { name: strainData.name.replace(/\./g, '') }, // Handle K. Snow vs K Snow
          { slug: slugName },
          { slug: strainData.name.toLowerCase().replace(/\s+/g, '-') }
        ]
      });

      const productData = {
        name: strainData.name,
        sku,
        description: strainData.description,
        price: strainData.price,
        track: 'lifestyle',
        category: 'flower',
        subcategory: strainData.strain, // 'indica', 'sativa', or 'hybrid'
        status: 'active',
        images: [{
          url: `/images/strains/${strainData.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
          alt: strainData.name,
          isPrimary: true
        }],
        tags: [tier, 'flower', 'cannabis', strainData.strain, ...strainData.flavors.map(f => f.toLowerCase())],
        inventory: {
          quantity: 50,
          lowStockThreshold: 10,
          trackQuantity: true,
          allowBackorder: false
        },
        tax: {
          applicable: true,
          rate: 15
        },
        metadata: {
          tier,
          thcContent: strainData.thc,
          effects: strainData.effects,
          flavors: strainData.flavors,
          source: 'ormonde-inventory-sheet',
          addedDate: new Date().toISOString()
        }
      };

      if (product) {
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              price: strainData.price,
              description: strainData.description,
              status: 'active',
              'metadata.thcContent': strainData.thc,
              'metadata.effects': strainData.effects,
              'metadata.flavors': strainData.flavors,
              'metadata.priceUpdated': new Date().toISOString()
            }
          }
        );
        console.log(`  Updated: ${strainData.name} @ R${strainData.price} | THC: ${strainData.thc} | ${strainData.strain}`);
        updated++;
        product = await Product.findById(product._id);
      } else {
        product = await Product.create(productData);
        console.log(`  Created: ${strainData.name} @ R${strainData.price} | THC: ${strainData.thc} | ${strainData.strain}`);
        created++;
      }

      // Ensure BranchInventory for Ormonde
      let branchInv = await BranchInventory.findOne({
        branchId: ormonde._id,
        productId: product._id
      });

      if (!branchInv) {
        await BranchInventory.create({
          branchId: ormonde._id,
          productId: product._id,
          quantity: 50,
          reservedQuantity: 0,
          minimumStock: 10,
          reorderPoint: 15,
          maxStock: 100,
          lastRestockDate: new Date(),
          lastRestockQuantity: 50,
          location: tier === 'indoor' ? 'Indoor Premium Shelf' : 'GreenDoor Shelf',
          status: 'active'
        });
        inventoryCreated++;
      }

      return product;
    }

    console.log('\n=== SEEDING GREENDOOR (GREENHOUSE) STRAINS ===');
    console.log('Price range: R40-R70\n');
    for (const strain of greendoorStrains) {
      await seedStrain(strain, 'greendoor');
    }

    console.log('\n=== SEEDING INDOOR PREMIUM STRAINS ===');
    console.log('Price range: R80-R150\n');
    for (const strain of indoorStrains) {
      await seedStrain(strain, 'indoor');
    }

    // Summary
    console.log('\n========================================');
    console.log('ORMONDE STRAIN SEEDING COMPLETE');
    console.log('========================================');
    console.log(`Products Created: ${created}`);
    console.log(`Products Updated: ${updated}`);
    console.log(`Branch Inventory Created: ${inventoryCreated}`);
    console.log(`Total Strains: ${greendoorStrains.length + indoorStrains.length}`);
    console.log('========================================');

    // Price tier breakdown
    console.log('\n=== PRICE TIER BREAKDOWN ===');

    const allProducts = await Product.find({
      category: 'flower',
      status: 'active'
    }).sort({ price: -1 });

    console.log('\nPremium Indoor (R100+):');
    allProducts.filter(p => p.price >= 100).forEach(p => {
      console.log(`  R${p.price} - ${p.name} (${p.metadata?.thcContent || 'N/A'})`);
    });

    console.log('\nMid-Range (R60-R99):');
    allProducts.filter(p => p.price >= 60 && p.price < 100).forEach(p => {
      console.log(`  R${p.price} - ${p.name} (${p.metadata?.thcContent || 'N/A'})`);
    });

    console.log('\nValue GreenDoor (Under R60):');
    allProducts.filter(p => p.price < 60).forEach(p => {
      console.log(`  R${p.price} - ${p.name} (${p.metadata?.thcContent || 'N/A'})`);
    });

    // Ormonde inventory summary
    const ormondeInventory = await BranchInventory.find({ branchId: ormonde._id });
    console.log(`\n=== ORMONDE BRANCH INVENTORY ===`);
    console.log(`Total Products: ${ormondeInventory.length}`);
    console.log(`Total Units: ${ormondeInventory.reduce((sum, inv) => sum + inv.quantity, 0)}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seedOrmondeStrains();
