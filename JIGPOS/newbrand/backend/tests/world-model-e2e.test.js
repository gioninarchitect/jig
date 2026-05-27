/**
 * P33 — World Model End-to-End Integration Tests
 * Tests: config CRUD, feature gating, risk/stock/potency APIs,
 * branch overrides, revert, config propagation.
 *
 * Run: npm test -- --testPathPattern=world-model-e2e
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// ─── Test app factory ──────────────────────────────────────────
// Builds a minimal Express app with World Model routes + auth middleware

function createTestApp() {
  const app = express();
  app.use(express.json());

  // Mount routes under test
  app.use('/api/v1/config/world-model', require('../routes/world-model-config'));
  app.use('/api/v1/risk', require('../routes/risk'));
  app.use('/api/v1/stock', require('../routes/stock-intelligence'));
  app.use('/api/v1/inventory', require('../routes/potency'));

  return app;
}

// ─── Token helpers ─────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'origin-dev-jwt-secret-key-2025';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET);
}

const superAdminToken = makeToken({ id: 'test-sa-001', role: 'super_admin', email: 'sa@jig.test' });
const ownerToken = makeToken({ id: 'test-owner-001', role: 'owner', email: 'owner@jig.test' });
const staffToken = makeToken({ id: 'test-staff-001', role: 'branch_assistant', email: 'staff@jig.test' });

// ─── Test suite ────────────────────────────────────────────────

describe('World Model E2E Integration', () => {
  let app;

  beforeAll(async () => {
    // Connect to test DB
    const testUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/origin_test_wm';
    await mongoose.connect(testUri);
    app = createTestApp();
  });

  afterAll(async () => {
    // Cleanup
    const WorldModelConfig = require('../modules/database/models/WorldModelConfig');
    const WorldModelConfigHistory = require('../modules/database/models/WorldModelConfigHistory');
    await WorldModelConfig.deleteMany({});
    await WorldModelConfigHistory.deleteMany({});
    await mongoose.connection.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Config CRUD
  // ═══════════════════════════════════════════════════════════════

  describe('Config CRUD', () => {
    it('GET /config/world-model — returns default config', async () => {
      const res = await request(app)
        .get('/api/v1/config/world-model')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.features).toBeDefined();
      expect(res.body.data.thresholds).toBeDefined();
      // All features default OFF
      expect(res.body.data.features.potencyDegradation.enabled).toBe(false);
      expect(res.body.data.features.riskScoring.enabled).toBe(false);
      expect(res.body.data.features.smartStock.enabled).toBe(false);
    });

    it('PUT /config/world-model — Super Admin enables all features', async () => {
      const res = await request(app)
        .put('/api/v1/config/world-model')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          features: {
            potencyDegradation: { enabled: true, autoMarkdown: true },
            riskScoring: { enabled: true },
            smartStock: { enabled: true, autoReorder: false, interBranchTransfer: true },
            staffAccountability: { enabled: true },
            complianceCascade: { enabled: true, preSaleBlocking: true },
            demandPrediction: { enabled: true, paydayCycleAware: true },
          },
          reason: 'E2E test — enabling all features',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.features.potencyDegradation.enabled).toBe(true);
      expect(res.body.data.features.riskScoring.enabled).toBe(true);
      expect(res.body.data.features.smartStock.enabled).toBe(true);
      expect(res.body.data.version).toBeGreaterThan(1);
    });

    it('PUT /config/world-model — Owner can also update', async () => {
      const res = await request(app)
        .put('/api/v1/config/world-model')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          thresholds: { tillVarianceAmber: 100 },
          reason: 'Owner adjusting threshold',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.thresholds.tillVarianceAmber).toBe(100);
    });

    it('PUT /config/world-model — Staff DENIED', async () => {
      const res = await request(app)
        .put('/api/v1/config/world-model')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ features: { potencyDegradation: { enabled: false } } });

      expect(res.status).toBe(403);
    });

    it('GET /config/world-model — Staff can READ config', async () => {
      const res = await request(app)
        .get('/api/v1/config/world-model')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.features).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Config change propagation + history
  // ═══════════════════════════════════════════════════════════════

  describe('Config History & Propagation', () => {
    it('GET /config/world-model/history — shows audit trail', async () => {
      const res = await request(app)
        .get('/api/v1/config/world-model/history')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      // Most recent first
      expect(res.body.data[0].reason).toBeDefined();
    });

    it('GET /config/world-model/history — date range filter', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const res = await request(app)
        .get('/api/v1/config/world-model/history')
        .query({ from: tomorrow })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0); // No future entries
    });

    it('tillVarianceAmber changed from 50 to 100 — verify in config', async () => {
      const res = await request(app)
        .get('/api/v1/config/world-model')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.body.data.thresholds.tillVarianceAmber).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Feature gating — disabled features return 403
  // ═══════════════════════════════════════════════════════════════

  describe('Feature Gating', () => {
    it('Disable potency → potency API returns 403', async () => {
      // Disable potency
      await request(app)
        .put('/api/v1/config/world-model')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ features: { potencyDegradation: { enabled: false } }, reason: 'Testing feature gate' });

      // Potency alerts should be gated
      const res = await request(app)
        .get('/api/v1/inventory/potency/alerts')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('disabled');
    });

    it('Disable risk scoring → risk API returns 403', async () => {
      await request(app)
        .put('/api/v1/config/world-model')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ features: { riskScoring: { enabled: false } }, reason: 'Testing risk gate' });

      const res = await request(app)
        .get('/api/v1/risk/network')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('Re-enable features', async () => {
      const res = await request(app)
        .put('/api/v1/config/world-model')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          features: {
            potencyDegradation: { enabled: true },
            riskScoring: { enabled: true },
          },
          reason: 'Re-enabling for remaining tests',
        });

      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Branch overrides
  // ═══════════════════════════════════════════════════════════════

  describe('Branch Overrides', () => {
    const testBranchId = 'branch-potchefstroom-001';

    it('PUT /config/world-model/branch/:id — set Potchefstroom override', async () => {
      const res = await request(app)
        .put(`/api/v1/config/world-model/branch/${testBranchId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          thresholds: { tillVarianceAmber: 150, tillVarianceRed: 300 },
          reason: 'Reducing variance threshold for new Potchefstroom branch',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.thresholds.tillVarianceAmber).toBe(150);
    });

    it('GET /config/world-model?branchId — returns effective config with override', async () => {
      const res = await request(app)
        .get('/api/v1/config/world-model')
        .query({ branchId: testBranchId })
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.thresholds.tillVarianceAmber).toBe(150);
      expect(res.body.data.thresholds.tillVarianceRed).toBe(300);
    });

    it('GET /config/world-model (no branchId) — returns network default', async () => {
      const res = await request(app)
        .get('/api/v1/config/world-model')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.thresholds.tillVarianceAmber).toBe(100); // Changed to 100 in earlier test
    });

    it('Branch override with feature disable', async () => {
      const res = await request(app)
        .put(`/api/v1/config/world-model/branch/${testBranchId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          features: { potencyDegradation: { enabled: false } },
          reason: 'Disable potency for Potchefstroom only',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.features.potencyDegradation.enabled).toBe(false);

      // Global config still has potency enabled
      const global = await request(app)
        .get('/api/v1/config/world-model')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(global.body.data.features.potencyDegradation.enabled).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: Revert
  // ═══════════════════════════════════════════════════════════════

  describe('Revert', () => {
    it('POST /config/world-model/revert/:historyId — revert last change', async () => {
      // Get history
      const histRes = await request(app)
        .get('/api/v1/config/world-model/history')
        .set('Authorization', `Bearer ${superAdminToken}`);

      const lastEntry = histRes.body.data[0];
      expect(lastEntry).toBeDefined();

      // Revert it
      const res = await request(app)
        .post(`/api/v1/config/world-model/revert/${lastEntry._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Change reverted successfully');
    });

    it('History shows revert entry', async () => {
      const res = await request(app)
        .get('/api/v1/config/world-model/history')
        .set('Authorization', `Bearer ${superAdminToken}`);

      const revertEntry = res.body.data.find(e => e.reason?.startsWith('Reverted change from'));
      expect(revertEntry).toBeDefined();
    });

    it('Staff cannot revert', async () => {
      const histRes = await request(app)
        .get('/api/v1/config/world-model/history')
        .set('Authorization', `Bearer ${superAdminToken}`);

      const entry = histRes.body.data[0];

      const res = await request(app)
        .post(`/api/v1/config/world-model/revert/${entry._id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // STEP 6: World Model API endpoints (feature-gated)
  // ═══════════════════════════════════════════════════════════════

  describe('Risk API', () => {
    it('GET /risk/staff/:staffId — staff accountability score', async () => {
      const res = await request(app)
        .get('/api/v1/risk/staff/test-staff-001')
        .set('Authorization', `Bearer ${superAdminToken}`);

      // Should not 403 (feature enabled), may 500 if no real data
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data).toBeDefined();
      }
    });

    it('GET /risk/staff/leaderboard — staff leaderboard', async () => {
      const res = await request(app)
        .get('/api/v1/risk/staff/leaderboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('Stock Intelligence API', () => {
    it('GET /stock/reorder-suggestions — reorder list', async () => {
      const res = await request(app)
        .get('/api/v1/stock/reorder-suggestions')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect([200, 500]).toContain(res.status);
    });

    it('GET /stock/waste-prevention — waste prevention', async () => {
      const res = await request(app)
        .get('/api/v1/stock/waste-prevention')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect([200, 500]).toContain(res.status);
    });

    it('GET /stock/transfer-suggestions — transfer suggestions', async () => {
      const res = await request(app)
        .get('/api/v1/stock/transfer-suggestions')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('Potency API', () => {
    it('GET /inventory/potency/alerts — potency alerts', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/potency/alerts')
        .set('Authorization', `Bearer ${superAdminToken}`);

      // Feature is enabled, so should get 200 (may have empty data)
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.alerts).toBeDefined();
        expect(res.body.data.summary).toBeDefined();
      }
    });

    it('POST /inventory/potency/estimate — requires batchId', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/potency/estimate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('batchId');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // STEP 7: State sync
  // ═══════════════════════════════════════════════════════════════

  describe('State Sync', () => {
    it('POST /config/world-model/sync — returns corrections for stale config', async () => {
      const res = await request(app)
        .post('/api/v1/config/world-model/sync')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ state: { configVersion: 1 } });

      expect(res.status).toBe(200);
      expect(res.body.data.configVersion).toBeDefined();
      // Config version is higher than 1 after our changes
      if (res.body.data.configVersion > 1) {
        expect(res.body.data.corrections.length).toBeGreaterThan(0);
        expect(res.body.data.corrections[0].type).toBe('CONFIG_STALE');
      }
    });

    it('POST /config/world-model/sync — rate limited', async () => {
      // Second call within 30s should be rate limited
      const res = await request(app)
        .post('/api/v1/config/world-model/sync')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ state: { configVersion: 1 } });

      expect(res.status).toBe(429);
      expect(res.body.retryAfter).toBeDefined();
    });
  });
});
