// Full Backend Server with MongoDB
require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const config = require('./config');
const logger = require('./modules/logger');
const apiResponse = require('./utils/apiResponse');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (nginx)
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket
const websocket = require('./modules/websocket');
const io = websocket.initializeWebSocket(server);

// Import routes
const affiliateRoutes = require('./routes/affiliate');
const viralRoutes = require('./routes/viral');
const menuRoutes = require('./routes/menu');
const section21Routes = require('./routes/section21');
const dashboardRoutes = require('./routes/dashboard');
const staffRoutes = require('./routes/staff');
const leadsRoutes = require('./routes/leads');
const posRoutes = require('./routes/pos');
const productsRoutes = require('./routes/products');
const orderRoutes = require('./routes/order');
const cartRoutes = require('./routes/cart');
const voucherRoutes = require('./routes/vouchers');
const subscriptionRoutes = require('./routes/subscriptions');
const bugReportsRoutes = require('./routes/bug-reports');
const usersRoutes = require('./routes/users');
const modulesRoutes = require('./routes/modules');
const driveThoughRoutes = require('./routes/drive-through');
// New Feature Routes
const batchRoutes = require('./routes/batch');
const supplierRoutes = require('./routes/supplier');
const purchaseOrderRoutes = require('./routes/purchase-order');
const purchaseLimitsRoutes = require('./routes/purchase-limits');
const marketingRoutes = require('./routes/marketing');
// OTP Authentication
const authOTPRoutes = require('./routes/auth-otp');
// const authRoutes = require('./modules/user/routes'); // DISABLED - Using main auth routes instead

// Import middleware
const {
  authenticateToken,
  requireAdmin,
  requireRole,
  requirePermission,
  requireSection21Verification,
  optionalAuth
} = require('./middleware/auth');

const {
  globalLimiter,
  apiLimiter,
  authLimiter,
  registrationLimiter,
  passwordResetLimiter
} = require('./middleware/rateLimiter');

const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword
} = require('./middleware/validation');

const {
  globalErrorHandler,
  notFoundHandler
} = require('./middleware/errorHandler');

// Import models
const User = require('./modules/database/models/User');
const Product = require('./modules/database/models/Product');
const Order = require('./modules/database/models/Order');
const Affiliate = require('./modules/database/models/Affiliate');
const ViralScore = require('./modules/database/models/ViralScore');
const ViralCampaign = require('./modules/database/models/ViralCampaign');
const Branch = require('./modules/database/models/Branch');
const TillSession = require('./modules/database/models/TillSession');
const Sale = require('./modules/database/models/Sale');
const BranchInventory = require('./modules/database/models/BranchInventory');
const InterBranchTransfer = require('./modules/database/models/InterBranchTransfer');

// Middleware - Security Headers with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Allow inline scripts (consider using nonces in future)
        "'unsafe-eval'", // Required for some frontend libraries
        "https://cdn.jsdelivr.net", // CDN for libraries
        "https://cdnjs.cloudflare.com", // CDN for Font Awesome, etc.
        "https://unpkg.com", // Lucide icons CDN
        "https://www.google-analytics.com", // Analytics
        "https://www.googletagmanager.com", // Tag Manager
        "https://instapay.co.za", // InstaPay payment gateway
        "https://www.instapay.co.za" // InstaPay payment gateway
      ],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick, etc.)
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Allow inline styles
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com" // Google Fonts
      ],
      imgSrc: [
        "'self'",
        "data:", // Allow data URIs for images
        "blob:", // Allow blob URLs
        "https:", // Allow all HTTPS images (for payment gateway logos, product images from CDNs)
        "https://res.cloudinary.com" // Cloudinary if used
      ],
      connectSrc: [
        "'self'",
        "http://localhost:3001", // Development API
        "https://api.coingecko.com", // Bitcoin price API
        "https://api.coincap.io", // Bitcoin price fallback
        "https://api.exchangerate-api.com", // USD to ZAR conversion
        "https://www.google-analytics.com", // Google Analytics
        "https://www.googletagmanager.com", // Google Tag Manager
        "https://instapay.co.za", // InstaPay payment gateway
        "https://www.instapay.co.za", // InstaPay payment gateway
        "https://api.instapay.co.za", // InstaPay API
        "wss:", // WebSocket connections
        "ws://localhost:3001" // Development WebSocket
      ],
      fontSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com", // Font Awesome
        "https://fonts.gstatic.com", // Google Fonts
        "data:" // Allow data URIs for fonts
      ],
      frameSrc: [
        "'self'",
        "https://instapay.co.za", // InstaPay payment iframe
        "https://www.instapay.co.za" // InstaPay payment iframe
      ],
      objectSrc: ["'none'"], // Disallow plugins
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"], // Allow web workers
      formAction: ["'self'", "https://instapay.co.za", "https://www.instapay.co.za"] // Allow form submissions to InstaPay
    }
  },
  crossOriginEmbedderPolicy: false,
  // Additional helmet security headers
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'sameorigin' // Prevent clickjacking
  },
  noSniff: true, // Prevent MIME type sniffing
  xssFilter: true // Enable XSS filter
}));

