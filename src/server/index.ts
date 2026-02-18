/**
 * JIG Craft Cannabis - API Server
 *
 * Express application wiring all routes together.
 * Requires PostgreSQL + environment variables (see .env.example).
 *
 * Endpoints:
 *   /api/v1/auth/*           - OTP authentication
 *   /api/v1/clients/*        - Client CRUD
 *   /api/v1/products/*       - Product catalog
 *   /api/v1/orders/*         - Order management
 *   /api/v1/events/*         - World model event emission
 *   /api/v1/intelligence/*   - Intelligence & predictions
 *   /api/v1/leads/*          - Lead management (admin)
 *   /health                  - Health check
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { pool } from './db';
import { errorHandler } from './middleware';

// Route imports
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/clients.routes';
import productRoutes from './routes/products.routes';
import orderRoutes from './routes/orders.routes';
import eventRoutes from './routes/events.routes';
import intelligenceRoutes from './routes/intelligence.routes';
import leadRoutes from './routes/leads.routes';

const app = express();
const PORT = Number(process.env.PORT) || 3002;

// ── Middleware ───────────────────────────────────────────────

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

// ── Static files (POP uploads) ──────────────────────────────

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ── Health Check ────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unhealthy', error: 'Database unreachable' });
  }
});

// ── API Routes ──────────────────────────────────────────────

const api = express.Router();

api.use('/auth', authRoutes);
api.use('/clients', clientRoutes);
api.use('/products', productRoutes);
api.use('/orders', orderRoutes);
api.use('/events', eventRoutes);
api.use('/intelligence', intelligenceRoutes);
api.use('/leads', leadRoutes);

app.use('/api/v1', api);

// ── Error Handler ───────────────────────────────────────────

app.use(errorHandler as express.ErrorRequestHandler);

// ── Start ───────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[JIG] Server running on port ${PORT}`);
  console.log(`[JIG] Health: http://localhost:${PORT}/health`);
  console.log(`[JIG] API:    http://localhost:${PORT}/api/v1`);
});

export default app;
