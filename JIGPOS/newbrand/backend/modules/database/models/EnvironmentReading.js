// Environment Reading Model — Sensor/manual environmental data for cultivation zones
const mongoose = require('mongoose');

const environmentReadingSchema = new mongoose.Schema({
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CultivationZone',
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    index: true,
    default: 'ilco'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  temperature: {
    type: Number
  },
  humidity: {
    type: Number
  },
  co2: {
    type: Number
  },
  lightHours: {
    type: Number
  },
  lightIntensity: {
    type: Number
  },
  soilMoisture: {
    type: Number
  },
  vpd: {
    type: Number
  },
  isWithinSpec: {
    type: Boolean,
    default: true
  },
  alerts: [{
    parameter: String,
    value: Number,
    threshold: String,
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'warning'
    }
  }],
  source: {
    type: String,
    enum: ['manual', 'sensor', 'api'],
    default: 'manual'
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Calculate VPD before saving
environmentReadingSchema.pre('save', function(next) {
  // VPD = SVP * (1 - RH/100) where SVP = 0.6108 * exp(17.27 * T / (T + 237.3))
  if (this.temperature != null && this.humidity != null && this.vpd == null) {
    const t = this.temperature;
    const rh = this.humidity;
    const svp = 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
    this.vpd = Math.round(svp * (1 - rh / 100) * 100) / 100;
  }
  next();
});

environmentReadingSchema.index({ zoneId: 1, timestamp: -1 });
environmentReadingSchema.index({ tenantId: 1, timestamp: -1 });
environmentReadingSchema.index({ isWithinSpec: 1, timestamp: -1 });

module.exports = mongoose.model('EnvironmentReading', environmentReadingSchema);
