/**
 * JIG Craft Cannabis - n8n Integration Routes
 *
 * Two groups of endpoints:
 * 1. Data API (auth: X-N8N-API-KEY) - for n8n to query JIG data
 * 2. Admin config (auth: JWT admin) - for frontend to manage n8n settings
 *
 * Data API:
 *   GET  /n8n/data/clients                - All clients with Telegram link status
 *   GET  /n8n/data/clients/:id            - Single client with full details
 *   GET  /n8n/data/orders/unpaid          - Orders with pending/overdue payment
 *   GET  /n8n/data/orders/recent          - Orders from the last N days
 *   GET  /n8n/data/restock-predictions    - Restock predictions for all clients
 *   GET  /n8n/data/products               - All products
 *   GET  /n8n/data/stats                  - Dashboard stats for daily digest
 *
 * Admin config:
 *   GET    /n8n/config                    - Get n8n config (admin)
 *   PATCH  /n8n/config                    - Update n8n config (admin)
 */

import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import * as db from '../db';
import * as chatDb from '../chat/chatDb';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware';
import { loadClientWorldState } from './intelligence.routes';
import { predictRestock } from '../../world-model/inference';

const router = Router();

// ── n8n Config (persisted to JSON file) ─────────────────────

interface N8nConfig {
  enabled: boolean;
  webhookUrl: string;
  apiKey: string;
  workflows: {
    orderLifecycle: boolean;
    onboarding: boolean;
    paymentChase: boolean;
    restockReminders: boolean;
    newProducts: boolean;
    churnPrevention: boolean;
    adminDigest: boolean;
  };
}

const CONFIG_PATH = path.join(process.cwd(), 'n8n-config.json');

const DEFAULT_CONFIG: N8nConfig = {
  enabled: false,
  webhookUrl: '',
  apiKey: '',
  workflows: {
    orderLifecycle: true,
    onboarding: true,
    paymentChase: true,
    restockReminders: true,
    newProducts: true,
    churnPrevention: true,
    adminDigest: true,
  },
};

function loadConfig(): N8nConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // Fall back to default
  }

  // Also check env vars
  return {
    ...DEFAULT_CONFIG,
    enabled: process.env.N8N_ENABLED === 'true',
    webhookUrl: process.env.N8N_WEBHOOK_URL || '',
    apiKey: process.env.N8N_API_KEY || '',
  };
}

function saveConfig(config: N8nConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  // Sync to process.env so emitter picks it up
  process.env.N8N_ENABLED = config.enabled ? 'true' : 'false';
  if (config.webhookUrl) process.env.N8N_WEBHOOK_URL = config.webhookUrl;
  if (config.apiKey) process.env.N8N_API_KEY = config.apiKey;
}

// Initialize env from config on load
const initialConfig = loadConfig();
if (initialConfig.enabled) process.env.N8N_ENABLED = 'true';
if (initialConfig.webhookUrl) process.env.N8N_WEBHOOK_URL = initialConfig.webhookUrl;
if (initialConfig.apiKey) process.env.N8N_API_KEY = initialConfig.apiKey;

// ── Admin Config Endpoints ──────────────────────────────────

router.get(
  '/config',
  requireAuth as never,
  requireAdmin as never,
  (_req: AuthenticatedRequest, res: Response) => {
    const config = loadConfig();
    // Don't expose apiKey in full - mask it
    res.json({
      ...config,
      apiKey: config.apiKey ? `${config.apiKey.slice(0, 4)}${'*'.repeat(Math.max(0, config.apiKey.length - 4))}` : '',
      apiKeySet: !!config.apiKey,
    });
  },
);

router.patch(
  '/config',
  requireAuth as never,
  requireAdmin as never,
  (req: AuthenticatedRequest, res: Response) => {
    const current = loadConfig();
    const body = req.body;

    const updated: N8nConfig = {
      enabled: body.enabled ?? current.enabled,
      webhookUrl: body.webhookUrl ?? current.webhookUrl,
      apiKey: body.apiKey ?? current.apiKey,
      workflows: {
        ...current.workflows,
        ...(body.workflows ?? {}),
      },
    };

    saveConfig(updated);

    res.json({
      ...updated,
      apiKey: updated.apiKey ? `${updated.apiKey.slice(0, 4)}${'*'.repeat(Math.max(0, updated.apiKey.length - 4))}` : '',
      apiKeySet: !!updated.apiKey,
    });
  },
);

// ── API Key auth middleware for data endpoints ───────────────

