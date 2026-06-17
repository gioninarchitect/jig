// Recipe Controller — All business logic for recipe routes
const Recipe = require('../modules/database/models/Recipe');
const Product = require('../modules/database/models/Product');

// GET / — List recipes with category/active filters
async function getAll(req, res) {
  try {
    const { category, active } = req.query;
    const query = {};
    if (category) query.category = category;
    if (active !== undefined) query.isActive = active === 'true';

    const recipes = await Recipe.find(query)
      .populate('product', 'name sku price')
      .populate('ingredients.product', 'name sku costPrice')
      .populate('createdBy', 'name')
      .sort('name');

    res.json({ success: true, data: recipes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// GET /:id — Single recipe with availability check and maxBatches calc
async function getById(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate('product', 'name sku price images')
      .populate('ingredients.product', 'name sku costPrice inventory.quantity')
      .populate('createdBy', 'name')
      .populate('lastUpdatedBy', 'name');

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    // Check ingredient availability
    const availability = recipe.ingredients.map(ing => {
      if (ing.product) {
        const available = ing.product.inventory?.quantity || 0;
        const needed = ing.quantity * ing.wasteFactor;
        return {
          name: ing.product.name,
          needed,
          available,
          canMake: Math.floor(available / needed)
        };
      }
      return { name: ing.name, needed: ing.quantity, available: 'N/A', canMake: 'N/A' };
    });

    const maxBatches = Math.min(
      ...availability.filter(a => typeof a.canMake === 'number').map(a => a.canMake)
    );

    res.json({
      success: true,
      data: {
        recipe,
        availability,
        maxBatches: isFinite(maxBatches) ? maxBatches : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// POST /calculate — Preview recipe cost without saving
async function calculate(req, res) {
  try {
    const { ingredients, laborMinutes, laborCostPerHour, packagingCost, yieldQuantity, targetMargin } = req.body;

    let totalIngredientCost = 0;
    const calculatedIngredients = [];

    for (const ing of ingredients) {
      let costPerUnit = ing.costPerUnit;

      // If product ID provided, get current cost price
      if (ing.product) {
        const product = await Product.findById(ing.product);
        if (product) {
          costPerUnit = product.costPrice || 0;
        }
      }

      const totalCost = ing.quantity * costPerUnit * (ing.wasteFactor || 1);
      totalIngredientCost += totalCost;
      calculatedIngredients.push({ ...ing, costPerUnit, totalCost });
    }

    const totalLaborCost = (laborMinutes / 60) * laborCostPerHour;
    const totalCost = totalIngredientCost + totalLaborCost + (packagingCost || 0);
    const costPerUnit = yieldQuantity > 0 ? totalCost / yieldQuantity : 0;
    const suggestedPrice = targetMargin > 0 && targetMargin < 100
      ? costPerUnit / (1 - targetMargin / 100)
      : costPerUnit * 2;

    res.json({
      success: true,
      data: {
        ingredients: calculatedIngredients,
        totalIngredientCost,
        totalLaborCost,
        packagingCost: packagingCost || 0,
        totalCost,
        costPerUnit,
        suggestedPrice,
        margin: targetMargin
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

// POST / — Create recipe, sets createdBy from req.user.id
async function create(req, res) {
  try {
    const recipe = new Recipe({
      ...req.body,
      createdBy: req.user.id
    });
    await recipe.save();

    const populated = await Recipe.findById(recipe._id)
      .populate('product', 'name sku')
      .populate('ingredients.product', 'name sku');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

// PUT /:id — Update recipe, sets lastUpdatedBy
async function update(req, res) {
  try {
    const recipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdatedBy: req.user.id },
      { new: true, runValidators: true }
    ).populate('product', 'name sku')
     .populate('ingredients.product', 'name sku');

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }
    res.json({ success: true, data: recipe });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

// POST /:id/clone — Clone recipe for versioning
async function clone(req, res) {
  try {
    const original = await Recipe.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    const cloned = new Recipe({
      ...original.toObject(),
      _id: undefined,
      name: `${original.name} (Copy)`,
      version: original.version + 1,
      createdBy: req.user.id,
      createdAt: undefined,
      updatedAt: undefined
    });
    await cloned.save();

    res.status(201).json({ success: true, data: cloned });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

// DELETE /:id — Delete recipe (owner only)
async function remove(req, res) {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }
    res.json({ success: true, message: 'Recipe deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAll,
  getById,
  calculate,
  create,
  update,
  clone,
  remove
};
