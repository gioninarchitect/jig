// Products Controller — Business logic extracted from routes/products.js
const fs = require('fs');
const path = require('path');
const logger = require('../modules/logger');
const config = require('../../config');
const Product = require('../modules/database/models/Product');
const BranchInventory = require('../modules/database/models/BranchInventory');

// Get all products (public endpoint for product listing)
exports.getAll = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 100,
            category,
            track,
            search,
            minPrice,
            maxPrice,
            sort = '-createdAt'
        } = req.query;

        const query = { status: 'active' };

        // Check if user is authenticated (optional auth)
        let isAuthenticated = false;

        // Internal service-to-service key (B2B wholesale proxy)
        const internalKey = process.env.INTERNAL_API_KEY || 'origin_internal_2026';
        if (req.headers['x-internal-key'] === internalKey) {
            isAuthenticated = true;
        }

        const authHeader = req.headers.authorization;
        if (!isAuthenticated && authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const jwt = require('jsonwebtoken');
                jwt.verify(token, config.auth.jwtSecret);
                isAuthenticated = true;
            } catch (err) {
                // Token invalid or expired - treat as unauthenticated
                isAuthenticated = false;
            }
        }

        // Categories safe for public viewing (no cannabis products)
        const PUBLIC_SAFE_CATEGORIES = ['accessories', 'coffee', 'merchandise', 'apparel', 'gifts', 'glassware', 'lifestyle-cbd', 'vaporizers', 'bundles'];

        // PUBLIC USERS: Only show non-cannabis categories (accessories, coffee, etc.)
        // LOGGED IN USERS: Show lifestyle track products (including flower)
        // MEDICAL: Requires Section 21 verification (handled separately)
        if (!isAuthenticated) {
            query.category = { $in: PUBLIC_SAFE_CATEGORIES };
            query.track = { $ne: 'medical' };
        } else if (track) {
            query.track = track.toLowerCase();
        }

        // Apply filters
        if (category && isAuthenticated) {
            const categories = category.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
            if (categories.length > 1) {
                query.category = { $in: categories };
            } else {
                query.category = categories[0];
            }
        } else if (category && !isAuthenticated) {
            const categories = category.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
            const safeCategories = categories.filter(c => PUBLIC_SAFE_CATEGORIES.includes(c));
            if (safeCategories.length > 1) {
                query.category = { $in: safeCategories };
            } else if (safeCategories.length === 1) {
                query.category = safeCategories[0];
            }
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [products, totalProducts] = await Promise.all([
            Product.find(query)
                .sort(sort)
                .limit(parseInt(limit))
                .skip(skip)
                .select('-__v')
                .lean(),
            Product.countDocuments(query)
        ]);

        // If branchId provided, filter to only products stocked at that branch
        const { branchId } = req.query;
        let finalProducts = products;
        let finalTotal = totalProducts;

        if (branchId) {
            const mongoose = require('mongoose');
            const branchOid = new mongoose.Types.ObjectId(branchId);

            // Get all stocked product IDs for this branch
            const branchStock = await BranchInventory.find({
                branchId: branchOid,
                quantity: { $gt: 0 }
            }).select('productId quantity').lean();

            const stockMap = {};
            const stockedIds = [];
            for (const inv of branchStock) {
                stockMap[inv.productId.toString()] = inv.quantity;
                stockedIds.push(inv.productId);
            }

            // Re-query products limited to stocked IDs
            query._id = { $in: stockedIds };
            const [branchProducts, branchTotal] = await Promise.all([
                Product.find(query)
                    .sort(sort)
                    .limit(parseInt(limit))
                    .skip(skip)
                    .select('-__v')
                    .lean(),
                Product.countDocuments(query)
            ]);

            // Overlay branch quantities
            finalProducts = branchProducts.map(p => ({
                ...p,
                inventory: {
                    ...p.inventory,
                    quantity: stockMap[p._id.toString()] || 0
                }
            }));
            finalTotal = branchTotal;
        }

        res.json({
            success: true,
            products: finalProducts,
            totalProducts: finalTotal,
            totalPages: Math.ceil(finalTotal / parseInt(limit)),
            currentPage: parseInt(page)
        });
    } catch (error) {
        logger.error('Get products error', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'Error fetching products'
        });
    }
};

