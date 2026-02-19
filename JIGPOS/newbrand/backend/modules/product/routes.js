// Product Management Routes
const express = require('express');
const router = express.Router();
const Product = require('../database/models/Product');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');

// Search products with advanced filters
router.get('/search', async (req, res) => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      tags,
      inStock,
      sort = 'relevance',
      page = 1,
      limit = 12
    } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Build search query
    const searchQuery = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
        { category: { $regex: q, $options: 'i' } }
      ]
    };

    // Add filters
    if (category) searchQuery.category = category;
    if (minPrice || maxPrice) {
      searchQuery.price = {};
      if (minPrice) searchQuery.price.$gte = parseFloat(minPrice);
      if (maxPrice) searchQuery.price.$lte = parseFloat(maxPrice);
    }
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      searchQuery.tags = { $in: tagArray };
    }
    if (inStock === 'true') searchQuery.stock = { $gt: 0 };

    // Determine sort order
    let sortOption = {};
    switch (sort) {
      case 'price_asc':
        sortOption = { price: 1 };
        break;
      case 'price_desc':
        sortOption = { price: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'bestselling':
        sortOption = { sold: -1 };
        break;
      case 'relevance':
      default:
        sortOption = { score: { $meta: 'textScore' } };
        break;
    }

    const products = await Product.find(searchQuery)
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const count = await Product.countDocuments(searchQuery);

    // Get aggregations for filters
    const aggregations = await Product.aggregate([
      { $match: searchQuery },
      {
        $facet: {
          categories: [
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          priceRange: [
            {
              $group: {
                _id: null,
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' }
              }
            }
          ],
          allTags: [
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ]);

    res.json({
      query: q,
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalProducts: count,
      filters: {
        categories: aggregations[0].categories,
        priceRange: aggregations[0].priceRange[0],
        popularTags: aggregations[0].allTags
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all products with pagination, filters, and search
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      search,
      sort = '-createdAt',
      inStock
    } = req.query;

    // Build query
    const query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Execute query with pagination
    const products = await Product.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const count = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalProducts: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get featured products
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.find({ featured: true })
      .limit(8)
      .select('-__v');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Product.countDocuments({ category });
        return { name: category, count };
      })
    );
    res.json(categoriesWithCount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product by ID or slug
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by ID first, then by slug
    let product = await Product.findById(identifier).catch(() => null);
    
    if (!product) {
      product = await Product.findOne({ slug: identifier });
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Increment view count
    product.views = (product.views || 0) + 1;
    await product.save();

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get related products
router.get('/:id/related', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      $or: [
        { category: product.category },
        { tags: { $in: product.tags } }
      ]
    })
    .limit(4)
    .select('-__v');

    res.json(relatedProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new product (admin only)
router.post('/', [auth, admin], upload.array('images', 5), async (req, res) => {
  try {
    const productData = {
      ...req.body,
      images: req.files ? req.files.map(file => file.path) : [],
      slug: req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    };

    // Parse arrays from form data
    if (typeof productData.tags === 'string') {
      productData.tags = productData.tags.split(',').map(tag => tag.trim());
    }
    
    if (typeof productData.sizes === 'string') {
      productData.sizes = productData.sizes.split(',').map(size => size.trim());
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update product (admin only)
router.put('/:id', [auth, admin], upload.array('images', 5), async (req, res) => {
  try {
    const updates = { ...req.body };
    
    if (req.files && req.files.length > 0) {
      updates.images = req.files.map(file => file.path);
    }

    // Parse arrays if they're strings
    if (typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map(tag => tag.trim());
    }
    
    if (typeof updates.sizes === 'string') {
      updates.sizes = updates.sizes.split(',').map(size => size.trim());
    }

    // Update slug if name changed
    if (updates.name) {
      updates.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete product (admin only)
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product stock
router.patch('/:id/stock', [auth, admin], async (req, res) => {
  try {
    const { quantity, operation = 'set' } = req.body;
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (operation === 'set') {
      product.stock = quantity;
    } else if (operation === 'add') {
      product.stock += quantity;
    } else if (operation === 'subtract') {
      product.stock = Math.max(0, product.stock - quantity);
    }

    await product.save();

    res.json({
      message: 'Stock updated successfully',
      stock: product.stock
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Toggle featured status
router.patch('/:id/featured', [auth, admin], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.featured = !product.featured;
    await product.save();

    res.json({
      message: `Product ${product.featured ? 'featured' : 'unfeatured'} successfully`,
      featured: product.featured
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk operations (admin only)
router.post('/bulk', [auth, admin], async (req, res) => {
  try {
    const { operation, productIds, data } = req.body;

    let result;
    switch (operation) {
      case 'delete':
        result = await Product.deleteMany({ _id: { $in: productIds } });
        break;
      case 'updateCategory':
        result = await Product.updateMany(
          { _id: { $in: productIds } },
          { category: data.category }
        );
        break;
      case 'updateStock':
        result = await Product.updateMany(
          { _id: { $in: productIds } },
          { stock: data.stock }
        );
        break;
      case 'toggleFeatured':
        const products = await Product.find({ _id: { $in: productIds } });
        for (const product of products) {
          product.featured = !product.featured;
          await product.save();
        }
        result = { modifiedCount: products.length };
        break;
      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }

    res.json({
      message: `Bulk ${operation} completed successfully`,
      affected: result.modifiedCount || result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;