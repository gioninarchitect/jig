// Menu Boards Controller — All business logic for menu board routes
const MenuBoard = require('../modules/database/models/MenuBoard');
const Product = require('../modules/database/models/Product');

// GET /display/:id — Public, for LED screens
async function getDisplay(req, res) {
  try {
    const board = await MenuBoard.findById(req.params.id)
      .populate('branch', 'name');

    if (!board || !board.isActive) {
      return res.status(404).json({ success: false, message: 'Menu board not found' });
    }

    // Get products for display categories
    const query = {
      status: 'active',
      category: { $in: board.displayCategories }
    };

    const products = await Product.find(query)
      .select('name price category subcategory images inventory.quantity')
      .sort('category name')
      .lean();

    // Get active promotions
    const now = new Date();
    const activePromos = board.promotions.filter(p =>
      p.active &&
      (!p.startDate || p.startDate <= now) &&
      (!p.endDate || p.endDate >= now)
    );

    res.json({
      success: true,
      data: {
        board: {
          name: board.name,
          layout: board.layout,
          columns: board.columns,
          theme: board.theme,
          backgroundColor: board.backgroundColor,
          textColor: board.textColor,
          accentColor: board.accentColor,
          showPrices: board.showPrices,
          showStock: board.showStock,
          showImages: board.showImages,
          rotationEnabled: board.rotationEnabled,
          rotationInterval: board.rotationInterval
        },
        products,
        promotions: activePromos,
        branch: board.branch
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// GET / — Admin, list all menu boards
async function getAll(req, res) {
  try {
    const { branch } = req.query;
    const query = branch ? { branch } : {};

    const boards = await MenuBoard.find(query)
      .populate('branch', 'name code')
      .sort('-createdAt');

    res.json({ success: true, menuBoards: boards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// POST / — Create menu board
async function create(req, res) {
  try {
    const board = new MenuBoard(req.body);
    await board.save();

    // Populate branch for response
    await board.populate('branch', 'name code');

    res.status(201).json({ success: true, menuBoard: board });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

// PUT /:id — Update menu board
async function update(req, res) {
  try {
    const board = await MenuBoard.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('branch', 'name code');

    if (!board) {
      return res.status(404).json({ success: false, message: 'Menu board not found' });
    }
    res.json({ success: true, menuBoard: board });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

// DELETE /:id — Delete menu board
async function remove(req, res) {
  try {
    const board = await MenuBoard.findByIdAndDelete(req.params.id);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Menu board not found' });
    }
    res.json({ success: true, message: 'Menu board deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getDisplay,
  getAll,
  create,
  update,
  remove
};