// Get medical products (requires Section 21 approval)
exports.getMedical = async (req, res) => {
    try {
        // Check authentication
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required for medical products'
            });
        }

        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        let decoded;
        try {
            decoded = jwt.verify(token, config.auth.jwtSecret);
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Check user's Section 21 status
        const User = require('../modules/database/models/User');
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.section21Status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Section 21 approval required to access medical products',
                section21Status: user.section21Status || 'none'
            });
        }

        // Get medical track products
        const { limit = 20, page = 1 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [products, totalProducts] = await Promise.all([
            Product.find({
                track: 'medical',
                status: 'active'
            })
                .sort('-createdAt')
                .limit(parseInt(limit))
                .skip(skip)
                .select('-__v')
                .lean(),
            Product.countDocuments({ track: 'medical', status: 'active' })
        ]);

        res.json({
            success: true,
            products,
            totalProducts,
            totalPages: Math.ceil(totalProducts / parseInt(limit)),
            currentPage: parseInt(page)
        });
    } catch (error) {
        logger.error('Get medical products error', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'Error fetching medical products'
        });
    }
};

// Download CSV template
exports.getTemplate = (req, res) => {
    const templatePath = path.join(__dirname, '../../templates/product-upload-template.csv');

    if (!fs.existsSync(templatePath)) {
        return res.status(404).json({
            success: false,
            message: 'Template file not found'
        });
    }

    res.download(templatePath, 'origin-product-upload-template.csv', (err) => {
        if (err && !res.headersSent) {
            console.error('Template download error:', err);
            res.status(500).json({
                success: false,
                message: 'Error downloading template'
            });
        }
    });
};

// Get single product by ID
exports.getById = async (req, res) => {
    // Handle special routes that might be caught by this parameter route
    const specialRoutes = ['categories', 'medical', 'template', 'bulk-upload'];
    if (specialRoutes.includes(req.params.id)) {
        if (req.params.id === 'medical') {
            return res.status(400).json({
                success: false,
                message: 'Use GET /api/v1/products/medical with authentication for medical products'
            });
        }
    }

    // Handle special routes like /categories
    if (req.params.id === 'categories') {
        try {
            // Check if user is authenticated
            let isAuthenticated = false;
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.split(' ')[1];
                    const jwt = require('jsonwebtoken');
                    jwt.verify(token, config.auth.jwtSecret);
                    isAuthenticated = true;
                } catch (err) {
                    isAuthenticated = false;
                }
            }

            // Categories safe for public viewing (no cannabis products)
            const PUBLIC_SAFE_CATEGORIES = ['accessories', 'coffee', 'merchandise', 'apparel', 'gifts'];

            let categories;
            if (!isAuthenticated) {
                categories = await Product.distinct('category', {
                    status: 'active',
                    category: { $in: PUBLIC_SAFE_CATEGORIES },
                    track: { $ne: 'medical' }
                });
            } else {
                categories = await Product.distinct('category', {
                    status: 'active',
                    track: { $ne: 'medical' }
                });
            }

            return res.json({
                success: true,
                categories: categories.filter(cat => cat)
            });
        } catch (error) {
            logger.error('Get categories error', { error: error.message, stack: error.stack });
            return res.status(500).json({
                success: false,
                message: 'Error fetching categories'
            });
        }
    }

    // Continue with normal product ID lookup
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            product
        });
    } catch (error) {
        logger.error('Get product error', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'Error fetching product'
        });
    }
};

