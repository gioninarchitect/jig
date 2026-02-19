// Database Module - Centralized Database Management
const mongoose = require('mongoose');
const config = require('../../config');
const logger = require('../logger');

class Database {
  constructor() {
    this.connection = null;
    this.models = {};
  }

  async connect() {
    try {
      if (this.connection) {
        return this.connection;
      }

      // Set mongoose options
      mongoose.set('strictQuery', false);
      
      // Connect to MongoDB
      this.connection = await mongoose.connect(config.database.uri, config.database.options);
      
      logger.info('✅ MongoDB connected successfully');
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });
      
      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });
      
      // Initialize models
      await this.initializeModels();
      
      // Create indexes
      await this.createIndexes();
      
      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
    }
  }

  async initializeModels() {
    // Load all models
    this.models.User = require('./models/User');
    this.models.Product = require('./models/Product');
    this.models.Order = require('./models/Order');
    this.models.Payment = require('./models/Payment');
    this.models.Cart = require('./models/Cart');
    this.models.Voucher = require('./models/Voucher');
    this.models.Review = require('./models/Review');
    this.models.Notification = require('./models/Notification');
    this.models.Analytics = require('./models/Analytics');
    this.models.Inventory = require('./models/Inventory');
    this.models.Discount = require('./models/Discount');
    this.models.Referral = require('./models/Referral');
    this.models.Wishlist = require('./models/Wishlist');
    this.models.Ticket = require('./models/Ticket');
    this.models.Transaction = require('./models/Transaction');
    
    logger.info('✅ Database models initialized');
  }

  async createIndexes() {
    try {
      // User indexes
      await this.models.User.createIndexes();
      
      // Product indexes
      await this.models.Product.createIndexes();
      
      // Order indexes
      await this.models.Order.createIndexes();
      
      // Performance indexes
      await this.models.Analytics.createIndexes();
      
      logger.info('✅ Database indexes created');
    } catch (error) {
      logger.error('Error creating indexes:', error);
    }
  }

  async seed() {
    try {
      // Check if already seeded
      const productCount = await this.models.Product.countDocuments();
      if (productCount > 0) {
        logger.info('Database already seeded');
        return;
      }

      // Seed products
      const products = [
        {
          name: 'Gas Station T-Shirt',
          description: 'Premium lifestyle t-shirt',
          price: 300,
          category: 'merchandise',
          images: ['/images/tshirt.jpg'],
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Black', 'White', 'Red'],
          sku: 'LD-TSH-001',
          inventory: {
            quantity: 100,
            reserved: 0,
            lowStockThreshold: 10
          }
        },
        {
          name: 'Lifestyle Hoodie',
          description: 'Exclusive member hoodie',
          price: 699,
          category: 'merchandise',
          images: ['/images/hoodie.jpg'],
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Black', 'Grey'],
          sku: 'LD-HOD-001',
          inventory: {
            quantity: 50,
            reserved: 0,
            lowStockThreshold: 5
          }
        },
        {
          name: 'LD Cap',
          description: 'Snapback lifestyle cap',
          price: 199,
          category: 'accessories',
          images: ['/images/cap.jpg'],
          sizes: ['One Size'],
          colors: ['Black', 'Red'],
          sku: 'LD-CAP-001',
          inventory: {
            quantity: 75,
            reserved: 0,
            lowStockThreshold: 10
          }
        },
        {
          name: 'Lifestyle Combo Pack',
          description: 'T-Shirt + Hoodie + Cap + Friend Voucher',
          price: 1199,
          category: 'bundles',
          images: ['/images/combo.jpg'],
          sku: 'LD-CMB-001',
          inventory: {
            quantity: 30,
            reserved: 0,
            lowStockThreshold: 5
          },
          bundleItems: ['LD-TSH-001', 'LD-HOD-001', 'LD-CAP-001'],
          includesVoucher: true
        }
      ];

      for (const productData of products) {
        const product = new this.models.Product(productData);
        await product.save();
        
        // Create inventory record
        const inventory = new this.models.Inventory({
          product: product._id,
          sku: productData.sku,
          quantity: productData.inventory.quantity,
          reserved: 0,
          available: productData.inventory.quantity,
          lowStockThreshold: productData.inventory.lowStockThreshold
        });
        await inventory.save();
      }

      // Create admin user
      const User = this.models.User;
      const adminExists = await User.findOne({ email: 'admin@loosedraw.co.za' });
      
      if (!adminExists) {
        const admin = new User({
          email: 'admin@loosedraw.co.za',
          username: 'admin',
          password: 'LooseDraw2024!', // Will be hashed by pre-save hook
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          isEmailVerified: true,
          isActive: true,
          profile: {
            phone: '+27794068239'
          }
        });
        await admin.save();
      }

      // Create default voucher types
      const voucherTypes = [
        {
          code: 'WELCOME10',
          type: 'percentage',
          value: 10,
          description: 'Welcome 10% discount',
          minimumPurchase: 0,
          maxUses: 1000,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        {
          code: 'FREESHIP',
          type: 'free_shipping',
          value: 0,
          description: 'Free shipping voucher',
          minimumPurchase: 500,
          maxUses: 100,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      ];

      for (const voucherData of voucherTypes) {
        const voucher = new this.models.Voucher(voucherData);
        await voucher.save();
      }

      logger.info('✅ Database seeded successfully');
    } catch (error) {
      logger.error('Error seeding database:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const dbState = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };
      
      return {
        status: states[dbState],
        isHealthy: dbState === 1,
        models: Object.keys(this.models).length,
        collections: await mongoose.connection.db.listCollections().toArray()
      };
    } catch (error) {
      return {
        status: 'error',
        isHealthy: false,
        error: error.message
      };
    }
  }

  // Transaction support
  async withTransaction(callback) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Aggregation pipeline helper
  async aggregate(model, pipeline) {
    try {
      return await this.models[model].aggregate(pipeline);
    } catch (error) {
      logger.error(`Aggregation error on ${model}:`, error);
      throw error;
    }
  }

  // Bulk operations helper
  async bulkWrite(model, operations) {
    try {
      return await this.models[model].bulkWrite(operations);
    } catch (error) {
      logger.error(`Bulk write error on ${model}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new Database();