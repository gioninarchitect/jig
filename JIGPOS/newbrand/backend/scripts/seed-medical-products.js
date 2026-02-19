// Seed Medical Cannabis Products (Section 21)
const mongoose = require('mongoose');
const Product = require('../modules/database/models/Product');
require('dotenv').config();

async function seedMedicalProducts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jig');
    console.log('Connected to MongoDB');

    const medicalProducts = [
      // Medical Cannabis Flower
      {
        sku: 'MED-FL-001',
        name: 'Medical THC Flower - High Potency (28g)',
        category: 'flower',
        track: 'medical',
        price: 1250.00,
        costPrice: 700.00,
        stock: 15,
        reorderLevel: 3,
        description: 'Medical-grade high THC cannabis flower for chronic pain management. Requires Section 21 authorization and valid prescription.',
        shortDescription: 'Medical Grade - 28g (1oz)',
        thcContent: 22.0,
        cbdContent: 0.5,
        strainType: 'indica',
        weight: 28,
        unit: 'g',
        effects: ['Pain Relief', 'Relaxation', 'Sleep Aid'],
        medicalUses: ['Chronic Pain', 'Insomnia', 'Muscle Spasms'],
        dosageInstructions: 'Start with 0.1-0.2g, increase as needed under medical supervision',
        isActive: true,
        requiresPrescription: true
      },
      {
        sku: 'MED-FL-002',
        name: 'Medical CBD Flower - 1:1 THC:CBD (28g)',
        category: 'flower',
        track: 'medical',
        price: 1150.00,
        costPrice: 650.00,
        stock: 18,
        reorderLevel: 3,
        description: 'Balanced 1:1 THC:CBD medical flower for anxiety, inflammation, and pain relief with minimal psychoactive effects.',
        shortDescription: 'Balanced Medical - 28g (1oz)',
        thcContent: 10.0,
        cbdContent: 10.0,
        strainType: 'hybrid',
        weight: 28,
        unit: 'g',
        effects: ['Pain Relief', 'Anti-anxiety', 'Anti-inflammatory'],
        medicalUses: ['Anxiety', 'Inflammation', 'PTSD', 'Chronic Pain'],
        dosageInstructions: 'Start with 0.2-0.3g, adjust based on symptoms under medical guidance',
        isActive: true,
        requiresPrescription: true
      },
      {
        sku: 'MED-FL-003',
        name: 'Medical CBD Flower - High CBD (28g)',
        category: 'flower',
        track: 'medical',
        price: 980.00,
        costPrice: 550.00,
        stock: 20,
        reorderLevel: 3,
        description: 'High CBD, low THC medical cannabis for seizure management, anxiety, and inflammation without significant psychoactive effects.',
        shortDescription: 'High CBD Medical - 28g (1oz)',
        thcContent: 2.0,
        cbdContent: 18.0,
        strainType: 'hybrid',
        weight: 28,
        unit: 'g',
        effects: ['Anti-seizure', 'Anti-anxiety', 'Anti-inflammatory', 'Neuroprotective'],
        medicalUses: ['Epilepsy', 'Anxiety', 'Inflammation', 'Neuropathic Pain'],
        dosageInstructions: 'Start with 0.3-0.5g, can be increased safely under medical supervision',
        isActive: true,
        requiresPrescription: true
      },

      // Medical Cannabis Oil
      {
        sku: 'MED-OIL-001',
        name: 'Medical THC Oil - 30ml (High Potency)',
        category: 'oils',
        track: 'medical',
        price: 850.00,
        costPrice: 480.00,
        stock: 25,
        reorderLevel: 5,
        description: 'Pharmaceutical-grade THC oil for chronic pain, insomnia, and appetite stimulation. 20mg THC per ml.',
        shortDescription: 'THC Oil - 600mg Total (30ml)',
        thcContent: 20.0,
        cbdContent: 1.0,
        strainType: 'indica',
        volume: 30,
        unit: 'ml',
        effects: ['Pain Relief', 'Sleep Aid', 'Appetite Stimulation'],
        medicalUses: ['Chronic Pain', 'Insomnia', 'Cancer-related Symptoms', 'HIV/AIDS'],
        dosageInstructions: 'Start with 0.25ml (5mg THC) once daily. Increase by 0.25ml every 3-5 days as needed.',
        isActive: true,
        requiresPrescription: true
      },
      {
        sku: 'MED-OIL-002',
        name: 'Medical CBD Oil - 30ml (1:1 THC:CBD)',
        category: 'oils',
        track: 'medical',
        price: 780.00,
        costPrice: 420.00,
        stock: 30,
        reorderLevel: 5,
        description: 'Balanced 1:1 ratio medical cannabis oil for pain, inflammation, and anxiety management.',
        shortDescription: 'Balanced Oil - 300mg THC + 300mg CBD (30ml)',
        thcContent: 10.0,
        cbdContent: 10.0,
        strainType: 'hybrid',
        volume: 30,
        unit: 'ml',
        effects: ['Pain Relief', 'Anti-anxiety', 'Anti-inflammatory', 'Balanced'],
        medicalUses: ['Chronic Pain', 'Anxiety', 'PTSD', 'Inflammation', 'Multiple Sclerosis'],
        dosageInstructions: 'Start with 0.5ml (5mg THC + 5mg CBD) twice daily. Adjust under medical guidance.',
        isActive: true,
        requiresPrescription: true
      },
      {
        sku: 'MED-OIL-003',
        name: 'Medical CBD Oil - 30ml (High CBD)',
        category: 'oils',
        track: 'medical',
        price: 720.00,
        costPrice: 380.00,
        stock: 35,
        reorderLevel: 5,
        description: 'High CBD medical oil for epilepsy, anxiety, and inflammatory conditions. 25mg CBD per ml, minimal THC.',
        shortDescription: 'High CBD Oil - 750mg CBD (30ml)',
        thcContent: 1.0,
        cbdContent: 25.0,
        strainType: 'hybrid',
        volume: 30,
        unit: 'ml',
        effects: ['Anti-seizure', 'Anti-anxiety', 'Anti-inflammatory', 'Clear-headed'],
        medicalUses: ['Epilepsy', 'Seizure Disorders', 'Anxiety', 'Inflammation', 'Neuropathy'],
        dosageInstructions: 'Start with 1ml (25mg CBD) twice daily. Can increase to 2ml three times daily.',
        isActive: true,
        requiresPrescription: true
      },

      // Medical Capsules
      {
        sku: 'MED-CAP-001',
        name: 'Medical THC Capsules - 30 Count',
        category: 'edibles',
        track: 'medical',
        price: 650.00,
        costPrice: 350.00,
        stock: 20,
        reorderLevel: 5,
        description: 'Pharmaceutical-grade THC capsules for precise dosing. Each capsule contains 10mg THC.',
        shortDescription: 'THC Capsules - 10mg x 30',
        thcContent: 10.0,
        cbdContent: 0.5,
        strainType: 'indica',
        unit: 'capsules',
        effects: ['Long-lasting Relief', 'Pain Management', 'Sleep Aid'],
        medicalUses: ['Chronic Pain', 'Insomnia', 'Appetite Stimulation'],
        dosageInstructions: 'Take 1 capsule in evening. Effects begin after 1-2 hours. Do not exceed 3 per day.',
        isActive: true,
        requiresPrescription: true
      },
      {
        sku: 'MED-CAP-002',
        name: 'Medical CBD Capsules - 30 Count (1:1)',
        category: 'edibles',
        track: 'medical',
        price: 580.00,
        costPrice: 310.00,
        stock: 25,
        reorderLevel: 5,
        description: 'Balanced 1:1 THC:CBD capsules for daytime symptom management. Each capsule contains 5mg THC + 5mg CBD.',
        shortDescription: 'Balanced Capsules - 5:5mg x 30',
        thcContent: 5.0,
        cbdContent: 5.0,
        strainType: 'hybrid',
        unit: 'capsules',
        effects: ['Balanced Relief', 'Reduced Anxiety', 'Mild Pain Relief'],
        medicalUses: ['Anxiety', 'Mild Pain', 'PTSD', 'Inflammation'],
        dosageInstructions: 'Take 1-2 capsules twice daily with food. Safe for daytime use.',
        isActive: true,
        requiresPrescription: true
      }
    ];

    console.log('\nSeeding medical cannabis products...\n');

    for (const productData of medicalProducts) {
      const existing = await Product.findOne({ sku: productData.sku });

      if (existing) {
        await Product.updateOne({ sku: productData.sku }, { $set: productData });
        console.log(`✅ Updated ${productData.sku} - ${productData.name}`);
      } else {
        await Product.create(productData);
        console.log(`✅ Created ${productData.sku} - ${productData.name}`);
      }
    }

    console.log('\n📊 Medical Products Summary:');
    console.log('========================================');
    console.log('Medical Flower: 3 products');
    console.log('Medical Oils: 3 products');
    console.log('Medical Capsules: 2 products');
    console.log('========================================');
    console.log('\nTotal: 8 Section 21 medical cannabis products');
    console.log('\n💡 Testing:');
    console.log('- Login as patient@basothomedicalherbs.ls (has approved Section 21)');
    console.log('- Navigate to "Medical Cannabis" tab');
    console.log('- View Section 21 status and browse medical products');
    console.log('- Add products to cart (requires prescription)\n');

    mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding medical products:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

// Run the seed function
seedMedicalProducts();