// Bulk upload products from CSV
exports.bulkUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No CSV file uploaded'
            });
        }

        const csv = require('csv-parser');
        const results = [];
        const errors = [];
        let lineNumber = 1;

        // Parse CSV file
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (row) => {
                lineNumber++;
                try {
                    // Validate required fields
                    if (!row.sku || !row.name || !row.category || !row.price) {
                        errors.push({
                            line: lineNumber,
                            error: 'Missing required fields (sku, name, category, price)',
                            data: row
                        });
                        return;
                    }

                    // Prepare product data
                    const productData = {
                        sku: row.sku.trim(),
                        barcode: row.barcode?.trim(),
                        name: row.name.trim(),
                        category: row.category.trim().toLowerCase(),
                        track: row.track?.trim().toLowerCase() || 'lifestyle',
                        price: parseFloat(row.price),
                        costPrice: row.costPrice ? parseFloat(row.costPrice) : undefined,
                        stock: row.stock ? parseInt(row.stock) : 0,
                        reorderLevel: row.reorderLevel ? parseInt(row.reorderLevel) : 10,
                        description: row.description?.trim(),
                        shortDescription: row.shortDescription?.trim(),
                        thcContent: row.thcContent ? parseFloat(row.thcContent) : undefined,
                        cbdContent: row.cbdContent ? parseFloat(row.cbdContent) : undefined,
                        strainType: row.strainType?.trim().toLowerCase(),
                        effects: row.effects?.split(',').map(e => e.trim()).filter(Boolean),
                        medicalUses: row.medicalUses?.split(',').map(u => u.trim()).filter(Boolean),
                        dosageInstructions: row.dosageInstructions?.trim(),
                        volume: row.volume ? parseFloat(row.volume) : undefined,
                        weight: row.weight ? parseFloat(row.weight) : undefined,
                        unit: row.unit?.trim(),
                        brand: row.brand?.trim(),
                        supplier: row.supplier?.trim(),
                        images: row.images ? row.images.split(',').map(img => ({ url: img.trim() })) : [],
                        status: row.status?.trim().toLowerCase() || 'active',
                        featured: row.featured?.toLowerCase() === 'true',
                        tags: row.tags?.split(',').map(t => t.trim()).filter(Boolean)
                    };

                    results.push(productData);
                } catch (error) {
                    errors.push({
                        line: lineNumber,
                        error: error.message,
                        data: row
                    });
                }
            })
            .on('end', async () => {
                try {
                    // Insert products into database
                    const insertedProducts = [];
                    const duplicateSkus = [];

                    for (const productData of results) {
                        try {
                            // Check if SKU already exists
                            const existing = await Product.findOne({ sku: productData.sku });
                            if (existing) {
                                duplicateSkus.push(productData.sku);
                                continue;
                            }

                            const product = new Product(productData);
                            await product.save();
                            insertedProducts.push(product);
                        } catch (error) {
                            errors.push({
                                sku: productData.sku,
                                error: error.message
                            });
                        }
                    }

                    // Clean up uploaded file
                    fs.unlinkSync(req.file.path);

                    res.json({
                        success: true,
                        message: `Bulk upload completed. ${insertedProducts.length} products imported successfully.`,
                        imported: insertedProducts.length,
                        duplicates: duplicateSkus.length,
                        errors: errors.length,
                        details: {
                            duplicateSkus,
                            errors: errors.slice(0, 10)
                        }
                    });
                } catch (error) {
                    logger.error('Bulk upload database error', { error: error.message, stack: error.stack });
                    res.status(500).json({
                        success: false,
                        message: 'Error saving products to database',
                        error: error.message
                    });
                }
            })
            .on('error', (error) => {
                fs.unlinkSync(req.file.path);
                res.status(500).json({
                    success: false,
                    message: 'Error parsing CSV file',
                    error: error.message
                });
            });

    } catch (error) {
        logger.error('Bulk upload error', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'Error processing bulk upload',
            error: error.message
        });
    }
};

