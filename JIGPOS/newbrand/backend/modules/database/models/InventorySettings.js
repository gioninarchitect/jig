/**
 * Inventory Settings — singleton config for inventory dashboard thresholds & notification prefs.
 * One document per deployment (upsert pattern).
 */

const mongoose = require('mongoose');

const inventorySettingsSchema = new mongoose.Schema({
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: 0
  },
  reorderPoint: {
    type: Number,
    default: 20,
    min: 0
  },
  notifications: {
    lowStock: { type: Boolean, default: true },
    newUploads: { type: Boolean, default: true },
    qaResults: { type: Boolean, default: true },
    pndComplete: { type: Boolean, default: true }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

/**
 * Get the singleton settings document — creates one with defaults if none exists.
 */
inventorySettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('InventorySettings', inventorySettingsSchema);
