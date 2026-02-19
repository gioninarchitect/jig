// Menu Item Model - for Thaba Café café & Morija Roastery
const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },

  // Venue/Brand
  venue: {
    type: String,
    enum: ['la-brewha', 'bean-and-bud', 'both'],
    required: true
  },

  // Category
  category: {
    type: String,
    enum: [
      'coffee', 'espresso', 'specialty-drinks',
      'tea', 'smoothies', 'juices',
      'food', 'pastries', 'breakfast', 'lunch',
      'cbd-infused', 'cannabis-pairing', 'accessories'
    ],
    required: true
  },

  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  sizes: [{
    name: { type: String, required: true }, // 'Small', 'Medium', 'Large'
    price: { type: Number, required: true },
    available: { type: Boolean, default: true }
  }],

  // Availability
  available: {
    type: Boolean,
    default: true
  },
  inStock: {
    type: Boolean,
    default: true
  },

  // CBD/Cannabis Integration
  cbdInfused: {
    type: Boolean,
    default: false
  },
  cbdDosage: {
    type: String, // e.g., '10mg', '25mg'
    default: null
  },
  cannabisPairing: {
    type: Boolean,
    default: false
  },
  recommendedStrain: {
    type: String,
    default: null
  },

  // Nutritional Info (optional)
  nutrition: {
    calories: Number,
    caffeine: String, // e.g., '120mg'
    allergens: [String]
  },

  // Images
  image: {
    type: String,
    default: '/images/menu/default.jpg'
  },
  images: [String],

  // Add-ons & Customization
  customizations: [{
    name: String, // 'Extra shot', 'Oat milk', 'CBD boost'
    price: Number,
    available: Boolean
  }],

  // POS Integration
  posId: {
    type: String,
    unique: true,
    sparse: true // Allows null values while maintaining uniqueness
  },
  barcode: String,
  sku: String,

  // Timing (breakfast, lunch, all-day)
  availableTimes: {
    type: [String],
    enum: ['breakfast', 'lunch', 'dinner', 'all-day'],
    default: ['all-day']
  },

  // Popular/Featured
  featured: {
    type: Boolean,
    default: false
  },
  popular: {
    type: Boolean,
    default: false
  },
  new: {
    type: Boolean,
    default: false
  },

  // Stats
  orderCount: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },

  // Meta
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
menuItemSchema.index({ venue: 1, category: 1 });
menuItemSchema.index({ available: 1, inStock: 1 });
menuItemSchema.index({ featured: 1, popular: 1 });
menuItemSchema.index({ posId: 1 });

// Methods

// Sync from POS
menuItemSchema.methods.syncFromPOS = function(posData) {
  this.price = posData.price || this.price;
  this.available = posData.available !== undefined ? posData.available : this.available;
  this.inStock = posData.inStock !== undefined ? posData.inStock : this.inStock;
  this.name = posData.name || this.name;
  this.description = posData.description || this.description;
  return this.save();
};

// Calculate total with customizations
menuItemSchema.methods.calculatePrice = function(sizeIndex = 0, customizationIds = []) {
  let total = this.sizes.length > 0 ? this.sizes[sizeIndex].price : this.price;

  customizationIds.forEach(custId => {
    const custom = this.customizations.id(custId);
    if (custom && custom.available) {
      total += custom.price;
    }
  });

  return total;
};

// Statics

// Get menu by venue
menuItemSchema.statics.getMenuByVenue = function(venue) {
  return this.find({
    venue: { $in: [venue, 'both'] },
    available: true,
    inStock: true
  }).sort({ category: 1, popular: -1, name: 1 });
};

// Get featured items
menuItemSchema.statics.getFeatured = function(venue = null) {
  const query = { featured: true, available: true };
  if (venue) {
    query.venue = { $in: [venue, 'both'] };
  }
  return this.find(query).limit(6);
};

module.exports = mongoose.model('MenuItem', menuItemSchema);
