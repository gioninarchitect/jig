// Cultivation Controller — All cultivation dashboard API logic
const logger = require('../modules/logger');
const CultivationZone = require('../modules/database/models/CultivationZone');
const CultivationBatch = require('../modules/database/models/CultivationBatch');
const EnvironmentReading = require('../modules/database/models/EnvironmentReading');
const HarvestRecord = require('../modules/database/models/HarvestRecord');
const ComplianceLog = require('../modules/database/models/ComplianceLog');

// ============================================
// ZONES
// ============================================

exports.listZones = async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = { isActive: true };
    if (status) query.status = status;
    if (type) query.type = type;

    const zones = await CultivationZone.find(query).sort({ name: 1 });

    // Attach latest reading + batch count to each zone
    const zonesWithData = await Promise.all(zones.map(async (zone) => {
      const zoneObj = zone.toJSON();
      const [latestReading, batchCount] = await Promise.all([
        EnvironmentReading.findOne({ zoneId: zone._id }).sort({ timestamp: -1 }).lean(),
        CultivationBatch.countDocuments({ zoneId: zone._id, status: 'active' })
      ]);
      zoneObj.latestReading = latestReading || null;
      zoneObj.activeBatchCount = batchCount;
      return zoneObj;
    }));

    res.json({ success: true, zones: zonesWithData });
  } catch (error) {
    logger.error('Error listing zones:', error);
    res.status(500).json({ success: false, message: 'Failed to list zones' });
  }
};

exports.createZone = async (req, res) => {
  try {
    const zone = new CultivationZone({
      ...req.body,
      createdBy: req.user?._id || req.user?.id
    });
    await zone.save();
    res.status(201).json({ success: true, zone });
  } catch (error) {
    logger.error('Error creating zone:', error);
    res.status(500).json({ success: false, message: 'Failed to create zone' });
  }
};

exports.updateZone = async (req, res) => {
  try {
    const zone = await CultivationZone.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }
    res.json({ success: true, zone });
  } catch (error) {
    logger.error('Error updating zone:', error);
    res.status(500).json({ success: false, message: 'Failed to update zone' });
  }
};

exports.getZone = async (req, res) => {
  try {
    const zone = await CultivationZone.findById(req.params.id);
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    const zoneObj = zone.toJSON();

    const [latestReadings, activeBatches] = await Promise.all([
      EnvironmentReading.find({ zoneId: zone._id }).sort({ timestamp: -1 }).limit(10).lean(),
      CultivationBatch.find({ zoneId: zone._id, status: 'active' }).lean()
    ]);

    zoneObj.latestReadings = latestReadings;
    zoneObj.activeBatches = activeBatches;

    res.json({ success: true, zone: zoneObj });
  } catch (error) {
    logger.error('Error getting zone:', error);
    res.status(500).json({ success: false, message: 'Failed to get zone' });
  }
};

// ============================================
// BATCHES
// ============================================

exports.listBatches = async (req, res) => {
  try {
    const { phase, zone, status = 'active' } = req.query;
    const query = {};
    if (phase) query.phase = phase;
    if (zone) query.zoneId = zone;
    if (status) query.status = status;

    const batches = await CultivationBatch.find(query)
      .populate('zoneId', 'name type')
      .sort({ createdAt: -1 });

    res.json({ success: true, batches });
  } catch (error) {
    logger.error('Error listing batches:', error);
    res.status(500).json({ success: false, message: 'Failed to list batches' });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const batch = new CultivationBatch({
      ...req.body,
      createdBy: req.user?._id || req.user?.id,
      phaseTransitions: [{
        from: null,
        to: 'propagation',
        date: new Date(),
        notes: 'Batch created',
        recordedBy: req.user?._id || req.user?.id
      }]
    });
    await batch.save();
    res.status(201).json({ success: true, batch });
  } catch (error) {
    logger.error('Error creating batch:', error);
    res.status(500).json({ success: false, message: 'Failed to create batch' });
  }
};

exports.updateBatch = async (req, res) => {
  try {
    const batch = await CultivationBatch.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    res.json({ success: true, batch });
  } catch (error) {
    logger.error('Error updating batch:', error);
    res.status(500).json({ success: false, message: 'Failed to update batch' });
  }
};

