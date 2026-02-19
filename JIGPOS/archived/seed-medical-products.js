// Seed Medical Cannabis Products (Mockup for Section 21 Approved Patients)
// These represent products from a third-party licensed dispensary integration

const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./backend/modules/database/models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bmh';

// Helper to generate slug from name
function generateSlug(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// South African-relevant medical cannabis products (mockup)
const medicalProducts = [
    {
        name: 'Cannavis THC Oil 30ml',
        sku: 'MED-OIL-001',
        category: 'oils',
        track: 'medical',
        description: 'Full-spectrum THC oil for chronic pain management. Schedule 6 medication requiring Section 21 authorization. Manufactured under GMP conditions.',
        shortDescription: 'Medical-grade THC oil for pain relief',
        price: 1450.00,
        costPrice: 950.00,
        thcContent: '10mg/ml',
        cbdContent: '5mg/ml',
        strainType: 'hybrid',
        effects: ['pain relief', 'relaxation', 'improved sleep'],
        medicalUses: ['chronic pain', 'neuropathic pain', 'insomnia', 'anxiety'],
        dosageInstructions: 'Start with 0.25ml twice daily. Increase gradually as directed by prescribing physician.',
        volume: '30ml',
        brand: 'Cannavis Medical',
        supplier: 'SA Cannabis Pharmaceuticals',
        images: [{ url: '/images/products/medical/thc-oil.png', isPrimary: true }],
        status: 'active',
        featured: true,
        tags: ['section-21', 'prescription-only', 'pain-management'],
        inventory: { quantity: 25, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
        isLifestyleMember: false,
        requiresSection21: true
    },
    {
        name: 'MediCann CBD:THC 1:1 Capsules',
        sku: 'MED-CAP-002',
        category: 'edibles',
        track: 'medical',
        description: 'Balanced CBD:THC capsules for symptom management. Each capsule contains 10mg CBD and 10mg THC. Lab-tested for purity and potency.',
        shortDescription: 'Balanced 1:1 CBD:THC capsules',
        price: 890.00,
        costPrice: 550.00,
        thcContent: '10mg per capsule',
        cbdContent: '10mg per capsule',
        strainType: 'hybrid',
        effects: ['pain relief', 'anti-inflammatory', 'mood stabilization'],
        medicalUses: ['chronic pain', 'multiple sclerosis', 'fibromyalgia', 'anxiety'],
        dosageInstructions: 'Take 1 capsule twice daily with food. Do not exceed 4 capsules in 24 hours.',
        unit: '30 capsules',
        brand: 'MediCann SA',
        supplier: 'SA Cannabis Pharmaceuticals',
        images: [{ url: '/images/products/medical/cbd-thc-caps.png', isPrimary: true }],
        status: 'active',
        featured: true,
        tags: ['section-21', 'prescription-only', 'capsules'],
        inventory: { quantity: 40, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false },
        isLifestyleMember: false,
        requiresSection21: true
    },
    {
        name: 'Releaf THC Drops 25ml',
        sku: 'MED-DRP-003',
        category: 'oils',
        track: 'medical',
        description: 'High-potency sublingual THC drops for rapid symptom relief. Alcohol-free formula suitable for patients with sensitivities.',
        shortDescription: 'High-potency sublingual THC drops',
        price: 1750.00,
        costPrice: 1100.00,
        thcContent: '25mg/ml',
        cbdContent: '2mg/ml',
        strainType: 'indica',
        effects: ['rapid pain relief', 'deep relaxation', 'appetite stimulation'],
        medicalUses: ['cancer-related pain', 'chemotherapy side effects', 'severe insomnia', 'appetite loss'],
        dosageInstructions: 'Place 2-4 drops under tongue. Hold for 60 seconds before swallowing. Start low and increase as directed.',
        volume: '25ml',
        brand: 'Releaf Pharma',
        supplier: 'Releaf Pharmaceuticals',
        images: [{ url: '/images/products/medical/thc-drops.png', isPrimary: true }],
        status: 'active',
        featured: false,
        tags: ['section-21', 'prescription-only', 'high-potency', 'sublingual'],
        inventory: { quantity: 15, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
        isLifestyleMember: false,
        requiresSection21: true
    },
    {
        name: 'Cannabliss Medical Flower - Indica',
        sku: 'MED-FLW-004',
        category: 'flower',
        track: 'medical',
        description: 'Premium indica-dominant dried cannabis flower for vaporization. Irradiated for patient safety. Certificate of analysis included.',
        shortDescription: 'Medical-grade indica flower',
        price: 180.00,
        costPrice: 95.00,
        thcContent: '18-22%',
        cbdContent: '<1%',
        strainType: 'indica',
        effects: ['deep relaxation', 'pain relief', 'sedation', 'appetite increase'],
        medicalUses: ['insomnia', 'chronic pain', 'muscle spasms', 'anxiety'],
        dosageInstructions: 'For vaporization only. Start with 0.1g and wait 15 minutes before additional use.',
        weight: 3.5,
        brand: 'Cannabliss Medical',
        supplier: 'Cannabliss Cultivation',
        images: [{ url: '/images/products/medical/indica-flower.png', isPrimary: true }],
        status: 'active',
        featured: true,
        tags: ['section-21', 'prescription-only', 'dried-flower', 'vaporization'],
        inventory: { quantity: 30, lowStockThreshold: 8, trackQuantity: true, allowBackorder: false },
        isLifestyleMember: false,
        requiresSection21: true
    },
    {
        name: 'Cannabliss Medical Flower - Sativa',
        sku: 'MED-FLW-005',
        category: 'flower',
        track: 'medical',
        description: 'Premium sativa-dominant dried cannabis flower for daytime use. Lab-tested and irradiated. Ideal for symptom management without sedation.',
        shortDescription: 'Medical-grade sativa flower',
        price: 180.00,
        costPrice: 95.00,
        thcContent: '16-20%',
        cbdContent: '<1%',
        strainType: 'sativa',
        effects: ['uplifting', 'focus', 'energy', 'creativity'],
        medicalUses: ['depression', 'fatigue', 'ADHD', 'chronic pain'],
        dosageInstructions: 'For vaporization only. Start with 0.1g and wait 15 minutes before additional use.',
        weight: 3.5,
        brand: 'Cannabliss Medical',
        supplier: 'Cannabliss Cultivation',
        images: [{ url: '/images/products/medical/sativa-flower.png', isPrimary: true }],
        status: 'active',
        featured: false,
        tags: ['section-21', 'prescription-only', 'dried-flower', 'vaporization'],
        inventory: { quantity: 25, lowStockThreshold: 8, trackQuantity: true, allowBackorder: false },
        isLifestyleMember: false,
        requiresSection21: true
    },
    {
        name: 'MediPatch Transdermal THC Patch',
        sku: 'MED-PAT-006',
        category: 'topicals',
        track: 'medical',
        description: '72-hour slow-release transdermal THC patch for consistent symptom control. Discreet and smoke-free medication delivery.',
        shortDescription: '72-hour THC transdermal patch',
        price: 320.00,
        costPrice: 180.00,
        thcContent: '20mg per patch',
        cbdContent: '5mg per patch',
        strainType: 'hybrid',
        effects: ['sustained pain relief', 'consistent dosing', 'no psychoactive peak'],
        medicalUses: ['chronic pain', 'neuropathy', 'arthritis', 'back pain'],
        dosageInstructions: 'Apply to clean, hairless skin. Replace every 72 hours. Rotate application site.',
        unit: '4 patches',
        brand: 'MediPatch SA',
        supplier: 'SA Cannabis Pharmaceuticals',
        images: [{ url: '/images/products/medical/thc-patch.png', isPrimary: true }],
        status: 'active',
        featured: true,
        tags: ['section-21', 'prescription-only', 'transdermal', 'smoke-free'],
        inventory: { quantity: 20, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
        isLifestyleMember: false,
        requiresSection21: true
    },
    {
        name: 'CannaCare RSO Full Extract',
        sku: 'MED-RSO-007',
        category: 'concentrates',
        track: 'medical',
        description: 'Rick Simpson Oil (RSO) full-spectrum cannabis extract. High-potency concentrate for serious medical conditions. Requires careful titration.',
        shortDescription: 'Full-spectrum RSO concentrate',
        price: 2500.00,
        costPrice: 1600.00,
        thcContent: '60-70%',
        cbdContent: '5-10%',
        strainType: 'indica',
        effects: ['powerful pain relief', 'deep sedation', 'appetite stimulation'],
        medicalUses: ['cancer', 'severe chronic pain', 'terminal illness palliative care'],
        dosageInstructions: 'Start with rice-grain size dose (25mg). Increase slowly over weeks. Medical supervision required.',
        weight: 5,
        brand: 'CannaCare Medical',
        supplier: 'CannaCare Extracts',
        images: [{ url: '/images/products/medical/rso.png', isPrimary: true }],
        status: 'active',
        featured: false,
        tags: ['section-21', 'prescription-only', 'high-potency', 'concentrate'],
        inventory: { quantity: 10, lowStockThreshold: 3, trackQuantity: true, allowBackorder: false },
        isLifestyleMember: false,
        requiresSection21: true
    },
    {
        name: 'NeuroCalm CBD:THC 20:1 Oil',
        sku: 'MED-OIL-008',
        category: 'oils',
        track: 'medical',
        description: 'High-CBD, low-THC formulation for anxiety and seizure management. Minimal psychoactive effects with maximum therapeutic benefit.',
        shortDescription: 'High-CBD therapeutic oil',
        price: 1200.00,
        costPrice: 750.00,
        thcContent: '0.5mg/ml',
        cbdContent: '10mg/ml',
        strainType: 'hybrid',
        effects: ['anxiety relief', 'seizure reduction', 'anti-inflammatory'],
        medicalUses: ['epilepsy', 'anxiety disorders', 'PTSD', 'inflammatory conditions'],
        dosageInstructions: 'Start with 0.5ml twice daily. May be increased to 1ml three times daily as directed.',
        volume: '30ml',
        brand: 'NeuroCalm',
        supplier: 'NeuroCalm Therapeutics',
        images: [{ url: '/images/products/medical/cbd-oil.png', isPrimary: true }],
        status: 'active',
        featured: true,
        tags: ['section-21', 'prescription-only', 'high-cbd', 'epilepsy'],
        inventory: { quantity: 35, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false },
        isLifestyleMember: false,
        requiresSection21: true
    }
];

async function seedMedicalProducts() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Remove existing medical track products
        const deleteResult = await Product.deleteMany({ track: 'medical' });
        console.log(`Removed ${deleteResult.deletedCount} existing medical products`);

        // Add slugs to each product
        const productsWithSlugs = medicalProducts.map(p => ({
            ...p,
            slug: generateSlug(p.name)
        }));

        // Insert new medical products
        const insertResult = await Product.insertMany(productsWithSlugs);
        console.log(`Inserted ${insertResult.length} medical products`);

        // List inserted products
        console.log('\nMedical products seeded:');
        insertResult.forEach(p => {
            console.log(`  - ${p.name} (${p.sku}) - R${p.price.toFixed(2)}`);
        });

        console.log('\nMedical products seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding medical products:', error);
        process.exit(1);
    }
}

seedMedicalProducts();
