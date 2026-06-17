// Product Model - Max 200 lines
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  slug: {
    type: String,
    unique: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: String,
  
  // SKU & Identifiers
  sku: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  barcode: String,
  
  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  wholesalePrice: {
    type: Number,
    min: 0
  },
  compareAtPrice: Number,
  costPrice: Number,

  // Wholesale settings
  minWholesaleQty: {
    type: Number,
    default: 10,
    min: 1
  },
  wholesaleTiers: [{
    minQty: Number,
    pricePerUnit: Number
  }],
  
  // Categories & Tags (SA Medical Cannabis & Pickup Point Categories)
  category: {
    type: String,
    required: true,
    enum: [
      // Lifestyle Track (Public Shop - NO CANNABIS, accessories only)
      'accessories',          // Grinders, papers, pipes, storage, lighters
      'glassware',           // Bongs, water pipes, bubblers
      'vaporizers',          // Dry herb vapes, concentrate vapes, pen vapes
      'lifestyle-cbd',       // CBD oils, edibles, topicals (NON-MEDICAL, public)
      'coffee',              // Morija Roastery, Thaba Café coffee products
      'merchandise',         // Branded apparel, accessories
      'bundles',             // Product bundles and packages

      // Medical Track (Section 21 Required - User Dashboard ONLY)
      'flower',              // Dried cannabis flower (Indica, Sativa, Hybrid)
      'pre-rolls',           // Pre-rolled joints
      'concentrates',        // Shatter, wax, live resin, distillate, hash
      'edibles',             // Capsules, tablets, lozenges, chocolates
      'oils',                // THC oils, CBD oils, balanced oils, tinctures
      'topicals',            // Creams, balms, patches, salves
      'vapes',               // Medical vape cartridges (THC/CBD)

      // Wellness & Pharmacy Track (Potchefstroom expansion)
      'supplements',         // Health supplements (Lamelle, HM capsules/powders)
      'pharmacy',            // OTC pharmaceutical products (Lamelle Nia-Sol)
      'skincare',            // Skincare range (Lamelle topicals)
      'haircare',            // Hair care products
      'nail-care',           // Nail gel products (Bio Sculpture Gemini)
      'wellness',            // Functional wellness (HM mushrooms, botanicals)
      'teas',                // Herbal teas (Origin Teas — OT range)
      'mushrooms'            // Medicinal mushrooms (Harmonic Mycology)
    ],
    index: true
  },
  subcategory: {
    type: String,
    enum: [
      // Accessories subcategories
      'grinders', 'papers', 'filters', 'lighters', 'storage', 'pipes', 'cleaning',
      // Glassware subcategories
      'water-pipes', 'bubblers', 'dab-rigs', 'down-stems', 'bowls',
      // Vaporizers subcategories (lifestyle)
      'portable-vapes', 'desktop-vapes', 'pen-vapes',
      // CBD subcategories (non-medical)
      'cbd-oils', 'cbd-edibles', 'cbd-topicals', 'cbd-vapes', 'cbd-beverages',
      // Coffee subcategories
      'cbd-coffee', 'specialty-blends', 'brewing-equipment',

      // Medical flower subcategories (SA genetics)
      'indica', 'sativa', 'hybrid',
      // Pre-roll subcategories
      'single-joint', '5-pack', '10-pack',
      // Concentrates subcategories
      'shatter', 'wax', 'live-resin', 'distillate', 'hash', 'rosin',
      // Edibles subcategories
      'capsules', 'tablets', 'lozenges', 'chocolates', 'gummies',
      // Oils subcategories
      'thc-oil', 'cbd-oil', 'balanced-oil', 'tinctures',
      // Topicals subcategories
      'creams', 'balms', 'patches', 'salves',
      // Medical vapes subcategories
      'thc-cartridges', 'cbd-cartridges', 'balanced-cartridges',
      // Wellness & Pharmacy subcategories
      'capsules-supp', 'powder', 'extract', 'tincture', 'botanical',
      'grow-kit', 'wellness-bundle', 'mushroom', 'herbal-tea',
      'gel-colour', 'nail-treatment', 'nail-tool',
      'anti-ageing', 'scar-repair', 'uv-protection', 'womens-health', 'mens-health'
    ]
  },
  tags: [{
    type: String,
    index: true
  }],

  // Track: lifestyle (public shop) vs medical (Section 21 required)
  track: {
    type: String,
    enum: ['lifestyle', 'medical'],
    default: 'lifestyle',
    index: true
  },
  
  // Images & Media
  images: [{
    url: String,
    alt: String,
    isPrimary: Boolean
  }],
  videos: [{
    url: String,
    thumbnail: String,
    title: String
  }],
  
  // Variants
  hasVariants: {
    type: Boolean,
    default: false
  },
  sizes: [{
    type: String,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']
  }],
  colors: [{
    name: String,
    hex: String
  }],
  
  // Inventory (linked to Inventory model for detailed tracking)
  inventory: {
    quantity: {
      type: Number,
      default: 0,
      min: 0
    },
    reserved: {
      type: Number,
      default: 0,
      min: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 10
    },
    trackQuantity: {
      type: Boolean,
      default: true
    },
    allowBackorder: {
      type: Boolean,
      default: false
    }
  },
  
  // Product Status
  status: {
    type: String,
    enum: ['active', 'draft', 'archived', 'out_of_stock'],
    default: 'active',
    index: true
  },

  // MDC Pipeline Stage
  mdcStage: {
    type: String,
    enum: ['pending', 'qa', 'approved', 'live'],
    default: 'pending',
    index: true
  },
  mdcApprovedAt: Date,
  mdcApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  mdcNotes: String,

  isPublished: {
    type: Boolean,
    default: true
  },
  publishedAt: Date,
  
  // Features & Specifications
  features: [String],
  specifications: [{
    name: String,
    value: String
  }],
  
  // Shipping
  weight: Number, // in grams
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  shippingClass: {
    type: String,
    enum: ['standard', 'fragile', 'oversized'],
    default: 'standard'
  },
  requiresShipping: {
    type: Boolean,
    default: true
  },
  
  // Bundle Information
  isBundle: {
    type: Boolean,
    default: false
  },
  bundleItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    quantity: Number
  }],
  includesVoucher: {
    type: Boolean,
    default: false
  },
  
  // SEO
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  
  // Membership Requirements
  requiresMembership: {
    type: Boolean,
    default: false
  },
  membershipTiers: [{
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond']
  }],

  // Section 21 Medical Cannabis Requirement
  requiresSection21: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  purchases: {
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
  
  // Wholesale
  wholesalePrice: Number,
  minimumOrderQuantity: {
    type: Number,
    default: 1
  },
  
  // Flags
  isFeatured: {
    type: Boolean,
    default: false
  },
  isNewArrival: {
    type: Boolean,
    default: false
  },
  isOnSale: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ 'rating.average': -1 });
productSchema.index({ createdAt: -1 });

// Virtual for available quantity
productSchema.virtual('availableQuantity').get(function() {
  return this.inventory.quantity - this.inventory.reserved;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

// Generate slug before saving
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Indexes for query optimization
productSchema.index({ category: 1, status: 1 }); // For filtering products by category and status
productSchema.index({ status: 1, isFeatured: 1 }); // For featured products
productSchema.index({ requiresSection21: 1, status: 1 }); // For medical vs non-medical products
productSchema.index({ createdAt: -1 }); // For sorting by newest
productSchema.index({ 'inventory.quantity': 1 }); // For stock availability queries
productSchema.index({ mdcStage: 1, track: 1 }); // For MDC pipeline queries

module.exports = mongoose.model('Product', productSchema);