// CORS Configuration - Secure origin validation
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      // Development
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://localhost:5500', // Live Server
      'http://127.0.0.1:5500',
      // Staging
      'https://bmh.fig3.online',
      'http://bmh.fig3.online',
      // Production domains
      'https://basothomedicalherbs.ls',
      'http://basothomedicalherbs.ls',
      'https://www.basothomedicalherbs.ls',
      'http://www.basothomedicalherbs.ls',
      // Production IP (from CLAUDE.md)
      'http://154.66.197.104',
      'https://154.66.197.104',
      'http://154.66.197.104:3001',
      // Portal
      'http://portal.basothomedicalherbs.ls',
      'https://portal.basothomedicalherbs.ls'
    ];

    // Allow requests with no origin (browser navigation, Postman, curl, mobile apps)
    // Navigation requests don't send Origin headers - this is safe
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Production security: Reject unauthorized origins
      logger.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
      callback(new Error(`CORS policy: Origin ${origin} is not allowed`));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// Increase payload size limit for bug reports with screenshots (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security: Sanitize data to prevent NoSQL injection attacks
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ key }) => {
    logger.warn(`[Security] Sanitized potentially malicious data: ${key}`);
  }
}));

// Security: Rate limiting to prevent abuse and brute force attacks
app.use('/api/', apiLimiter);

// Serve static files
app.use(express.static(path.join(__dirname, '..')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/images', express.static(path.join(__dirname, '../images')));
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Basotho Medical Herbs API Docs',
  customfavIcon: '/images/favicon.ico'
}));

