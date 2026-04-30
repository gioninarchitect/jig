import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonTable, SkeletonCard } from '../../components/Skeleton';
import { Package, Plus, Wrench, Thermometer, ShoppingBag, AlertTriangle, QrCode, Settings } from 'lucide-react';
import api from '../../services/api';

const TIER_CONFIG = {
  LIFECYCLE: { label: 'Product', icon: Package, color: 'text-primary' },
  FIXED: { label: 'Equipment', icon: Wrench, color: 'text-amber-400' },
  CONSUMABLE: { label: 'Consumable', icon: ShoppingBag, color: 'text-blue-400' },
};

const CATEGORIES = [
  'GREENHOUSE_INFRA', 'ENVIRONMENTAL_SENSOR', 'WEIGHING', 'LAB',
  'SECURITY', 'FACILITY', 'PPE', 'CONSUMABLE',
];

const STAGES = [
  '', 'PROPAGATION', 'VEGETATIVE', 'FLOWERING', 'HARVEST',
  'WET_RECEIVING', 'DRYING', 'DEBUC', 'TRIM', 'CURE', 'STORE_QA',
  'SALE', 'DISPATCH', 'FACILITY',
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400', MAINTENANCE: 'bg-amber-500/20 text-amber-400',
  FAULTY: 'bg-red-500/20 text-red-400', DECOMMISSIONED: 'bg-white/10 text-white/30',
  OUT_OF_STOCK: 'bg-red-500/20 text-red-400',
};

