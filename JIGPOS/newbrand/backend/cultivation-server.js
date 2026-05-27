// Cultivation Dashboard — Standalone Server
// Separate from POS — runs as its own PM2 process
require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3005;

// Minimal config (avoids pulling in full POS config validation)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-DO-NOT-USE-IN-PRODUCTION';

// Override config module's jwtSecret so auth middleware works
const config = require('./config');

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", `http://localhost:${PORT}`, "https://origin.cleva-ai.co.za", "wss:", `ws://localhost:${PORT}`],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com", "data:"],
      objectSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      'http://localhost:3005', 'http://127.0.0.1:3005',
      'http://localhost:3001', 'http://127.0.0.1:3001',
      'https://origin.cleva-ai.co.za', 'http://origin.cleva-ai.co.za',
      'http://154.66.197.199', 'https://154.66.197.199'
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());

// Serve static files — cultivation dashboard HTML, CSS, JS, images
app.use(express.static(path.join(__dirname, '..')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/images', express.static(path.join(__dirname, '../images')));
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount cultivation API routes
app.use('/api/v1/cultivation', require('./routes/cultivation'));

// Auth OTP routes (needed for login on cultivation dashboard)
app.use('/api/v1/auth/otp', require('./routes/auth-otp'));

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'Cultivation server running',
    data: {
      status: 'ok',
      service: 'origin-cultivation',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

// Default route → cultivation dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../cultivation-dashboard.html'));
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI).then(() => {
  console.log(`[Cultivation] Connected to MongoDB: ${MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);
}).catch(err => {
  console.error('[Cultivation] MongoDB connection error:', err.message);
  process.exit(1);
});

// Start server
server.listen(PORT, () => {
  console.log(`[Cultivation] Server running on http://localhost:${PORT}`);
  console.log(`[Cultivation] Dashboard: http://localhost:${PORT}/cultivation-dashboard.html`);
});