// Swagger JSON spec endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes
// app.use('/api/v1/auth', authRoutes); // DISABLED - Using inline auth routes below
app.use('/api/v1/affiliate', affiliateRoutes);
app.use('/api/v1/viral', viralRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/section21', section21Routes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/leads', leadsRoutes);
app.use('/api/v1/pos', posRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/vouchers', voucherRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/bug-reports', bugReportsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/modules', modulesRoutes);
app.use('/api/v1/store', driveThoughRoutes);
// New Feature Routes
app.use('/api/v1/batches', batchRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/purchase-limits', purchaseLimitsRoutes);
app.use('/api/v1/marketing', marketingRoutes);
// OTP Authentication
app.use('/api/v1/auth/otp', authOTPRoutes);

// Owner dashboard routes
app.use('/api/v1/branches', require('./routes/branches'));
app.use('/api/v1/stocktake', require('./routes/stocktake'));
app.use('/api/v1/reports', require('./routes/reports'));
app.use('/api/v1/budgets', require('./routes/budgets'));
app.use('/api/v1/stock-transfers', require('./routes/stock-transfers'));
app.use('/api/v1/wholesale', require('./routes/wholesale'));
app.use('/api/v1/staff-shifts', require('./routes/staff-shifts'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bmh';

mongoose.connect(MONGODB_URI).then(() => {
  logger.info('Connected to MongoDB', { uri: MONGODB_URI.replace(/:[^:]*@/, ':****@') });
}).catch(err => {
  logger.error('MongoDB connection error', { error: err.message, stack: err.stack });
  process.exit(1);
});

// Models are imported above

// API Routes

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API server and database connection
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Server is running
 *                 data:
 *                   $ref: '#/components/schemas/HealthCheck'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
app.get('/api/v1/health', (req, res) => {
  const healthData = {
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
  return apiResponse.success(res, healthData, 'Server is running');
});

// Authentication Routes
// Register route (rate limited: 3 registrations per hour)
app.post('/api/v1/auth/register', registrationLimiter, validateRegister, async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      phone,
      referralCode: 'LD' + Math.random().toString(36).substr(2, 9).toUpperCase()
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      config.auth.jwtSecret,
      { expiresIn: '7d' }
    );

    // Send welcome email with login credentials
    try {
      await emailService.sendRegistrationConfirmationEmail({
        to: email,
        firstName: name ? name.split(' ')[0] : 'Member',
        loginUrl: `${process.env.BASE_URL || 'http://localhost:3001'}/login.html`
      });
      logger.info(`Registration confirmation email sent to: ${email}`);
    } catch (emailError) {
      logger.error('Failed to send registration email:', emailError);
      // Don't fail registration if email fails
    }

    res.json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        ldCoins: user.ldCoins,
        level: user.level
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login route (rate limited: 5 attempts per 15 minutes)
app.post('/api/v1/auth/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info('Login attempt', { email, passwordLength: password?.length });

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('Login failed - User not found', { email });
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    logger.info('User found for login', { email: user.email, role: user.role, isAdmin: user.isAdmin, isActive: user.isActive });

    // Check password
    const validPassword = await user.comparePassword(password);

    if (!validPassword) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      }
      await user.save();
      logger.warn('Login failed - Invalid password', { email, attempts: user.loginAttempts });
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    logger.info('Login successful', { email, role: user.role });

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        username: user.username
      },
      config.auth.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isLifestyleMember: user.isLifestyleMember || false,
        section21Status: user.kyc?.section21?.verified ? 'approved' : (user.section21Status || 'none'),
        profile: user.profile || {},
        loyalty: {
          ldCoins: user.loyalty?.ldCoins || 0,
          tier: user.loyalty?.tier || 'bronze',
          totalSpent: user.loyalty?.totalSpent || 0
        },
        gamification: {
          level: user.gamification?.level || 1,
          xp: user.gamification?.xp || 0,
          streak: user.gamification?.streak || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Password Reset - Request reset token (rate limited: 3 attempts per hour)
app.post('/api/v1/auth/forgot-password', passwordResetLimiter, validateForgotPassword, async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.json({ success: true, message: 'If an account exists with that email, a password reset link has been sent.' });
    }

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Build reset URL based on environment
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail({
        to: email,
        firstName: user.name ? user.name.split(' ')[0] : 'Member',
        resetToken: resetToken,
        resetUrl: resetUrl
      });
      logger.info(`Password reset email sent to: ${email}`);
    } catch (emailError) {
      logger.error('Failed to send password reset email:', emailError);
      // Still return success to not reveal if user exists
    }

    // Log for development debugging
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Password reset token generated', {
        email,
        resetLink: resetUrl
      });
    }

    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.'
    });
  } catch (error) {
    logger.error('Password reset request error:', error);
    res.status(500).json({ success: false, message: 'Error processing password reset request' });
  }
});