exports.transitionBatch = async (req, res) => {
  try {
    const { toPhase, notes } = req.body;
    const batch = await CultivationBatch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const validTransitions = {
      propagation: ['vegetative'],
      vegetative: ['flowering'],
      flowering: ['harvest_ready'],
      harvest_ready: ['harvested'],
      harvested: ['processing'],
      processing: ['complete']
    };

    const allowed = validTransitions[batch.phase] || [];
    if (!allowed.includes(toPhase)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${batch.phase} to ${toPhase}. Allowed: ${allowed.join(', ')}`
      });
    }

    batch.phaseTransitions.push({
      from: batch.phase,
      to: toPhase,
      date: new Date(),
      notes: notes || '',
      recordedBy: req.user?._id || req.user?.id
    });
    batch.phase = toPhase;

    if (toPhase === 'complete') {
      batch.status = 'completed';
    }

    await batch.save();

    // Log compliance event for phase transitions
    await ComplianceLog.create({
      type: 'incident',
      severity: 'info',
      title: `Batch ${batch.batchId} transitioned to ${toPhase}`,
      description: notes || `Phase transition: ${batch.phase} → ${toPhase}`,
      batchId: batch._id,
      zoneId: batch.zoneId,
      createdBy: req.user?._id || req.user?.id
    });

    res.json({ success: true, batch });
  } catch (error) {
    logger.error('Error transitioning batch:', error);
    res.status(500).json({ success: false, message: 'Failed to transition batch' });
  }
};

// ============================================
// NUTRIENT & PEST LOGS
// ============================================

exports.addNutrientLog = async (req, res) => {
  try {
    const batch = await CultivationBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    batch.nutrientLog.push({
      date: req.body.date || new Date(),
      product: req.body.product,
      amount: req.body.amount,
      notes: req.body.notes || ''
    });
    await batch.save();
    res.json({ success: true, batch });
  } catch (error) {
    logger.error('Error adding nutrient log:', error);
    res.status(500).json({ success: false, message: 'Failed to add nutrient log' });
  }
};

exports.addPestLog = async (req, res) => {
  try {
    const batch = await CultivationBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    batch.pestLog.push({
      date: req.body.date || new Date(),
      observation: req.body.observation,
      action: req.body.action || '',
      recordedBy: req.user?._id || req.user?.id
    });
    await batch.save();
    res.json({ success: true, batch });
  } catch (error) {
    logger.error('Error adding pest log:', error);
    res.status(500).json({ success: false, message: 'Failed to add pest log' });
  }
};

// ============================================
// ENVIRONMENT
// ============================================

exports.listReadings = async (req, res) => {
  try {
    const { zone, from, to, limit = 100 } = req.query;
    const query = {};
    if (zone) query.zoneId = zone;
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const readings = await EnvironmentReading.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, readings });
  } catch (error) {
    logger.error('Error listing readings:', error);
    res.status(500).json({ success: false, message: 'Failed to list readings' });
  }
};

exports.createReading = async (req, res) => {
  try {
    const zone = await CultivationZone.findById(req.body.zoneId);
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    const reading = new EnvironmentReading({
      ...req.body,
      recordedBy: req.user?._id || req.user?.id
    });

    // Check against thresholds
    const alerts = [];
    const thresholds = zone.environmentThresholds || {};

    if (reading.temperature != null && thresholds.temp) {
      if (reading.temperature < thresholds.temp.min) {
        alerts.push({ parameter: 'temperature', value: reading.temperature, threshold: `min: ${thresholds.temp.min}`, severity: 'warning' });
      }
      if (reading.temperature > thresholds.temp.max) {
        alerts.push({ parameter: 'temperature', value: reading.temperature, threshold: `max: ${thresholds.temp.max}`, severity: 'critical' });
      }
    }

    if (reading.humidity != null && thresholds.humidity) {
      if (reading.humidity < thresholds.humidity.min) {
        alerts.push({ parameter: 'humidity', value: reading.humidity, threshold: `min: ${thresholds.humidity.min}`, severity: 'warning' });
      }
      if (reading.humidity > thresholds.humidity.max) {
        alerts.push({ parameter: 'humidity', value: reading.humidity, threshold: `max: ${thresholds.humidity.max}`, severity: 'critical' });
      }
    }

    if (reading.co2 != null && thresholds.co2) {
      if (reading.co2 < thresholds.co2.min || reading.co2 > thresholds.co2.max) {
        alerts.push({ parameter: 'co2', value: reading.co2, threshold: `range: ${thresholds.co2.min}-${thresholds.co2.max}`, severity: 'warning' });
      }
    }

    reading.alerts = alerts;
    reading.isWithinSpec = alerts.length === 0;

    await reading.save();

    // Create compliance log if there are alerts
    if (alerts.length > 0) {
      await ComplianceLog.create({
        type: 'environmental_breach',
        severity: alerts.some(a => a.severity === 'critical') ? 'critical' : 'warning',
        title: `Environmental breach in ${zone.name}`,
        description: alerts.map(a => `${a.parameter}: ${a.value} (${a.threshold})`).join('; '),
        zoneId: zone._id,
        createdBy: req.user?._id || req.user?.id
      });
    }

    res.status(201).json({ success: true, reading });
  } catch (error) {
    logger.error('Error creating reading:', error);
    res.status(500).json({ success: false, message: 'Failed to create reading' });
  }
};

exports.latestReadings = async (req, res) => {
  try {
    const zones = await CultivationZone.find({ isActive: true }).lean();

    const latest = await Promise.all(zones.map(async (zone) => {
      const reading = await EnvironmentReading.findOne({ zoneId: zone._id })
        .sort({ timestamp: -1 })
        .lean();
      return {
        zone: { _id: zone._id, name: zone.name, type: zone.type },
        reading: reading || null
      };
    }));

    res.json({ success: true, readings: latest });
  } catch (error) {
    logger.error('Error getting latest readings:', error);
    res.status(500).json({ success: false, message: 'Failed to get latest readings' });
  }
};

// ============================================
// HARVESTS
// ============================================

exports.listHarvests = async (req, res) => {
  try {
    const { zone, strain, from, to } = req.query;
    const query = {};
    if (zone) query.zoneId = zone;
    if (strain) query.strain = new RegExp(strain, 'i');
    if (from || to) {
      query.harvestDate = {};
      if (from) query.harvestDate.$gte = new Date(from);
      if (to) query.harvestDate.$lte = new Date(to);
    }

    const harvests = await HarvestRecord.find(query)
      .populate('batchId', 'batchId strain phase')
      .populate('zoneId', 'name type')
      .sort({ harvestDate: -1 });

    res.json({ success: true, harvests });
  } catch (error) {
    logger.error('Error listing harvests:', error);
    res.status(500).json({ success: false, message: 'Failed to list harvests' });
  }
};

exports.createHarvest = async (req, res) => {
  try {
    const data = { ...req.body };
    data.harvestedBy = req.user?._id || req.user?.id;

    // Handle file upload (scale photo)
    if (req.file) {
      data.scalePhoto = {
        url: `/uploads/cultivation/${req.file.filename}`,
        filename: req.file.originalname,
        uploadedAt: new Date()
      };
    }

    // Handle lab results from form data
    if (data.labStatus || data.thc || data.cbd) {
      data.labResults = {
        status: data.labStatus || 'pending',
        thc: data.thc ? parseFloat(data.thc) : null,
        cbd: data.cbd ? parseFloat(data.cbd) : null
      };
      delete data.labStatus;
      delete data.thc;
      delete data.cbd;
    }

    // Convert string numbers from FormData
    if (typeof data.wetWeight === 'string') data.wetWeight = parseFloat(data.wetWeight) || 0;
    if (typeof data.dryWeight === 'string') data.dryWeight = parseFloat(data.dryWeight) || 0;
    if (typeof data.trimWeight === 'string') data.trimWeight = parseFloat(data.trimWeight) || 0;
    if (typeof data.wasteWeight === 'string') data.wasteWeight = parseFloat(data.wasteWeight) || 0;
    if (typeof data.plantCount === 'string') data.plantCount = parseInt(data.plantCount) || 0;
    if (data.batchId === '') data.batchId = undefined;
    if (data.zoneId === '') data.zoneId = undefined;

    const harvest = new HarvestRecord(data);
    await harvest.save();

    // Update batch to harvested if linked
    if (harvest.batchId) {
      const batch = await CultivationBatch.findById(harvest.batchId);
      if (batch && batch.phase === 'harvest_ready') {
        batch.phaseTransitions.push({
          from: 'harvest_ready',
          to: 'harvested',
          date: new Date(),
          notes: 'Harvest recorded',
          recordedBy: req.user?._id || req.user?.id
        });
        batch.phase = 'harvested';
        await batch.save();
      }
    }

    res.status(201).json({ success: true, harvest });
  } catch (error) {
    logger.error('Error creating harvest:', error);
    res.status(500).json({ success: false, message: 'Failed to create harvest' });
  }
};

// ============================================
// COMPLIANCE
// ============================================

exports.complianceScore = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      zones,
      activeBatches,
      recentReadings,
      recentHarvests,
      unresolvedLogs,
      recentBreaches
    ] = await Promise.all([
      CultivationZone.countDocuments({ isActive: true }),
      CultivationBatch.find({ status: 'active' }).lean(),
      EnvironmentReading.countDocuments({ timestamp: { $gte: thirtyDaysAgo } }),
      HarvestRecord.countDocuments({ harvestDate: { $gte: thirtyDaysAgo } }),
      ComplianceLog.countDocuments({ resolvedAt: null, severity: { $in: ['warning', 'critical'] } }),
      ComplianceLog.countDocuments({ type: 'environmental_breach', createdAt: { $gte: thirtyDaysAgo } })
    ]);

    // Score calculation (simplified)
    const categories = {};

    // Environmental records — are zones getting regular readings?
    const readingsPerZone = zones > 0 ? recentReadings / zones : 0;
    categories.environmentalRecords = readingsPerZone >= 30 ? 'green' : readingsPerZone >= 15 ? 'yellow' : 'red';

    // Batch documentation — do active batches have complete checklists?
    const completeBatches = activeBatches.filter(b =>
      b.complianceChecklist?.environmentalRecords &&
      b.complianceChecklist?.batchDocumentation
    ).length;
    const batchRatio = activeBatches.length > 0 ? completeBatches / activeBatches.length : 1;
    categories.batchDocumentation = batchRatio >= 0.8 ? 'green' : batchRatio >= 0.5 ? 'yellow' : 'red';

    // Harvest records
    categories.harvestRecords = recentHarvests > 0 || activeBatches.filter(b => b.phase === 'harvested').length === 0 ? 'green' : 'yellow';

    // Environmental breaches
    categories.environmentalBreaches = recentBreaches === 0 ? 'green' : recentBreaches <= 3 ? 'yellow' : 'red';

    // Unresolved issues
    categories.unresolvedIssues = unresolvedLogs === 0 ? 'green' : unresolvedLogs <= 2 ? 'yellow' : 'red';

    // Overall score
    const scoreMap = { green: 100, yellow: 60, red: 20 };
    const values = Object.values(categories).map(c => scoreMap[c]);
    const overallScore = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const overallStatus = overallScore >= 80 ? 'green' : overallScore >= 50 ? 'yellow' : 'red';

    res.json({
      success: true,
      score: {
        overall: overallScore,
        status: overallStatus,
        categories,
        stats: {
          activeZones: zones,
          activeBatches: activeBatches.length,
          recentReadings,
          recentHarvests,
          unresolvedLogs,
          recentBreaches
        }
      }
    });
  } catch (error) {
    logger.error('Error calculating compliance score:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate compliance score' });
  }
};

exports.listComplianceLogs = async (req, res) => {
  try {
    const { type, severity, resolved, limit = 50 } = req.query;
    const query = {};
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (resolved === 'true') query.resolvedAt = { $ne: null };
    if (resolved === 'false') query.resolvedAt = null;

    const logs = await ComplianceLog.find(query)
      .populate('zoneId', 'name')
      .populate('batchId', 'batchId strain')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, logs });
  } catch (error) {
    logger.error('Error listing compliance logs:', error);
    res.status(500).json({ success: false, message: 'Failed to list compliance logs' });
  }
};

exports.createComplianceLog = async (req, res) => {
  try {
    const log = new ComplianceLog({
      ...req.body,
      createdBy: req.user?._id || req.user?.id
    });
    await log.save();
    res.status(201).json({ success: true, log });
  } catch (error) {
    logger.error('Error creating compliance log:', error);
    res.status(500).json({ success: false, message: 'Failed to create compliance log' });
  }
};

exports.generateAuditPackage = async (req, res) => {
  try {
    const { from, to } = req.body;
    const startDate = new Date(from);
    const endDate = new Date(to);

    const [zones, batches, readings, harvests, logs] = await Promise.all([
      CultivationZone.find({ isActive: true }).lean(),
      CultivationBatch.find({
        $or: [
          { startDate: { $gte: startDate, $lte: endDate } },
          { status: 'active' }
        ]
      }).populate('zoneId', 'name type').lean(),
      EnvironmentReading.find({
        timestamp: { $gte: startDate, $lte: endDate }
      }).populate('zoneId', 'name').sort({ timestamp: -1 }).lean(),
      HarvestRecord.find({
        harvestDate: { $gte: startDate, $lte: endDate }
      }).populate('zoneId', 'name').populate('batchId', 'batchId strain').lean(),
      ComplianceLog.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }).sort({ createdAt: -1 }).lean()
    ]);

    // Environmental summary per zone
    const envSummary = {};
    for (const r of readings) {
      const zoneName = r.zoneId?.name || 'Unknown';
      if (!envSummary[zoneName]) {
        envSummary[zoneName] = { readings: 0, breaches: 0, avgTemp: 0, avgHumidity: 0, temps: [], humidities: [] };
      }
      envSummary[zoneName].readings++;
      if (!r.isWithinSpec) envSummary[zoneName].breaches++;
      if (r.temperature) envSummary[zoneName].temps.push(r.temperature);
      if (r.humidity) envSummary[zoneName].humidities.push(r.humidity);
    }

    for (const zone of Object.keys(envSummary)) {
      const s = envSummary[zone];
      s.avgTemp = s.temps.length > 0 ? Math.round(s.temps.reduce((a, b) => a + b, 0) / s.temps.length * 10) / 10 : 0;
      s.avgHumidity = s.humidities.length > 0 ? Math.round(s.humidities.reduce((a, b) => a + b, 0) / s.humidities.length * 10) / 10 : 0;
      delete s.temps;
      delete s.humidities;
    }

    // Yield summary
    const totalWet = harvests.reduce((s, h) => s + (h.wetWeight || 0), 0);
    const totalDry = harvests.reduce((s, h) => s + (h.dryWeight || 0), 0);
    const totalWaste = harvests.reduce((s, h) => s + (h.wasteWeight || 0), 0);

    const auditPackage = {
      generatedAt: new Date(),
      period: { from: startDate, to: endDate },
      facility: {
        totalZones: zones.length,
        activeZones: zones.filter(z => z.status === 'active').length,
        zoneTypes: {
          tunnel: zones.filter(z => z.type === 'tunnel').length,
          indoor: zones.filter(z => z.type === 'indoor').length
        }
      },
      batches: {
        total: batches.length,
        byPhase: batches.reduce((acc, b) => { acc[b.phase] = (acc[b.phase] || 0) + 1; return acc; }, {}),
        byStatus: batches.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {})
      },
      environment: {
        totalReadings: readings.length,
        breaches: readings.filter(r => !r.isWithinSpec).length,
        byZone: envSummary
      },
      harvests: {
        total: harvests.length,
        totalWetWeight: totalWet,
        totalDryWeight: totalDry,
        totalWasteWeight: totalWaste,
        avgYieldPercent: totalWet > 0 ? Math.round((totalDry / totalWet) * 10000) / 100 : 0
      },
      compliance: {
        totalEvents: logs.length,
        bySeverity: logs.reduce((acc, l) => { acc[l.severity] = (acc[l.severity] || 0) + 1; return acc; }, {}),
        byType: logs.reduce((acc, l) => { acc[l.type] = (acc[l.type] || 0) + 1; return acc; }, {}),
        unresolved: logs.filter(l => !l.resolvedAt).length
      }
    };

    // Log audit generation
    await ComplianceLog.create({
      type: 'audit_generated',
      severity: 'info',
      title: `Audit package generated for ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`,
      description: `Generated by ${req.user?.firstName || 'system'}`,
      createdBy: req.user?._id || req.user?.id
    });

    res.json({ success: true, auditPackage });
  } catch (error) {
    logger.error('Error generating audit package:', error);
    res.status(500).json({ success: false, message: 'Failed to generate audit package' });
  }
};

// ============================================
// REPORTS
// ============================================

exports.generateReport = async (req, res) => {
  try {
    const { type } = req.params;
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    let report = {};

    switch (type) {
      case 'production': {
        const batches = await CultivationBatch.find({
          $or: [
            { startDate: { $gte: startDate, $lte: endDate } },
            { status: 'active' }
          ]
        }).populate('zoneId', 'name type').lean();

        const harvests = await HarvestRecord.find({
          harvestDate: { $gte: startDate, $lte: endDate }
        }).lean();

        report = {
          type: 'production',
          period: { from: startDate, to: endDate },
          batches: {
            total: batches.length,
            byPhase: batches.reduce((acc, b) => { acc[b.phase] = (acc[b.phase] || 0) + 1; return acc; }, {}),
            byStrain: batches.reduce((acc, b) => { acc[b.strain] = (acc[b.strain] || 0) + 1; return acc; }, {})
          },
          harvests: {
            count: harvests.length,
            totalDryWeight: harvests.reduce((s, h) => s + (h.dryWeight || 0), 0),
            avgYieldPercent: harvests.length > 0
              ? Math.round(harvests.reduce((s, h) => s + (h.yieldPercent || 0), 0) / harvests.length * 100) / 100
              : 0,
            byStrain: harvests.reduce((acc, h) => {
              if (!acc[h.strain]) acc[h.strain] = { count: 0, totalDry: 0 };
              acc[h.strain].count++;
              acc[h.strain].totalDry += h.dryWeight || 0;
              return acc;
            }, {})
          }
        };
        break;
      }

      case 'environmental': {
        const readings = await EnvironmentReading.find({
          timestamp: { $gte: startDate, $lte: endDate }
        }).populate('zoneId', 'name type').lean();

        const zones = {};
        for (const r of readings) {
          const zn = r.zoneId?.name || 'Unknown';
          if (!zones[zn]) zones[zn] = { count: 0, breaches: 0, temps: [], humidities: [] };
          zones[zn].count++;
          if (!r.isWithinSpec) zones[zn].breaches++;
          if (r.temperature) zones[zn].temps.push(r.temperature);
          if (r.humidity) zones[zn].humidities.push(r.humidity);
        }

        for (const z of Object.keys(zones)) {
          const d = zones[z];
          d.avgTemp = d.temps.length ? Math.round(d.temps.reduce((a, b) => a + b, 0) / d.temps.length * 10) / 10 : 0;
          d.minTemp = d.temps.length ? Math.min(...d.temps) : 0;
          d.maxTemp = d.temps.length ? Math.max(...d.temps) : 0;
          d.avgHumidity = d.humidities.length ? Math.round(d.humidities.reduce((a, b) => a + b, 0) / d.humidities.length * 10) / 10 : 0;
          delete d.temps;
          delete d.humidities;
        }

        report = {
          type: 'environmental',
          period: { from: startDate, to: endDate },
          totalReadings: readings.length,
          totalBreaches: readings.filter(r => !r.isWithinSpec).length,
          byZone: zones
        };
        break;
      }

      case 'yield': {
        const harvests = await HarvestRecord.find({
          harvestDate: { $gte: startDate, $lte: endDate }
        }).populate('zoneId', 'name type').lean();

        const byStrain = {};
        const byZone = {};
        for (const h of harvests) {
          if (!byStrain[h.strain]) byStrain[h.strain] = { count: 0, totalWet: 0, totalDry: 0 };
          byStrain[h.strain].count++;
          byStrain[h.strain].totalWet += h.wetWeight || 0;
          byStrain[h.strain].totalDry += h.dryWeight || 0;

          const zn = h.zoneId?.name || 'Unknown';
          if (!byZone[zn]) byZone[zn] = { count: 0, totalDry: 0 };
          byZone[zn].count++;
          byZone[zn].totalDry += h.dryWeight || 0;
        }

        report = {
          type: 'yield',
          period: { from: startDate, to: endDate },
          totalHarvests: harvests.length,
          totalDryWeight: harvests.reduce((s, h) => s + (h.dryWeight || 0), 0),
          byStrain,
          byZone
        };
        break;
      }

      case 'waste': {
        const harvests = await HarvestRecord.find({
          harvestDate: { $gte: startDate, $lte: endDate }
        }).lean();

        const disposals = await ComplianceLog.find({
          type: 'waste_disposal',
          createdAt: { $gte: startDate, $lte: endDate }
        }).lean();

        const destroyedBatches = await CultivationBatch.find({
          status: 'destroyed',
          updatedAt: { $gte: startDate, $lte: endDate }
        }).lean();

        report = {
          type: 'waste',
          period: { from: startDate, to: endDate },
          harvestWaste: {
            totalWasteWeight: harvests.reduce((s, h) => s + (h.wasteWeight || 0), 0),
            totalTrimWeight: harvests.reduce((s, h) => s + (h.trimWeight || 0), 0)
          },
          disposalRecords: disposals.length,
          destroyedBatches: destroyedBatches.length,
          destroyedPlants: destroyedBatches.reduce((s, b) => s + (b.plantCountDestroyed || 0), 0)
        };
        break;
      }

      default:
        return res.status(400).json({ success: false, message: `Unknown report type: ${type}` });
    }

    res.json({ success: true, report });
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};

// ============================================
// IoT SENSOR WEBHOOK
// ============================================

exports.sensorWebhook = async (req, res) => {
  try {
    const { zoneId, apiKey, readings } = req.body;

    const zone = await CultivationZone.findById(zoneId);
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    // Validate sensor API key
    const validSensor = zone.sensors.find(s => s.apiKey === apiKey);
    if (!validSensor) {
      return res.status(403).json({ success: false, message: 'Invalid sensor API key' });
    }

    const readingsList = Array.isArray(readings) ? readings : [readings];
    const saved = [];

    for (const r of readingsList) {
      const reading = new EnvironmentReading({
        zoneId: zone._id,
        temperature: r.temperature ?? r.temp ?? null,
        humidity: r.humidity ?? r.rh ?? null,
        co2: r.co2 ?? r.carbon_dioxide ?? null,
        lightHours: r.lightHours ?? r.light ?? null,
        lightIntensity: r.lightIntensity ?? r.par ?? null,
        soilMoisture: r.soilMoisture ?? r.soil ?? null,
        timestamp: r.timestamp ? new Date(r.timestamp) : new Date(),
        source: 'sensor'
      });

      // Check thresholds
      const alerts = [];
      const thresholds = zone.environmentThresholds || {};

      if (reading.temperature != null && thresholds.temp) {
        if (reading.temperature < thresholds.temp.min) {
          alerts.push({ parameter: 'temperature', value: reading.temperature, threshold: `min: ${thresholds.temp.min}`, severity: 'warning' });
        }
        if (reading.temperature > thresholds.temp.max) {
          alerts.push({ parameter: 'temperature', value: reading.temperature, threshold: `max: ${thresholds.temp.max}`, severity: 'critical' });
        }
      }

      if (reading.humidity != null && thresholds.humidity) {
        if (reading.humidity < thresholds.humidity.min) {
          alerts.push({ parameter: 'humidity', value: reading.humidity, threshold: `min: ${thresholds.humidity.min}`, severity: 'warning' });
        }
        if (reading.humidity > thresholds.humidity.max) {
          alerts.push({ parameter: 'humidity', value: reading.humidity, threshold: `max: ${thresholds.humidity.max}`, severity: 'critical' });
        }
      }

      if (reading.co2 != null && thresholds.co2) {
        if (reading.co2 < thresholds.co2.min || reading.co2 > thresholds.co2.max) {
          alerts.push({ parameter: 'co2', value: reading.co2, threshold: `range: ${thresholds.co2.min}-${thresholds.co2.max}`, severity: 'warning' });
        }
      }

      reading.alerts = alerts;
      reading.isWithinSpec = alerts.length === 0;
      await reading.save();
      saved.push(reading);

      // Log compliance breach
      if (alerts.length > 0) {
        await ComplianceLog.create({
          type: 'environmental_breach',
          severity: alerts.some(a => a.severity === 'critical') ? 'critical' : 'warning',
          title: `Sensor breach in ${zone.name}`,
          description: alerts.map(a => `${a.parameter}: ${a.value} (${a.threshold})`).join('; '),
          zoneId: zone._id,
          createdBy: null
        });
      }

      // Emit real-time WebSocket event
      try {
        const ws = require('../modules/websocket');
        ws.broadcast('cultivation:sensor_reading', {
          zoneId: zone._id,
          zoneName: zone.name,
          reading: { temperature: reading.temperature, humidity: reading.humidity, co2: reading.co2, vpd: reading.vpd, isWithinSpec: reading.isWithinSpec },
          alerts: reading.alerts
        });
        if (alerts.length > 0) {
          ws.notifyOwners('cultivation:alert', {
            type: 'environmental_breach', zoneName: zone.name, alerts: reading.alerts,
            severity: alerts.some(a => a.severity === 'critical') ? 'critical' : 'warning'
          });
        }
      } catch (wsErr) { /* WebSocket not initialized — non-critical */ }
    }

    // Update sensor lastReading timestamp
    validSensor.lastReading = new Date();
    await zone.save();

    res.status(201).json({ success: true, message: `${saved.length} reading(s) ingested`, readings: saved });
  } catch (error) {
    logger.error('Sensor webhook error:', error);
    res.status(500).json({ success: false, message: 'Failed to process sensor data' });
  }
};

// ============================================
// OVERVIEW (Dashboard KPIs)
// ============================================

exports.overview = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      activeBatches,
      totalPlants,
      recentHarvests,
      complianceResult,
      zones
    ] = await Promise.all([
      CultivationBatch.countDocuments({ status: 'active' }),
      CultivationBatch.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$plantCount' } } }
      ]),
      HarvestRecord.find({ harvestDate: { $gte: thirtyDaysAgo } }).lean(),
      // Inline mini compliance score
      ComplianceLog.countDocuments({ resolvedAt: null, severity: { $in: ['warning', 'critical'] } }),
      CultivationZone.find({ isActive: true }).lean()
    ]);

    const plantsInCultivation = totalPlants.length > 0 ? totalPlants[0].total : 0;

    const avgYield = recentHarvests.length > 0
      ? Math.round(recentHarvests.reduce((s, h) => s + (h.dryWeight || 0), 0) / recentHarvests.length / 1000 * 100) / 100
      : 0;

    // Next harvest — find earliest projected harvest date among active batches
    const nextHarvest = await CultivationBatch.findOne({
      status: 'active',
      phase: { $in: ['flowering', 'harvest_ready'] },
      projectedHarvestDate: { $gte: now }
    }).sort({ projectedHarvestDate: 1 }).lean();

    const daysToNextHarvest = nextHarvest?.projectedHarvestDate
      ? Math.ceil((new Date(nextHarvest.projectedHarvestDate) - now) / (1000 * 60 * 60 * 24))
      : null;

    // Quick compliance score
    const unresolvedCount = complianceResult;
    const complianceScore = unresolvedCount === 0 ? 100 : unresolvedCount <= 2 ? 75 : unresolvedCount <= 5 ? 50 : 25;

    res.json({
      success: true,
      overview: {
        activeBatches,
        plantsInCultivation,
        avgYieldKg: avgYield,
        complianceScore,
        complianceStatus: complianceScore >= 80 ? 'green' : complianceScore >= 50 ? 'yellow' : 'red',
        daysToNextHarvest,
        totalZones: zones.length,
        recentHarvestCount: recentHarvests.length
      }
    });
  } catch (error) {
    logger.error('Error getting overview:', error);
    res.status(500).json({ success: false, message: 'Failed to get overview' });
  }
};
