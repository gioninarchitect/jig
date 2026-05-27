// P24 — Stock Intelligence Dashboard (overview with predictions)
// Feature-gated: only active if config.features.smartStock.enabled

import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useWorldModelConfig } from '../../world-model/WorldModelContext';
import { formatCurrency } from '../../config';
import Badge from '../../components/ui/Badge';
import {
  predictDemand,
  generateReorderSuggestions,
  suggestTransfers,
  identifyWasteRisk,
  getPaydayCycleMultiplier,
  getSeasonalMultiplier,
} from '../../world-model/engines/stock-intelligence';
import ReorderSuggestions from './ReorderSuggestions';
import TransferSuggestions from './TransferSuggestions';
import DemandChart from './DemandChart';
import SubstitutionFinder from './SubstitutionFinder';
import WastePreventionPanel from './WastePreventionPanel';

export default function StockIntelligenceDashboard() {
  const config = useWorldModelConfig();
  const [inventory, setInventory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const enabled = config?.features?.smartStock?.enabled;

  // Load data
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    async function load() {
      try {
        const [invRes, batchRes, salesRes, prodRes] = await Promise.allSettled([
          api.get('/branch-inventory?limit=500'),
          api.get('/batches?status=active&qaStatus=approved&limit=200'),
          api.get('/dashboard/stats'),
          api.get('/products?status=active&limit=500'),
        ]);
        setInventory(invRes.status === 'fulfilled' ? (invRes.value.data?.inventory || invRes.value.data?.data || []) : []);
        setBatches(batchRes.status === 'fulfilled' ? (batchRes.value.data?.batches || batchRes.value.data?.data || []) : []);
        setSalesData(salesRes.status === 'fulfilled' ? (salesRes.value.data?.recentSales || salesRes.value.data?.sales || []) : []);
        setProducts(prodRes.status === 'fulfilled' ? (prodRes.value.data?.products || prodRes.value.data?.data || []) : []);
      } catch {
        // Silently handle — empty state shown
      }
      setLoading(false);
    }
    load();
  }, [enabled]);

  // Compute predictions for each inventory item
  const predictions = useMemo(() => {
    if (!enabled || !inventory.length) return [];
    return inventory.slice(0, 50).map(item => {
      const productSales = salesData.filter(s =>
        (s.productId || s.product) === (item.productId || item.product)
      );
      return predictDemand({
        productId: item.productId || item.product,
        branchId: item.branchId,
        historicalSales: productSales,
        currentStock: item.quantity || 0,
        leadTimeDays: item.leadTimeDays || 3,
      }, config);
    });
  }, [inventory, salesData, config, enabled]);

  // Reorder suggestions
  const reorderSuggestions = useMemo(() => {
    if (!enabled) return [];
    const salesByProduct = {};
    salesData.forEach(s => {
      const pid = s.productId || s.product;
      if (!salesByProduct[pid]) salesByProduct[pid] = { productId: pid, sales: [] };
      salesByProduct[pid].sales.push(s);
    });
    return generateReorderSuggestions(inventory, Object.values(salesByProduct), config);
  }, [inventory, salesData, config, enabled]);

  // Transfer suggestions
  const transferSuggestions = useMemo(() => {
    if (!enabled) return [];
    const networkInventory = inventory.map(item => {
      const productSales = salesData.filter(s =>
        (s.productId || s.product) === (item.productId || item.product)
      );
      const velocity = productSales.length > 0 ? productSales.length / 30 : 0;
      return {
        branchId: item.branchId,
        branchName: item.branchName || '',
        productId: item.productId || item.product,
        productName: item.productName || '',
        quantity: item.quantity || 0,
        dailyDemand: velocity,
        daysOfStock: velocity > 0 ? (item.quantity || 0) / velocity : 999,
        costPrice: item.costPrice || item.overrideCostPrice || 0,
      };
    });
    return suggestTransfers(networkInventory, config);
  }, [inventory, salesData, config, enabled]);

  // Waste risk
  const wasteRisk = useMemo(() => {
    if (!enabled) return { atRisk: [], actions: [], totalAtRiskValue: 0 };
    return identifyWasteRisk(batches, config);
  }, [batches, config, enabled]);

  // Stats
  const stats = useMemo(() => {
    const criticalItems = predictions.filter(p => p.reorderUrgency === 'critical').length;
    const urgentItems = predictions.filter(p => p.reorderUrgency === 'urgent').length;
    const healthyItems = predictions.filter(p => p.reorderUrgency === 'healthy').length;
    const paydayMult = getPaydayCycleMultiplier(new Date());
    const seasonalMult = getSeasonalMultiplier(new Date());

    return { criticalItems, urgentItems, healthyItems, paydayMult, seasonalMult };
  }, [predictions]);

  if (!enabled) {
    return (
      <div className="text-center py-12">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div className="text-sm text-gray-400">Smart Stock Intelligence is disabled</div>
        <div className="text-xs text-gray-300 mt-1">Enable in Super Admin Config</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-or-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'reorder', label: 'Reorder', count: reorderSuggestions.length },
    { key: 'transfers', label: 'Transfers', count: transferSuggestions.length },
    { key: 'demand', label: 'Demand' },
    { key: 'substitutes', label: 'Substitutes' },
    { key: 'waste', label: 'Waste', count: wasteRisk.atRisk.length },
  ];

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-lg bg-origin-slate border border-or-gold/20 text-center">
          <div className="text-xs text-or-gold-light">Tracked SKUs</div>
          <div className="font-heading text-xl text-white">{inventory.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-origin-slate border border-or-gold/20 text-center">
          <div className="text-xs text-or-gold-light">Critical</div>
          <div className={`font-heading text-xl ${stats.criticalItems > 0 ? 'text-origin-red' : 'text-white'}`}>
            {stats.criticalItems}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-origin-slate border border-or-gold/20 text-center">
          <div className="text-xs text-or-gold-light">Urgent</div>
          <div className={`font-heading text-xl ${stats.urgentItems > 0 ? 'text-or-gold-dark' : 'text-white'}`}>
            {stats.urgentItems}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-origin-slate border border-or-gold/20 text-center">
          <div className="text-xs text-or-gold-light">Healthy</div>
          <div className="font-heading text-xl text-or-gold">{stats.healthyItems}</div>
        </div>
        <div className="p-3 rounded-lg bg-origin-slate border border-or-gold/20 text-center">
          <div className="text-xs text-or-gold-light">Payday Factor</div>
          <div className={`font-heading text-xl ${stats.paydayMult > 1.1 ? 'text-or-gold-dark' : 'text-white'}`}>
            {stats.paydayMult}x
          </div>
        </div>
        <div className="p-3 rounded-lg bg-origin-slate border border-or-gold/20 text-center">
          <div className="text-xs text-or-gold-light">Season Factor</div>
          <div className={`font-heading text-xl ${stats.seasonalMult > 1.1 ? 'text-or-gold-dark' : stats.seasonalMult < 0.9 ? 'text-origin-red' : 'text-white'}`}>
            {stats.seasonalMult}x
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 min-w-0 py-2 rounded text-xs font-bold uppercase transition-colors whitespace-nowrap px-2 ${
              tab === t.key ? 'bg-white text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-origin-red/10 text-origin-red text-[10px]">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <OverviewPanel
          predictions={predictions}
          reorderCount={reorderSuggestions.length}
          transferCount={transferSuggestions.length}
          wasteRisk={wasteRisk}
          stats={stats}
        />
      )}

      {tab === 'reorder' && (
        <ReorderSuggestions
          suggestions={reorderSuggestions}
          autoReorderEnabled={config?.features?.smartStock?.autoReorder}
        />
      )}

      {tab === 'transfers' && (
        <TransferSuggestions suggestions={transferSuggestions} />
      )}

      {tab === 'demand' && (
        <DemandChart predictions={predictions} inventory={inventory} />
      )}

      {tab === 'substitutes' && (
        <SubstitutionFinder products={products} />
      )}

      {tab === 'waste' && (
        <WastePreventionPanel wasteRisk={wasteRisk} />
      )}
    </div>
  );
}