// Password Reset - Verify token and reset password (rate limited: 3 attempts per hour)
app.post('/api/v1/auth/reset-password', passwordResetLimiter, validateResetPassword, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    // Hash the token to compare with stored hash
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

// Products Routes
app.get('/api/v1/products', async (req, res) => {
  try {
    // CRITICAL: Only return non-Section 21 products for public access
    // Medical cannabis products require authentication + approved Section 21
    const products = await Product.find({ requiresSection21: false });
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Protected route for medical cannabis products (Section 21 required)
app.get('/api/v1/products/medical', authenticateToken, requireSection21Verification, async (req, res) => {
  try {
    // User is verified, return medical cannabis products
    const medicalProducts = await Product.find({ requiresSection21: true });
    res.json({ success: true, products: medicalProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/v1/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Protected Routes
app.get('/api/v1/users/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Orders
app.post('/api/v1/orders', authenticateToken, async (req, res) => {
  try {
    const order = new Order({
      userId: req.user.id,
      ...req.body
    });
    await order.save();
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/v1/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).populate('items.productId');
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Routes
app.post('/api/v1/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productData = {
      name: req.body.name,
      slug: req.body.name.toLowerCase().replace(/\s+/g, '-'),
      sku: req.body.sku || `CBD-${Date.now()}`,
      description: req.body.description || req.body.name,
      shortDescription: req.body.description ? req.body.description.substring(0, 100) : req.body.name,
      price: req.body.price,
      category: req.body.category || 'accessories',
      inventory: {
        quantity: req.body.stock || 0
      },
      images: req.body.image ? [{ url: req.body.image, isPrimary: true }] : [],
      requiresSection21: false,
      featured: req.body.featured || false,
      status: 'active'
    };

    const product = new Product(productData);
    await product.save();
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/v1/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updateData = {
      name: req.body.name,
      slug: req.body.name.toLowerCase().replace(/\s+/g, '-'),
      sku: req.body.sku,
      description: req.body.description || req.body.name,
      shortDescription: req.body.description ? req.body.description.substring(0, 100) : req.body.name,
      price: req.body.price,
      category: req.body.category,
      'inventory.quantity': req.body.stock,
      featured: req.body.featured || false
    };

    if (req.body.image) {
      updateData.images = [{ url: req.body.image, isPrimary: true }];
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/v1/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/v1/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Serve HTML Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin.html'));
});

app.get('/order', (req, res) => {
  res.sendFile(path.join(__dirname, '../order.html'));
});

// Error Handling Middleware (must be after ALL routes)
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Seed Database with Sample Data
async function seedDatabase() {
  try {
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      logger.info('Seeding Basotho Medical Herbs products...');

      const sampleProducts = [
        // ===== PUBLIC ACCESSORIES (No Section 21 Required) =====
        {
          name: 'Premium Glass Water Pipe - 12"',
          slug: 'premium-glass-water-pipe-12',
          sku: 'CBDW-PIPE-001',
          description: 'High-quality borosilicate glass water pipe with percolator. Premium craftsmanship for aromatherapy enthusiasts.',
          shortDescription: 'Premium 12" glass water pipe with percolator',
          price: 899,
          category: 'glassware',
          subcategory: 'water-pipes',
          tags: ['glassware', 'water-pipe', 'premium', 'accessories'],
          images: [{ url: '/images/products/pipe1.jpg', alt: 'Glass Water Pipe', isPrimary: true }],
          colors: [{ name: 'Clear', hex: '#FFFFFF' }],
          inventory: { quantity: 25, trackQuantity: true, lowStockThreshold: 5 },
          isFeatured: true,
          isPublished: true,
          requiresSection21: false
        },
        {
          name: 'CBD Oil 1000mg - Full Spectrum',
          slug: 'cbd-oil-1000mg-full-spectrum',
          sku: 'CBDW-OIL-1000',
          description: 'Premium full-spectrum CBD oil, 1000mg concentration. Organic, lab-tested, and THC-free. Perfect for wellness and relaxation.',
          shortDescription: '1000mg full-spectrum CBD oil',
          price: 599,
          category: 'lifestyle-cbd',
          subcategory: 'cbd-oils',
          tags: ['cbd', 'oil', 'wellness', 'organic'],
          images: [{ url: '/images/products/cbd-oil.jpg', alt: 'CBD Oil', isPrimary: true }],
          inventory: { quantity: 50, trackQuantity: true, lowStockThreshold: 10 },
          isFeatured: true,
          isPublished: true,
          requiresSection21: false
        },
        {
          name: 'Rolling Papers - Organic Hemp',
          slug: 'rolling-papers-organic-hemp',
          sku: 'CBDW-PAPER-001',
          description: 'Organic hemp rolling papers, slow-burning and chemical-free. Pack of 50 papers.',
          shortDescription: 'Organic hemp rolling papers (50 pack)',
          price: 79,
          category: 'accessories',
          subcategory: 'papers',
          tags: ['papers', 'hemp', 'organic'],
          images: [{ url: '/images/products/papers.jpg', alt: 'Rolling Papers', isPrimary: true }],
          inventory: { quantity: 200, trackQuantity: true, lowStockThreshold: 20 },
          isFeatured: false,
          isPublished: true,
          requiresSection21: false
        },
        {
          name: 'Ceramic Grinder - 4 Piece',
          slug: 'ceramic-grinder-4-piece',
          sku: 'CBDW-GRIND-001',
          description: 'Premium 4-piece ceramic grinder with pollen catcher. Durable and easy to clean.',
          shortDescription: '4-piece ceramic herb grinder',
          price: 349,
          category: 'accessories',
          subcategory: 'grinders',
          tags: ['grinder', 'ceramic', 'premium'],
          images: [{ url: '/images/products/grinder.jpg', alt: 'Ceramic Grinder', isPrimary: true }],
          colors: [{ name: 'Black', hex: '#000000' }, { name: 'Silver', hex: '#C0C0C0' }],
          inventory: { quantity: 40, trackQuantity: true, lowStockThreshold: 8 },
          isFeatured: true,
          isPublished: true,
          requiresSection21: false
        },
        {
          name: 'Vape Pen - Rechargeable',
          slug: 'vape-pen-rechargeable',
          sku: 'CBDW-VAPE-001',
          description: 'Sleek rechargeable vape pen with variable temperature control. Compatible with all 510-thread cartridges.',
          shortDescription: 'Rechargeable vape pen with temp control',
          price: 499,
          category: 'vaporizers',
          subcategory: 'pen-vapes',
          tags: ['vape', 'pen', 'rechargeable'],
          images: [{ url: '/images/products/vape.jpg', alt: 'Vape Pen', isPrimary: true }],
          colors: [{ name: 'Black', hex: '#000000' }, { name: 'Silver', hex: '#C0C0C0' }, { name: 'Gold', hex: '#FFD700' }],
          inventory: { quantity: 30, trackQuantity: true, lowStockThreshold: 5 },
          isFeatured: true,
          isPublished: true,
          requiresSection21: false
        },
        {
          name: 'Storage Jar - Airtight Glass',
          slug: 'storage-jar-airtight-glass',
          sku: 'CBDW-JAR-001',
          description: 'UV-protected airtight glass storage jar. Keeps your herbs fresh and potent.',
          shortDescription: 'Airtight UV glass storage jar',
          price: 199,
          category: 'accessories',
          subcategory: 'storage',
          tags: ['storage', 'jar', 'glass', 'uv-protection'],
          images: [{ url: '/images/products/jar.jpg', alt: 'Storage Jar', isPrimary: true }],
          colors: [{ name: 'Amber', hex: '#FF7E00' }, { name: 'Green', hex: '#228B22' }],
          inventory: { quantity: 60, trackQuantity: true, lowStockThreshold: 10 },
          isFeatured: false,
          isPublished: true,
          requiresSection21: false
        },

        // ===== MEDICAL CANNABIS (Section 21 Required - NOT visible publicly) =====
        {
          name: 'Medical Cannabis - Indica Strain 5g',
          slug: 'medical-cannabis-indica-5g',
          sku: 'CBDW-MED-INDICA-001',
          description: 'Premium medical-grade Indica cannabis strain. Prescribed for pain relief, insomnia, and anxiety management. Section 21 prescription required.',
          shortDescription: 'Medical Indica strain - 5g',
          price: 550,
          category: 'flower',
          subcategory: 'indica',
          track: 'medical',
          tags: ['medical', 'cannabis', 'indica', 'prescription', 'section21'],
          images: [{ url: '/images/products/medical-indica.jpg', alt: 'Medical Cannabis Indica', isPrimary: true }],
          inventory: { quantity: 20, trackQuantity: true, lowStockThreshold: 5 },
          isFeatured: true,
          isPublished: true,
          requiresSection21: true
        },
        {
          name: 'Medical Cannabis - Sativa Strain 5g',
          slug: 'medical-cannabis-sativa-5g',
          sku: 'CBDW-MED-SATIVA-001',
          description: 'Premium medical-grade Sativa cannabis strain. Prescribed for depression, fatigue, and ADHD. Section 21 prescription required.',
          shortDescription: 'Medical Sativa strain - 5g',
          price: 550,
          category: 'flower',
          subcategory: 'sativa',
          track: 'medical',
          tags: ['medical', 'cannabis', 'sativa', 'prescription', 'section21'],
          images: [{ url: '/images/products/medical-sativa.jpg', alt: 'Medical Cannabis Sativa', isPrimary: true }],
          inventory: { quantity: 20, trackQuantity: true, lowStockThreshold: 5 },
          isFeatured: true,
          isPublished: true,
          requiresSection21: true
        },
        {
          name: 'THC Oil - Medical Grade 10ml',
          slug: 'thc-oil-medical-10ml',
          sku: 'CBDW-MED-THC-OIL',
          description: 'Medical-grade THC oil, 10ml bottle. High potency for chronic pain and severe conditions. Section 21 prescription required.',
          shortDescription: 'Medical THC oil - 10ml',
          price: 850,
          category: 'oils',
          subcategory: 'thc-oil',
          track: 'medical',
          tags: ['medical', 'thc', 'oil', 'prescription', 'section21'],
          images: [{ url: '/images/products/thc-oil.jpg', alt: 'THC Oil', isPrimary: true }],
          inventory: { quantity: 15, trackQuantity: true, lowStockThreshold: 3 },
          isFeatured: true,
          isPublished: true,
          requiresSection21: true
        },
        {
          name: 'Medical Cannabis - Hybrid Strain 10g',
          slug: 'medical-cannabis-hybrid-10g',
          sku: 'CBDW-MED-HYBRID-001',
          description: 'Balanced hybrid medical cannabis strain. Best for versatile symptom management. Section 21 prescription required.',
          shortDescription: 'Medical Hybrid strain - 10g',
          price: 1000,
          category: 'flower',
          subcategory: 'hybrid',
          track: 'medical',
          tags: ['medical', 'cannabis', 'hybrid', 'prescription', 'section21'],
          images: [{ url: '/images/products/medical-hybrid.jpg', alt: 'Medical Cannabis Hybrid', isPrimary: true }],
          inventory: { quantity: 25, trackQuantity: true, lowStockThreshold: 5 },
          isFeatured: true,
          isPublished: true,
          requiresSection21: true
        }
      ];

      await Product.insertMany(sampleProducts);
      logger.info('Basotho Medical Herbs products seeded successfully', { count: sampleProducts.length });
    }

    // Admin user is created via seed-test-users.js script
    // DO NOT auto-create here to avoid password conflicts
  } catch (error) {
    logger.error('Database seeding error', { error: error.message, stack: error.stack });
  }
}

// Start Server
server.listen(PORT, async () => {
  logger.info('Server started successfully', {
    port: PORT,
    env: config.env,
    urls: {
      server: `http://localhost:${PORT}`,
      dashboard: `http://localhost:${PORT}/dashboard`,
      login: `http://localhost:${PORT}/login`,
      admin: `http://localhost:${PORT}/admin`
    },
    websocket: 'Initialized for real-time notifications'
  });

  // Seed database
  setTimeout(seedDatabase, 2000);
});