// Menu Board Configuration Model
const mongoose = require('mongoose');

const menuBoardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null  // null = All Branches
  },
  // Direct product selection (alternative to categories)
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  // Display settings
  layout: {
    type: String,
    enum: ['grid', 'list', 'carousel', 'split'],
    default: 'grid'
  },
  columns: {
    type: Number,
    default: 3,
    min: 1,
    max: 6
  },
  // What to display
  displayCategories: [{
    type: String,
    enum: ['flower', 'pre-rolls', 'concentrates', 'edibles', 'oils', 'vapes', 'accessories']
  }],
  showPrices: {
    type: Boolean,
    default: true
  },
  showStock: {
    type: Boolean,
    default: false
  },
  showImages: {
    type: Boolean,
    default: true
  },
  // Styling
  theme: {
    type: String,
    enum: ['dark', 'light', 'brand'],
    default: 'dark'
  },
  backgroundColor: {
    type: String,
    default: '#0A0A0A'
  },
  textColor: {
    type: String,
    default: '#0A0A0A'
  },
  accentColor: {
    type: String,
    default: '#D97706'
  },
  // Rotation settings
  rotationEnabled: {
    type: Boolean,
    default: true
  },
  rotationInterval: {
    type: Number,
    default: 10000, // 10 seconds
    min: 3000
  },
  // Promotions overlay
  promotions: [{
    title: String,
    description: String,
    image: String,
    startDate: Date,
    endDate: Date,
    active: { type: Boolean, default: true }
  }],
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MenuBoard', menuBoardSchema);