export default function AssetsPage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [tierFilter, setTierFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [showMaintenance, setShowMaintenance] = useState<string | null>(null);
  const [maintForm, setMaintForm] = useState({ type: 'INSPECTION', description: '' });

  const [form, setForm] = useState({
    tier: 'FIXED', category: 'FACILITY', subcategory: '', name: '', aliases: '',
    description: '', manufacturer: '', model: '', serialNumber: '',
    workflowStage: '', requiresCalibration: false, calibrationInterval: '30',
    isSensor: false, sensorType: '', readingUnit: '',
    isConsumable: false, currentStock: '', minStockLevel: '', unitOfMeasure: '',
  });

  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets', tierFilter, catFilter, stageFilter],
    queryFn: () => api.get('/assets', {
      params: { tier: tierFilter || undefined, category: catFilter || undefined, workflowStage: stageFilter || undefined },
    }).then(r => r.data.assets),
  });

  const { data: stats } = useQuery({
    queryKey: ['asset-stats'],
    queryFn: () => api.get('/assets/stats').then(r => r.data.stats),
  });

  const { data: assetDetail } = useQuery({
    queryKey: ['asset', selectedAsset?.id],
    queryFn: () => api.get(`/assets/${selectedAsset.id}`).then(r => r.data.asset),
    enabled: !!selectedAsset,
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/assets', {
      ...form,
      aliases: form.aliases ? form.aliases.split(',').map((a: string) => a.trim()).filter(Boolean) : [],
      calibrationInterval: form.requiresCalibration ? parseInt(form.calibrationInterval) : undefined,
      currentStock: form.isConsumable ? parseInt(form.currentStock) : undefined,
      minStockLevel: form.isConsumable ? parseInt(form.minStockLevel) : undefined,
      workflowStage: form.workflowStage || undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset-stats'] });
      setShowCreate(false);
      addToast('success', `Asset ${res.data.asset.assetTag} created`);
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const maintMut = useMutation({
    mutationFn: () => api.post(`/assets/${showMaintenance}/maintenance`, maintForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset', showMaintenance] });
      setShowMaintenance(null);
      addToast('success', 'Maintenance logged');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Register</h1>
          <p className="text-sm text-white/40">Equipment, sensors, consumables — all QR tagged</p>
        </div>
        {hasMinLevel(2) && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <Plus size={16} /> Register Asset
          </button>
        )}
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-white font-mono">{stats.total}</div>
            <div className="text-[10px] text-white/30">Total Assets</div>
          </div>
          <div className={`rounded-xl p-3 text-center border ${stats.faulty > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
            <div className={`text-xl font-bold font-mono ${stats.faulty > 0 ? 'text-red-400' : 'text-white'}`}>{stats.faulty}</div>
            <div className="text-[10px] text-white/30">Faulty</div>
          </div>
          <div className={`rounded-xl p-3 text-center border ${stats.calibrationDue > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/10'}`}>
            <div className={`text-xl font-bold font-mono ${stats.calibrationDue > 0 ? 'text-amber-400' : 'text-white'}`}>{stats.calibrationDue}</div>
            <div className="text-[10px] text-white/30">Cal. Due</div>
          </div>
          <div className={`rounded-xl p-3 text-center border ${stats.lowStock > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
            <div className={`text-xl font-bold font-mono ${stats.lowStock > 0 ? 'text-red-400' : 'text-white'}`}>{stats.lowStock}</div>
            <div className="text-[10px] text-white/30">Low Stock</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-white font-mono">{stats.sensors}</div>
            <div className="text-[10px] text-white/30">Sensors</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
        {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setTierFilter(tierFilter === key ? '' : key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition min-h-[36px] flex items-center gap-1.5 ${tierFilter === key ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
            <cfg.icon size={12} /> {cfg.label}
          </button>
        ))}
        <div className="w-px h-6 bg-white/10 self-center" />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/60 border border-white/10 min-h-[36px]">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/60 border border-white/10 min-h-[36px]">
          <option value="">All Stages</option>
          {STAGES.filter(Boolean).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Asset list */}
      {isLoading ? <SkeletonTable rows={6} /> : !assets?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center text-white/40">No assets registered</div>
      ) : (
        <div className="space-y-2">
          {assets.map((a: any) => {
            const tierCfg = TIER_CONFIG[a.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.FIXED;
            const TierIcon = tierCfg.icon;
            const isLowStock = a.isConsumable && a.currentStock !== null && a.minStockLevel !== null && a.currentStock <= a.minStockLevel;
            const calDue = a.nextCalibrationDue && new Date(a.nextCalibrationDue) <= new Date(Date.now() + 7 * 86400000);

            return (
              <div key={a.id} onClick={() => setSelectedAsset(a)}
                className={`bg-white/5 border rounded-xl p-4 cursor-pointer hover:bg-white/[0.07] transition active:scale-[0.98] ${isLowStock || a.status === 'FAULTY' ? 'border-red-500/20' : calDue ? 'border-amber-500/20' : 'border-white/10'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <TierIcon size={16} className={tierCfg.color} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{a.name}</span>
                        <span className="font-mono text-xs text-primary">{a.assetTag}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/30 mt-0.5">
                        <span>{a.category.replace(/_/g, ' ')}</span>
                        {a.workflowStage && <span>· {a.workflowStage.replace(/_/g, ' ')}</span>}
                        {a.isSensor && <span className="text-cyan-400">· {a.sensorType} {a.lastReading !== null ? `${a.lastReading}${a.readingUnit}` : ''}</span>}
                        {a.isConsumable && <span className={isLowStock ? 'text-red-400 font-bold' : ''}>· Stock: {a.currentStock}{a.unitOfMeasure ? `/${a.unitOfMeasure}` : ''}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {calDue && <AlertTriangle size={14} className="text-amber-400" />}
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[a.status] || 'bg-white/10 text-white/30'}`}>{a.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Asset Detail Modal (360 View) */}
      <Modal open={!!selectedAsset} onClose={() => setSelectedAsset(null)} title={assetDetail?.name || 'Asset'}>
        {assetDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-primary text-lg font-bold">{assetDetail.assetTag}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[assetDetail.status]}`}>{assetDetail.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white/5 border border-white/5 rounded-lg p-3"><div className="text-xs text-white/30">Tier</div><div className="text-sm text-white">{assetDetail.tier}</div></div>
              <div className="bg-white/5 border border-white/5 rounded-lg p-3"><div className="text-xs text-white/30">Category</div><div className="text-sm text-white">{assetDetail.category.replace(/_/g, ' ')}</div></div>
              {assetDetail.manufacturer && <div className="bg-white/5 border border-white/5 rounded-lg p-3"><div className="text-xs text-white/30">Manufacturer</div><div className="text-sm text-white">{assetDetail.manufacturer}</div></div>}
              {assetDetail.serialNumber && <div className="bg-white/5 border border-white/5 rounded-lg p-3"><div className="text-xs text-white/30">Serial</div><div className="text-sm text-white font-mono">{assetDetail.serialNumber}</div></div>}
              {assetDetail.workflowStage && <div className="bg-white/5 border border-white/5 rounded-lg p-3"><div className="text-xs text-white/30">Stage</div><div className="text-sm text-white">{assetDetail.workflowStage.replace(/_/g, ' ')}</div></div>}
              {assetDetail.condition && <div className="bg-white/5 border border-white/5 rounded-lg p-3"><div className="text-xs text-white/30">Condition</div><div className="text-sm text-white">{assetDetail.condition}</div></div>}
            </div>

            {/* Sensor reading */}
            {assetDetail.isSensor && assetDetail.lastReading !== null && (
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-center">
                <div className="text-xs text-cyan-400 mb-1">{assetDetail.sensorType} — Last Reading</div>
                <div className="text-3xl font-bold font-mono text-white">{assetDetail.lastReading}<span className="text-sm text-white/30 ml-1">{assetDetail.readingUnit}</span></div>
                {assetDetail.lastReadingAt && <div className="text-xs text-white/20 mt-1">{new Date(assetDetail.lastReadingAt).toLocaleString('en-ZA')}</div>}
              </div>
            )}

            {/* Consumable stock */}
            {assetDetail.isConsumable && (
              <div className={`rounded-xl p-4 border ${assetDetail.currentStock <= assetDetail.minStockLevel ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/50">Stock Level</span>
                  <span className={`text-2xl font-bold font-mono ${assetDetail.currentStock <= assetDetail.minStockLevel ? 'text-red-400' : 'text-white'}`}>
                    {assetDetail.currentStock} <span className="text-sm text-white/30">{assetDetail.unitOfMeasure}</span>
                  </span>
                </div>
                <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${assetDetail.currentStock <= assetDetail.minStockLevel ? 'bg-red-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(100, (assetDetail.currentStock / (assetDetail.minStockLevel * 3)) * 100)}%` }} />
                </div>
                <div className="text-xs text-white/20 mt-1">Min: {assetDetail.minStockLevel} {assetDetail.unitOfMeasure}</div>
              </div>
            )}

            {/* Calibration */}
            {assetDetail.requiresCalibration && (
              <div className={`rounded-lg p-3 border ${assetDetail.nextCalibrationDue && new Date(assetDetail.nextCalibrationDue) <= new Date(Date.now() + 7 * 86400000) ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/10'}`}>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Next Calibration</span>
                  <span className="text-white">{assetDetail.nextCalibrationDue ? new Date(assetDetail.nextCalibrationDue).toLocaleDateString('en-ZA') : 'Not scheduled'}</span>
                </div>
              </div>
            )}

            {/* Maintenance log */}
            {assetDetail.maintenanceLogs?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-2">Maintenance History</h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {assetDetail.maintenanceLogs.map((l: any) => (
                    <div key={l.id} className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-amber-400 font-semibold">{l.type}</span>
                        <span className="text-white/20">{new Date(l.performedAt).toLocaleDateString('en-ZA')}</span>
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">{l.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aliases */}
            {assetDetail.aliases && (assetDetail.aliases as string[]).length > 0 && (
              <div>
                <div className="text-xs text-white/30 mb-1">Also known as</div>
                <div className="flex flex-wrap gap-1.5">
                  {(assetDetail.aliases as string[]).map((a: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white/50">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* QR Label */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
              <div className="text-xs text-primary mb-2 font-semibold">Asset QR Tag</div>
              <div className="text-2xl font-bold font-mono text-white mb-2">{assetDetail.assetTag}</div>
              <a href={`/api/qr/print/asset/${assetDetail.id}`} target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-semibold transition min-h-[40px]">
                <QrCode size={14} /> Print QR Label
              </a>
            </div>

            {/* Actions */}
            {hasMinLevel(2) && (
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); setShowMaintenance(assetDetail.id); setMaintForm({ type: 'INSPECTION', description: '' }); }}
                  className="flex-1 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-sm font-semibold hover:bg-amber-500/20 transition flex items-center justify-center gap-1.5 min-h-[44px]">
                  <Settings size={14} /> Log Maintenance
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Log Maintenance Modal */}
      <Modal open={!!showMaintenance} onClose={() => setShowMaintenance(null)} title="Log Maintenance">
        <ModalSelect label="Type" value={maintForm.type} onChange={e => setMaintForm(f => ({ ...f, type: (e.target as HTMLSelectElement).value }))}>
          <option value="CALIBRATION">Calibration</option>
          <option value="REPAIR">Repair</option>
          <option value="SERVICE">Service</option>
          <option value="INSPECTION">Inspection</option>
          <option value="CLEANING">Cleaning</option>
          <option value="REPLACEMENT">Replacement</option>
        </ModalSelect>
        <ModalInput label="Description" placeholder="What was done?" value={maintForm.description} onChange={e => setMaintForm(f => ({ ...f, description: (e.target as HTMLInputElement).value }))} />
        <ModalButton loading={maintMut.isPending} onClick={() => maintMut.mutate()} disabled={!maintForm.description}>Log Maintenance</ModalButton>
      </Modal>

      {/* Create Asset Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Register Asset">
        <ModalSelect label="Tier" value={form.tier} onChange={e => setForm(f => ({ ...f, tier: (e.target as HTMLSelectElement).value }))}>
          <option value="FIXED">Equipment (fixed asset)</option>
          <option value="CONSUMABLE">Consumable (stock tracked)</option>
          <option value="LIFECYCLE">Product Container (lifecycle tracked)</option>
        </ModalSelect>
        <ModalInput label="Name" placeholder="e.g. GH1 Extractor Fan A" value={form.name} onChange={e => setForm(f => ({ ...f, name: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Aliases (comma separated)" placeholder="e.g. Fan A, Big Fan, GH1-FA" value={form.aliases} onChange={e => setForm(f => ({ ...f, aliases: (e.target as HTMLInputElement).value }))} />
        <div className="grid grid-cols-2 gap-3">
          <ModalSelect label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: (e.target as HTMLSelectElement).value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </ModalSelect>
          <ModalSelect label="Workflow Stage" value={form.workflowStage} onChange={e => setForm(f => ({ ...f, workflowStage: (e.target as HTMLSelectElement).value }))}>
            <option value="">Facility-wide</option>
            {STAGES.filter(Boolean).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </ModalSelect>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ModalInput label="Manufacturer" placeholder="Optional" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="Serial Number" placeholder="Optional" value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: (e.target as HTMLInputElement).value }))} />
        </div>

        {form.tier === 'FIXED' && (
          <label className="flex items-center gap-2 text-sm text-white/50 mt-2">
            <input type="checkbox" checked={form.requiresCalibration} onChange={e => setForm(f => ({ ...f, requiresCalibration: e.target.checked }))} />
            Requires calibration (every <input type="number" value={form.calibrationInterval} onChange={e => setForm(f => ({ ...f, calibrationInterval: e.target.value }))} className="w-12 px-1 py-0.5 bg-dark border border-white/10 rounded text-white text-center mx-1" /> days)
          </label>
        )}

        {form.tier === 'CONSUMABLE' && (
          <div className="grid grid-cols-3 gap-3 mt-2">
            <ModalInput label="Current Stock" type="number" value={form.currentStock} onChange={e => setForm(f => ({ ...f, currentStock: (e.target as HTMLInputElement).value }))} />
            <ModalInput label="Min Level" type="number" value={form.minStockLevel} onChange={e => setForm(f => ({ ...f, minStockLevel: (e.target as HTMLInputElement).value }))} />
            <ModalInput label="Unit" placeholder="box, pair" value={form.unitOfMeasure} onChange={e => setForm(f => ({ ...f, unitOfMeasure: (e.target as HTMLInputElement).value }))} />
          </div>
        )}

        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!form.name}>
          Register Asset + Generate QR
        </ModalButton>
      </Modal>
    </div>
  );
}