// ─── Overview Panel ─────────────────────────────────────────────

function OverviewPanel({ predictions, reorderCount, transferCount, wasteRisk, stats }) {
  // Top items needing attention
  const urgentItems = predictions
    .filter(p => p.reorderUrgency === 'critical' || p.reorderUrgency === 'urgent')
    .slice(0, 8);

  const URGENCY_STYLES = {
    critical: 'border-origin-red/30 bg-origin-red/5',
    urgent: 'border-or-gold/30 bg-or-gold/5',
    soon: 'border-or-gold/20 bg-origin-slate',
    healthy: 'border-gray-200 bg-white',
  };

  const URGENCY_BADGE = {
    critical: 'error',
    urgent: 'warning',
    soon: 'info',
    healthy: 'active',
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg border border-origin-red/20 bg-origin-red/5">
          <div className="text-xs text-origin-red font-bold uppercase">Reorder Needed</div>
          <div className="font-heading text-2xl text-origin-red mt-1">{reorderCount}</div>
          <div className="text-xs text-gray-400 mt-1">items below threshold</div>
        </div>
        <div className="p-4 rounded-lg border border-or-gold/20 bg-or-gold/5">
          <div className="text-xs text-or-gold-dark font-bold uppercase">Transfer Opportunities</div>
          <div className="font-heading text-2xl text-or-gold-dark mt-1">{transferCount}</div>
          <div className="text-xs text-gray-400 mt-1">inter-branch suggestions</div>
        </div>
        <div className="p-4 rounded-lg border border-origin-red/20 bg-origin-red/5">
          <div className="text-xs text-origin-red font-bold uppercase">Waste Risk</div>
          <div className="font-heading text-2xl text-origin-red mt-1">{wasteRisk.atRisk.length}</div>
          <div className="text-xs text-gray-400 mt-1">{formatCurrency(wasteRisk.totalAtRiskValue)} at risk</div>
        </div>
      </div>

      {/* Urgent items list */}
      {urgentItems.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 font-bold uppercase">Items Needing Attention</div>
          {urgentItems.map((p, i) => (
            <div key={p.productId || i} className={`p-3 rounded-lg border ${URGENCY_STYLES[p.reorderUrgency]}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge status={URGENCY_BADGE[p.reorderUrgency]}>
                    {p.reorderUrgency}
                  </Badge>
                  <span className="text-sm font-semibold text-white">
                    Product #{(p.productId || '').toString().slice(-6)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-heading text-white">{p.currentStock} units</div>
                  <div className="text-[10px] text-gray-400">{p.daysOfStock} days left</div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Daily demand: </span>
                  <span className="font-bold text-white">{p.dailyDemand}</span>
                </div>
                <div>
                  <span className="text-gray-400">Base velocity: </span>
                  <span className="font-bold text-white">{p.baseVelocity}</span>
                </div>
                <div>
                  <span className="text-gray-400">Confidence: </span>
                  <span className={`font-bold ${
                    p.confidence.level === 'high' ? 'text-or-gold' :
                    p.confidence.level === 'medium' ? 'text-or-gold-dark' :
                    'text-origin-red'
                  }`}>{p.confidence.level}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          All stock levels healthy
        </div>
      )}
    </div>
  );
}
