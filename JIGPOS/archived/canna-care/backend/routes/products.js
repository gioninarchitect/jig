// Product Management Routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Product = require('../modules/database/models/Product');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        if (file.fieldname === 'csvFile') {
            if (!file.originalname.match(/\.(csv)$/)) {
                return cb(new Error('Only CSV files are allowed'));
            }
        } else if (file.fieldname === 'productImage') {
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
                return cb(new Error('Only image files are allowed'));
            }
        }
        cb(null, true);
    }
});

// Get all products (public endpoint for product listing)
router.get('/', async (req, res) => {
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

        // Apply filters
        if (category) query.category = category.toLowerCase();
        if (track) query.track = track.toLowerCase();
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

        res.json({
            success: true,
            products,
            totalProducts,
            totalPages: Math.ceil(totalProducts / parseInt(limit)),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products'
        });
    }
});

// Get single product by ID (must check if it's a valid ObjectId first)
router.get('/:id', async (req, res) => {
    // Handle special routes like /categories
    if (req.params.id === 'categories') {
        try {
            const categories = await Product.distinct('category', { status: 'active' });
            return res.json({
                success: true,
                categories: categories.filter(cat => cat) // Filter out null/undefined
            });
        } catch (error) {
            console.error('Get categories error:', error);
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
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching product'
        });
    }
});

// Download CSV template
router.get('/template', authenticateToken, requireRole(['admin']), (req, res) => {
    const templatePath = path.join(__dirname, '../../templates/product-upload-template.csv');
    res.download(templatePath, 'cbd-wellness-product-template.csv');
});

// Bulk upload products from CSV
router.post('/bulk-upload', authenticateToken, requireRole(['admin']), upload.single('csvFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No CSV file uploaded'
            });
        }

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
                            errors: errors.slice(0, 10) // Return first 10 errors
                        }
                    });
                } catch (error) {
                    console.error('Bulk upload database error:', error);
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
        console.error('Bulk upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing bulk upload',
            error: error.message
        });
    }
});

// Upload product image
router.post('/image-upload', authenticateToken, requireRole(['admin']), upload.single('productImage'), async (req, res) => {
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
        console.error('Image upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading image',
            error: error.message
        });
    }
});

// Export all products to CSV
router.get('/export', authenticateToken, requireRole(['admin']), async (req, res) => {
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

        const csv = csvHeaders + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="products-export-${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Export products error:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting products',
            error: error.message
        });
    }
});

module.exports = router;