// Upload product image
exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file uploaded'
            });
        }

        // Move file to images directory
        const imagesDir = path.join(__dirname, '../../images/products');
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }

        const newPath = path.join(imagesDir, req.file.filename);
        fs.renameSync(req.file.path, newPath);

        const imageUrl = `/images/products/${req.file.filename}`;

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl: imageUrl,
            filename: req.file.filename
        });
    } catch (error) {
        logger.error('Image upload error', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'Error uploading image',
            error: error.message
        });
    }
};

// Export all products to CSV
exports.exportProducts = async (req, res) => {
    try {
        const products = await Product.find({}).lean();

        // Convert to CSV format
        const csvHeaders = 'sku,barcode,name,category,track,price,costPrice,stock,reorderLevel,description,shortDescription,thcContent,cbdContent,strainType,effects,medicalUses,dosageInstructions,volume,weight,unit,brand,supplier,images,status,featured,tags\n';

        const csvRows = products.map(p => {
            return [
                p.sku,
                p.barcode || '',
                p.name,
                p.category,
                p.track || 'lifestyle',
                p.price,
                p.costPrice || '',
                p.stock || 0,
                p.reorderLevel || 10,
                `"${(p.description || '').replace(/"/g, '""')}"`,
                `"${(p.shortDescription || '').replace(/"/g, '""')}"`,
                p.thcContent || '',
                p.cbdContent || '',
                p.strainType || '',
                `"${(p.effects || []).join(',')}"`,
                `"${(p.medicalUses || []).join(',')}"`,
                `"${(p.dosageInstructions || '').replace(/"/g, '""')}"`,
                p.volume || '',
                p.weight || '',
                p.unit || '',
                p.brand || '',
                p.supplier || '',
                `"${(p.images || []).map(img => img.url).join(',')}"`,
                p.status || 'active',
                p.featured || false,
                `"${(p.tags || []).join(',')}"`,
            ].join(',');
        }).join('\n');

        const csvOutput = csvHeaders + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="products-export-${Date.now()}.csv"`);
        res.send(csvOutput);
    } catch (error) {
        logger.error('Export products error', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'Error exporting products',
            error: error.message
        });
    }
};

// Get product stats (totals for inventory dashboard)
exports.getStats = async (req, res) => {
    try {
        const [totalProducts, activeProducts, supplierCount] = await Promise.all([
            Product.countDocuments(),
            Product.countDocuments({ status: 'active' }),
            Product.distinct('supplier').then(s => s.filter(Boolean).length)
        ]);
        res.json({ success: true, totalProducts, activeProducts, supplierCount });
    } catch (error) {
        logger.error('Product stats error', { error: error.message });
        res.status(500).json({ success: false, message: 'Error fetching product stats' });
    }
};

// Get distinct product categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await Product.distinct('category', { status: 'active' });
        res.json({ success: true, categories: categories.filter(Boolean).sort() });
    } catch (error) {
        logger.error('Product categories error', { error: error.message });
        res.status(500).json({ success: false, message: 'Error fetching categories' });
    }
};

// Update product stock (for POS inventory management)
exports.updateStock = async (req, res) => {
    try {
        const { quantity, action = 'add' } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const currentStock = product.inventory?.quantity || 0;
        let newStock;

        if (action === 'add') {
            newStock = currentStock + quantity;
        } else if (action === 'subtract') {
            newStock = Math.max(0, currentStock - quantity);
        } else if (action === 'set') {
            newStock = quantity;
        } else {
            return res.status(400).json({ success: false, message: 'Invalid action. Use add, subtract, or set.' });
        }

        product.inventory = product.inventory || {};
        product.inventory.quantity = newStock;
        await product.save();

        logger.info('Stock updated', { productId: req.params.id, action, quantity, newStock, userId: req.user.id });

        res.json({
            success: true,
            message: 'Stock updated successfully',
            product: {
                _id: product._id,
                name: product.name,
                previousStock: currentStock,
                newStock: newStock
            }
        });
    } catch (error) {
        logger.error('Stock update error', { error: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Error updating stock' });
    }
};
