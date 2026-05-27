// seed-cultivation.js — Demo data seeder for cultivation dashboard
// Usage: node backend/scripts/seed-cultivation.js

const mongoose = require('mongoose');
const path = require('path');

// Load config
const config = require(path.join(__dirname, '..', 'config'));

async function seedCultivation() {
  try {
    await mongoose.connect(config.database.uri, config.database.options);
    console.log('Connected to MongoDB');

    // Load models
    const CultivationZone = require(path.join(__dirname, '..', 'modules', 'database', 'models', 'CultivationZone'));
    const CultivationBatch = require(path.join(__dirname, '..', 'modules', 'database', 'models', 'CultivationBatch'));
    const EnvironmentReading = require(path.join(__dirname, '..', 'modules', 'database', 'models', 'EnvironmentReading'));
    const HarvestRecord = require(path.join(__dirname, '..', 'modules', 'database', 'models', 'HarvestRecord'));
    const ComplianceLog = require(path.join(__dirname, '..', 'modules', 'database', 'models', 'ComplianceLog'));

    // Check if already seeded
    const existingZones = await CultivationZone.countDocuments();
    if (existingZones > 0) {
      console.log(`Cultivation data already exists (${existingZones} zones). Skipping seed.`);
      await mongoose.connection.close();
      return;
    }

    console.log('Seeding cultivation demo data...');

    // =====================
    // ZONES
    // =====================
    const zones = await CultivationZone.insertMany([
      {
        name: 'Tunnel A',
        type: 'tunnel',
        capacity: 200,
        dimensions: { length: 30, width: 8, height: 4 },
        lightType: 'natural',
        lightHours: { veg: 18, flower: 12 },
        environmentThresholds: {
          temp: { min: 21, max: 29.5 },
          humidity: { min: 50, max: 65 },
          co2: { min: 400, max: 1500 }
        },
        status: 'active'
      },
      {
        name: 'Tunnel B',
        type: 'tunnel',
        capacity: 200,
        dimensions: { length: 30, width: 8, height: 4 },
        lightType: 'supplemental',
        lightHours: { veg: 18, flower: 12 },
        environmentThresholds: {
          temp: { min: 21, max: 29.5 },
          humidity: { min: 50, max: 65 },
          co2: { min: 400, max: 1500 }
        },
        status: 'active'
      },
      {
        name: 'Indoor Room 1',
        type: 'indoor',
        capacity: 100,
        dimensions: { length: 12, width: 6, height: 3 },
        lightType: 'full_artificial',
        lightHours: { veg: 18, flower: 12 },
        environmentThresholds: {
          temp: { min: 22, max: 28 },
          humidity: { min: 45, max: 60 },
          co2: { min: 800, max: 1200 }
        },
        status: 'active'
      },
      {
        name: 'Indoor Room 2 (Mothers)',
        type: 'indoor',
        capacity: 50,
        dimensions: { length: 6, width: 4, height: 3 },
        lightType: 'full_artificial',
        lightHours: { veg: 18, flower: 12 },
        environmentThresholds: {
          temp: { min: 22, max: 28 },
          humidity: { min: 50, max: 65 },
          co2: { min: 600, max: 1000 }
        },
        status: 'active'
      },
      {
        name: 'Tunnel C (Maintenance)',
        type: 'tunnel',
        capacity: 150,
        dimensions: { length: 25, width: 6, height: 3.5 },
        lightType: 'natural',
        status: 'maintenance'
      }
    ]);

    console.log(`  Created ${zones.length} zones`);

    // =====================
    // BATCHES
    // =====================
    const now = new Date();
    const daysAgo = (d) => new Date(now - d * 24 * 60 * 60 * 1000);

    const batches = await CultivationBatch.insertMany([
      {
        batchId: 'OR-B-20260215-001',
        strain: 'White Widow',
        zoneId: zones[0]._id,
        phase: 'flowering',
        plantCount: 150,
        startDate: daysAgo(45),
        projectedHarvestDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
        targetYield: 12,
        phaseTransitions: [
          { from: null, to: 'propagation', date: daysAgo(45), notes: 'Batch created' },
          { from: 'propagation', to: 'vegetative', date: daysAgo(30), notes: 'Healthy root development' },
          { from: 'vegetative', to: 'flowering', date: daysAgo(10), notes: 'Light cycle switched to 12/12' }
        ],
        complianceChecklist: { environmentalRecords: true, batchDocumentation: true, pestManagement: true },
        status: 'active'
      },
      {
        batchId: 'OR-B-20260220-001',
        strain: 'OG Kush',
        zoneId: zones[1]._id,
        phase: 'vegetative',
        plantCount: 180,
        startDate: daysAgo(30),
        projectedHarvestDate: new Date(now.getTime() + 55 * 24 * 60 * 60 * 1000),
        targetYield: 15,
        phaseTransitions: [
          { from: null, to: 'propagation', date: daysAgo(30), notes: 'Batch created' },
          { from: 'propagation', to: 'vegetative', date: daysAgo(15), notes: 'Strong veg growth' }
        ],
        complianceChecklist: { environmentalRecords: true, batchDocumentation: true },
        status: 'active'
      },
      {
        batchId: 'OR-B-20260225-001',
        strain: 'Northern Lights',
        zoneId: zones[2]._id,
        phase: 'propagation',
        plantCount: 80,
        startDate: daysAgo(10),
        projectedHarvestDate: new Date(now.getTime() + 80 * 24 * 60 * 60 * 1000),
        targetYield: 6,
        phaseTransitions: [
          { from: null, to: 'propagation', date: daysAgo(10), notes: 'Clones taken from mothers' }
        ],
        status: 'active'
      },
      {
        batchId: 'OR-B-20260201-001',
        strain: 'Girl Scout Cookies',
        zoneId: zones[0]._id,
        phase: 'harvest_ready',
        plantCount: 120,
        startDate: daysAgo(85),
        projectedHarvestDate: daysAgo(2),
        targetYield: 10,
        phaseTransitions: [
          { from: null, to: 'propagation', date: daysAgo(85), notes: 'Batch created' },
          { from: 'propagation', to: 'vegetative', date: daysAgo(70), notes: 'Healthy growth' },
          { from: 'vegetative', to: 'flowering', date: daysAgo(40), notes: 'Switched to 12/12' },
          { from: 'flowering', to: 'harvest_ready', date: daysAgo(2), notes: 'Trichomes 70% milky, 20% amber' }
        ],
        complianceChecklist: { environmentalRecords: true, batchDocumentation: true, pestManagement: true, harvestReady: true },
        status: 'active'
      },
      {
        batchId: 'OR-B-20260110-001',
        strain: 'Blue Dream',
        zoneId: zones[1]._id,
        phase: 'complete',
        plantCount: 160,
        startDate: daysAgo(120),
        phaseTransitions: [
          { from: null, to: 'propagation', date: daysAgo(120) },
          { from: 'propagation', to: 'vegetative', date: daysAgo(105) },
          { from: 'vegetative', to: 'flowering', date: daysAgo(75) },
          { from: 'flowering', to: 'harvest_ready', date: daysAgo(30) },
          { from: 'harvest_ready', to: 'harvested', date: daysAgo(28) },
          { from: 'harvested', to: 'processing', date: daysAgo(20) },
          { from: 'processing', to: 'complete', date: daysAgo(5) }
        ],
        status: 'completed'
      }
    ]);

    console.log(`  Created ${batches.length} batches`);

    // =====================
    // ENVIRONMENT READINGS (last 30 days of data for each active zone)
    // =====================
    const readings = [];
    const activeZones = zones.filter(z => z.status === 'active');

    for (const zone of activeZones) {
      for (let d = 30; d >= 0; d--) {
        // 3 readings per day per zone
        for (let h = 0; h < 3; h++) {
          const timestamp = new Date(now - d * 24 * 60 * 60 * 1000 + h * 8 * 60 * 60 * 1000);
          const baseTemp = zone.type === 'indoor' ? 25 : 24;
          const temp = baseTemp + (Math.random() * 4 - 2); // ±2°C variation
          const humidity = 55 + (Math.random() * 10 - 5); // ±5% variation
          const co2 = zone.type === 'indoor' ? 900 + Math.floor(Math.random() * 200) : 500 + Math.floor(Math.random() * 300);
          const lightHours = zone.type === 'indoor' ? 18 : (12 + Math.random() * 4);
          const svp = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
          const vpd = Math.round(svp * (1 - humidity / 100) * 100) / 100;

          const thresholds = zone.environmentThresholds;
          const alerts = [];
          let isWithinSpec = true;

          if (temp < thresholds.temp.min || temp > thresholds.temp.max) {
            alerts.push({ parameter: 'temperature', value: temp, threshold: `range: ${thresholds.temp.min}-${thresholds.temp.max}`, severity: 'warning' });
            isWithinSpec = false;
          }
          if (humidity < thresholds.humidity.min || humidity > thresholds.humidity.max) {
            alerts.push({ parameter: 'humidity', value: humidity, threshold: `range: ${thresholds.humidity.min}-${thresholds.humidity.max}`, severity: 'warning' });
            isWithinSpec = false;
          }

          readings.push({
            zoneId: zone._id,
            timestamp,
            temperature: Math.round(temp * 10) / 10,
            humidity: Math.round(humidity * 10) / 10,
            co2,
            lightHours: Math.round(lightHours * 10) / 10,
            vpd,
            isWithinSpec,
            alerts,
            source: 'manual'
          });
        }
      }
    }

    await EnvironmentReading.insertMany(readings);
    console.log(`  Created ${readings.length} environment readings`);

    // =====================
    // HARVEST RECORDS
    // =====================
    const harvests = await HarvestRecord.insertMany([
      {
        batchId: batches[4]._id, // Blue Dream (completed)
        zoneId: zones[1]._id,
        harvestDate: daysAgo(28),
        strain: 'Blue Dream',
        plantCount: 160,
        wetWeight: 48000, // 48kg wet
        dryWeight: 11520, // ~24% yield
        trimWeight: 3200,
        wasteWeight: 1800,
        yieldPercent: 24,
        qualityGrade: 'A',
        labResults: {
          status: 'passed',
          thc: 22.4,
          cbd: 0.8,
          terpeneProfile: 'Myrcene, Pinene, Caryophyllene',
          microbiologyPassed: true
        }
      },
      {
        batchId: batches[4]._id,
        zoneId: zones[1]._id,
        harvestDate: daysAgo(60),
        strain: 'Amnesia Haze',
        plantCount: 140,
        wetWeight: 38000,
        dryWeight: 8740,
        trimWeight: 2500,
        wasteWeight: 1200,
        yieldPercent: 23,
        qualityGrade: 'A',
        labResults: {
          status: 'passed',
          thc: 20.1,
          cbd: 1.2,
          microbiologyPassed: true
        }
      },
      {
        batchId: batches[4]._id,
        zoneId: zones[0]._id,
        harvestDate: daysAgo(90),
        strain: 'White Widow',
        plantCount: 130,
        wetWeight: 35000,
        dryWeight: 7700,
        trimWeight: 2100,
        wasteWeight: 1500,
        yieldPercent: 22,
        qualityGrade: 'B',
        labResults: {
          status: 'passed',
          thc: 18.5,
          cbd: 0.5,
          microbiologyPassed: true
        }
      }
    ]);

    console.log(`  Created ${harvests.length} harvest records`);

    // =====================
    // COMPLIANCE LOGS
    // =====================
    const complianceLogs = await ComplianceLog.insertMany([
      {
        type: 'inspection',
        severity: 'info',
        title: 'Monthly facility inspection completed',
        description: 'All zones inspected. No issues found. SAHPRA Section 22C documentation up to date.',
        createdAt: daysAgo(5)
      },
      {
        type: 'environmental_breach',
        severity: 'warning',
        title: 'Temperature spike in Tunnel A',
        description: 'Temperature reached 31.2°C for 2 hours during heatwave. Ventilation adjusted.',
        zoneId: zones[0]._id,
        resolvedAt: daysAgo(13),
        createdAt: daysAgo(14)
      },
      {
        type: 'document_upload',
        severity: 'info',
        title: 'Lab certification uploaded',
        description: 'Annual lab partner certification renewed for 2026.',
        documents: [{
          name: 'Lab Certificate 2026.pdf',
          uploadedAt: daysAgo(20),
          expiryDate: new Date('2027-03-01')
        }],
        createdAt: daysAgo(20)
      },
      {
        type: 'waste_disposal',
        severity: 'info',
        title: 'Waste disposal — Blue Dream trim',
        description: '1.8kg of waste material from Blue Dream harvest disposed of per SAHPRA protocol.',
        batchId: batches[4]._id,
        createdAt: daysAgo(25)
      },
      {
        type: 'audit_generated',
        severity: 'info',
        title: 'Quarterly audit package generated',
        description: 'Q4 2025 audit package generated for SAHPRA submission.',
        createdAt: daysAgo(35)
      }
    ]);

    console.log(`  Created ${complianceLogs.length} compliance logs`);
    console.log('\nCultivation demo data seeded successfully!');

    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  } catch (error) {
    console.error('Error seeding cultivation data:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedCultivation();