function requireN8nKey(req: Request, res: Response, next: NextFunction): void {
  const config = loadConfig();
  const key = config.apiKey || process.env.N8N_API_KEY;

  if (!key) {
    res.status(503).json({ error: 'n8n API key not configured' });
    return;
  }

  const provided = req.headers['x-n8n-api-key'] as string | undefined;
  if (!provided || provided !== key) {
    res.status(401).json({ error: 'Invalid n8n API key' });
    return;
  }

  next();
}

// ── Data API (for n8n to call) ──────────────────────────────

const data = Router();
data.use(requireN8nKey);

// All clients with Telegram link status
data.get('/clients', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const clients = await db.listClients(undefined, 1000, 0);
    const links = await chatDb.listLinkedUsers();

    const clientsWithLinks = clients.map((c) => {
      const clientLinks = links.filter((l) => l.clientId === c.id);
      return {
        id: c.id,
        companyName: c.companyName,
        contactPerson: c.contactPerson,
        email: c.email,
        phone: c.phone,
        status: c.status,
        tier: c.tier,
        telegram: clientLinks
          .filter((l) => l.platform === 'telegram')
          .map((l) => ({ chatId: l.platformUserId, username: l.platformUsername })),
      };
    });

    res.json({ clients: clientsWithLinks, count: clientsWithLinks.length });
  } catch (err) {
    next(err);
  }
});

// Single client details
data.get('/clients/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await db.getClientById(req.params.id as string);
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const links = await chatDb.getLinksByClientId(client.id);
    const verificationStatus = await db.getClientVerificationStatus(client.id);

    res.json({
      client: {
        ...client,
        telegram: links
          .filter((l) => l.platform === 'telegram')
          .map((l) => ({ chatId: l.platformUserId, username: l.platformUsername })),
        verification: verificationStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Unpaid orders
data.get('/orders/unpaid', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pending = await db.listAllOrders({ paymentStatus: 'pending', limit: 200 });
    const overdue = await db.listAllOrders({ paymentStatus: 'overdue', limit: 200 });

    const orders = [...pending.orders, ...overdue.orders].map((o) => ({
      id: o.id,
      clientId: o.clientId,
      poNumber: o.poNumber,
      total: o.total,
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
      confirmedAt: o.confirmedAt,
      clientName: (o as unknown as Record<string, unknown>).clientName,
    }));

    res.json({ orders, count: orders.length });
  } catch (err) {
    next(err);
  }
});

// Recent orders (last N days, default 7)
data.get('/orders/recent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Number(req.query.days) || 7;
    const result = await db.listAllOrders({ limit: 500 });

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recent = result.orders.filter((o) => o.createdAt >= cutoff);

    res.json({ orders: recent, count: recent.length, days });
  } catch (err) {
    next(err);
  }
});

// Restock predictions for all clients
data.get('/restock-predictions', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const links = await chatDb.listLinkedUsers();
    const clientIds = [...new Set(links.filter((l) => l.clientId).map((l) => l.clientId as string))];

    const predictions: Array<{
      clientId: string;
      products: Array<{
        productName: string;
        daysUntilNeeded: number;
        predictedDate: number;
        suggestedQuantity: number;
      }>;
    }> = [];

    for (const clientId of clientIds) {
      try {
        const state = await loadClientWorldState(clientId);
        if (!state) continue;

        const preds = predictRestock(state);
        if (preds.length > 0) {
          predictions.push({ clientId, products: preds });
        }
      } catch {
        // Skip failed clients
      }
    }

    res.json({ predictions, clientCount: clientIds.length });
  } catch (err) {
    next(err);
  }
});

// All products
data.get('/products', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await db.listProducts(false);
    res.json({ products, count: products.length });
  } catch (err) {
    next(err);
  }
});

// Dashboard stats (for daily digest workflow)
data.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const allOrders = await db.listAllOrders({ limit: 500 });
    const todayOrders = allOrders.orders.filter((o) => o.createdAt >= todayStart.getTime());
    const pendingPayments = allOrders.orders.filter((o) => o.paymentStatus === 'pending' || o.paymentStatus === 'overdue');

    const clients = await db.listClients(undefined, 1000, 0);
    const pendingClients = clients.filter((c) => c.status === 'pending');

    const pendingDocs = await db.getPendingClientDocuments();

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);

    res.json({
      today: {
        orders: todayOrders.length,
        revenue: todayRevenue,
      },
      pending: {
        payments: pendingPayments.length,
        verifications: pendingDocs.length,
        newClients: pendingClients.length,
      },
      totals: {
        orders: allOrders.total,
        clients: clients.length,
        activeClients: clients.filter((c) => c.status === 'active').length,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.use('/data', data);

export default router;
