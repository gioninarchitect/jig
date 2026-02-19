// Recipe Model for Costing
const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  // Or raw material name if not a product
  name: String,
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    enum: ['g', 'kg', 'ml', 'l', 'units', 'oz', 'lb'],
    default: 'g'
  },
  costPerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  // Waste factor (e.g., 1.1 = 10% waste)
  wasteFactor: {
    type: Number,
    default: 1,
    min: 1
  }
});

const recipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Link to finished product if applicable
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  category: {
    type: String,
    enum: ['pre-rolls', 'edibles', 'concentrates', 'topicals', 'oils', 'beverages', 'other'],
    required: true
  },
  // Recipe details
  description: String,
  instructions: String,
  // Yield
  yieldQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  yieldUnit: {
    type: String,
    enum: ['units', 'g', 'kg', 'ml', 'l'],
    default: 'units'
  },
  // Ingredients
  ingredients: [ingredientSchema],
  // Labor cost
  laborMinutes: {
    type: Number,
    default: 0
  },
  laborCostPerHour: {
    type: Number,
    default: 0
  },
  // Packaging cost
  packagingCost: {
    type: Number,
    default: 0
  },
  // Calculated costs
  totalIngredientCost: {
    type: Number,
    default: 0
  },
  totalLaborCost: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  costPerUnit: {
    type: Number,
    default: 0
  },
  // Pricing
  suggestedPrice: Number,
  targetMargin: {
    type: Number,
    default: 50, // 50% margin
    min: 0,
    max: 100
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Calculate costs before save
recipeSchema.pre('save', function(next) {
  // Calculate ingredient costs
  this.totalIngredientCost = this.ingredients.reduce((sum, ing) => {
    ing.totalCost = ing.quantity * ing.costPerUnit * ing.wasteFactor;
    return sum + ing.totalCost;
  }, 0);

  // Calculate labor cost
  this.totalLaborCost = (this.laborMinutes / 60) * this.laborCostPerHour;

  // Total cost
  this.totalCost = this.totalIngredientCost + this.totalLaborCost + this.packagingCost;

  // Cost per unit
  this.costPerUnit = this.yieldQuantity > 0 ? this.totalCost / this.yieldQuantity : 0;

  // Suggested price based on target margin
  if (this.targetMargin > 0 && this.targetMargin < 100) {
    this.suggestedPrice = this.costPerUnit / (1 - this.targetMargin / 100);
  }

  next();
});

module.exports = mongoose.model('Recipe', recipeSchema);
