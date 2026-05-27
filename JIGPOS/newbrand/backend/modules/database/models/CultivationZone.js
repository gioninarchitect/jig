// Cultivation Zone Model — Tunnel greenhouse and indoor grow room management
const mongoose = require('mongoose');

const cultivationZoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['tunnel', 'indoor'],
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    index: true
  },
  tenantId: {
    type: String,
    index: true,
    default: 'ilco'
  },
  capacity: {
    type: Number,
    default: 0,
    min: 0
  },
  dimensions: {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
  },
  lightType: {
    type: String,
    enum: ['natural', 'supplemental', 'full_artificial'],
    default: 'natural'
  },
  lightHours: {
    veg: { type: Number, default: 18 },
    flower: { type: Number, default: 12 }
  },
  environmentThresholds: {
    temp: {
      min: { type: Number, default: 21 },
      max: { type: Number, default: 29.5 }
    },
    humidity: {
      min: { type: Number, default: 45 },
      max: { type: Number, default: 65 }
    },
    co2: {
      min: { type: Number, default: 400 },
      max: { type: Number, default: 1500 }
    }
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  },
  sensors: [{
    type: { type: String },
    serialNumber: String,
    apiKey: String,
    lastReading: Date
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

cultivationZoneSchema.index({ tenantId: 1, status: 1 });
cultivationZoneSchema.index({ branchId: 1, isActive: 1 });

module.exports = mongoose.model('CultivationZone', cultivationZoneSchema);
