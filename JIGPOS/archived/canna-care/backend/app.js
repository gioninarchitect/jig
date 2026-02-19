// Main Application - Modular Architecture - Max 200 lines
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const config = require('./config');
const logger = require('./modules/logger');
const errorHandler = require('./modules/middleware/errorHandler');

class Application {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));
    
    // CORS configuration
    this.app.use(cors({
      origin: config.security.corsOrigins,
      credentials: true
    }));
    
    // Compression
    if (config.security.enableCompression) {
      this.app.use(compression());
    }
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // MongoDB injection prevention
    this.app.use(mongoSanitize());
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      next();
    });
    
    // Static files
    this.app.use(express.static('public'));
    this.app.use('/uploads', express.static('uploads'));
  }

  setupRoutes() {
    const apiPrefix = config.api.prefix + '/' + config.api.version;
    
    // Health check
    this.app.get('/health', async (req, res) => {
      const database = require('./modules/database');
      const health = await database.healthCheck();
      res.json({
        status: 'ok',
        timestamp: new Date(),
        database: health,
        version: config.api.version
      });
    });
    
    // API Routes
    this.app.use(`${apiPrefix}/auth`, require('./modules/auth/routes'));
    this.app.use(`${apiPrefix}/products`, require('./modules/product/routes'));
    this.app.use(`${apiPrefix}/orders`, require('./modules/order/routes'));
    this.app.use(`${apiPrefix}/payments`, require('./modules/payment/routes'));
    this.app.use(`${apiPrefix}/users`, require('./modules/user/routes'));
    this.app.use(`${apiPrefix}/cart`, require('./modules/cart/routes'));
    this.app.use(`${apiPrefix}/vouchers`, require('./modules/voucher/routes'));
    this.app.use(`${apiPrefix}/reviews`, require('./modules/review/routes'));
    this.app.use(`${apiPrefix}/notifications`, require('./modules/notification/routes'));
    this.app.use(`${apiPrefix}/analytics`, require('./modules/analytics/routes'));
    this.app.use(`${apiPrefix}/inventory`, require('./modules/inventory/routes'));
    this.app.use(`${apiPrefix}/discounts`, require('./modules/discount/routes'));
    this.app.use(`${apiPrefix}/referrals`, require('./modules/referral/routes'));
    this.app.use(`${apiPrefix}/wishlist`, require('./modules/wishlist/routes'));
    this.app.use(`${apiPrefix}/support`, require('./modules/support/routes'));
    
    // Admin routes
    this.app.use(`${apiPrefix}/admin`, require('./modules/admin/routes'));
    
    // Viral Score and Recommendation Engine
    this.app.use(`${apiPrefix}/viral`, require('./routes/viral'));
    
    // Affiliate system routes  
    this.app.use(`${apiPrefix}/affiliate`, require('./routes/affiliate'));
    
    // Influencer verification routes
    this.app.use(`${apiPrefix}/influencer`, require('./routes/influencer-verification'));
    
    // Dashboard routes
    this.app.use(`${apiPrefix}/dashboard`, require('./routes/dashboard'));
    
    // Webhook endpoints
    this.app.use(`${apiPrefix}/webhooks`, require('./modules/webhook/routes'));
    
    // API Documentation
    if (config.env === 'development') {
      const swaggerUi = require('swagger-ui-express');
      const swaggerDoc = require('./swagger.json');
      this.app.use(config.api.documentation, swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    }
    
    // Serve frontend for all other routes
    this.app.get('*', (req, res) => {
      res.sendFile('index.html', { root: 'public' });
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res, next) => {
      const error = new Error('Not Found');
      error.statusCode = 404;
      next(error);
    });
    
    // Error handler
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Connect to database
      const database = require('./modules/database');
      await database.connect();
      
      // Seed database if needed
      if (config.env === 'development') {
        await database.seed();
      }
      
      // Initialize cache
      const cache = require('./modules/cache');
      await cache.connect();
      
      // Initialize queue
      const queue = require('./modules/queue');
      await queue.initialize();
      
      // Start server
      const server = this.app.listen(config.port, () => {
        logger.info(`🚀 Server running on port ${config.port}`);
        logger.info(`📝 API Documentation: http://localhost:${config.port}${config.api.documentation}`);
      });
      
      // Graceful shutdown
      process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
          logger.info('Server closed');
        });
        
        await database.disconnect();
        await cache.disconnect();
        await queue.close();
        
        process.exit(0);
      });
      
      return server;
    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }
}

module.exports = new Application();