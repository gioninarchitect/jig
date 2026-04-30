import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import SOPHeader from '../../components/SOPHeader';
import { Skull, Plus, TrendingDown, AlertTriangle, Check } from 'lucide-react';
import api from '../../services/api';

const CAUSES = [
  'PEST', 'MOULD', 'ROOT_ROT', 'NUTRIENT_BURN', 'NUTRIENT_DEFICIENCY',
  'OVERWATERING', 'UNDERWATERING', 'LIGHT_STRESS', 'HEAT_STRESS', 'COLD_STRESS',
  'GENETIC', 'TRANSPLANT_SHOCK', 'MECHANICAL_DAMAGE', 'DISEASE', 'UNKNOWN',
];

const CAUSE_COLORS: Record<string, string> = {
  PEST: 'text-red-400', MOULD: 'text-red-400', ROOT_ROT: 'text-amber-400', DISEASE: 'text-red-400',
  NUTRIENT_BURN: 'text-amber-400', NUTRIENT_DEFICIENCY: 'text-amber-400',
  OVERWATERING: 'text-blue-400', UNDERWATERING: 'text-amber-400',
  LIGHT_STRESS: 'text-yellow-400', HEAT_STRESS: 'text-red-300', COLD_STRESS: 'text-blue-300',
  GENETIC: 'text-purple-400', TRANSPLANT_SHOCK: 'text-amber-300', MECHANICAL_DAMAGE: 'text-white/40',
  UNKNOWN: 'text-white/30',
};

export default function MortalityPage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showRecord, setShowRecord] = useState(false);
  const [form, setForm] = useState({ entityType: 'CLONE', strain: '', quantity: '1', causeCategory: 'UNKNOWN', causeDetail: '', preventable: false, actionTaken: '', phase: '', notes: '' });

  const { data: stats } = useQuery({ queryKey: ['mortality-stats'], queryFn: () => api.get('/mortality/stats').then(r => r.data.stats) });
  const { data: records, isLoading } = useQuery({ queryKey: ['mortality-records'], queryFn: () => api.get('/mortality').then(r => r.data.records) });

  const { data: strains } = useQuery({ queryKey: ['strains'], queryFn: () => api.get('/strains').then(r => r.data.strains) });

  const recordMut = useMutation({
    mutationFn: () => api.post('/mortality', { ...form, quantity: parseInt(form.quantity) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mortality'] }); setShowRecord(false); addToast('success', 'Mortality recorded'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const reviewMut = useMutation({
    mutationFn: (id: string) => api.patch(`/mortality/${id}/review`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mortality-records'] }); addToast('success', 'Reviewed'); },
  });

  return (
    <div className="space-y-4">
      <SOPHeader
        sopNumber="3-CUL-6 / 3-CUL-7 / 3-CUL-9"
        title="Mortality Register · Mother Bay · Clone Room · Greenhouse"
        effectiveDate="03/09/2025"
        version="1.0"
        responsibility="Plant Technicians"
        reportsTo="Head Grower"
        authorisedBy="Authorised Representative"
        checkedBy="Responsible Pharmacist"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Mortality Register</h1>
          <p className="text-sm text-white/40">Deaths, culling, root cause analysis</p>
        </div>
        {hasMinLevel(1) && (
          <button onClick={() => setShowRecord(true)} className="px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <Plus size={16} /> Record Death
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className={`rounded-xl p-3 text-center border ${stats.totalDeaths > 0 ? 'bg-red-500/5 border-red-500/15' : 'bg-white/5 border-white/10'}`}>
            <div className={`text-xl font-bold font-mono ${stats.totalDeaths > 0 ? 'text-red-400' : 'text-white'}`}>{stats.totalDeaths}</div>
            <div className="text-[10px] text-white/25">Total Deaths</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold font-mono text-white">{stats.monthlyDeaths}</div>
            <div className="text-[10px] text-white/25">This Month</div>
          </div>
          <div className={`rounded-xl p-3 text-center border ${stats.cloneMortalityRate > 20 ? 'bg-red-500/5 border-red-500/15' : 'bg-white/5 border-white/10'}`}>
            <div className={`text-xl font-bold font-mono ${stats.cloneMortalityRate > 20 ? 'text-red-400' : 'text-white'}`}>{stats.cloneMortalityRate}%</div>
            <div className="text-[10px] text-white/25">Clone Mortality</div>
          </div>
          <div className={`rounded-xl p-3 text-center border ${stats.preventableRate > 50 ? 'bg-amber-500/5 border-amber-500/15' : 'bg-white/5 border-white/10'}`}>
            <div className={`text-xl font-bold font-mono ${stats.preventableRate > 50 ? 'text-amber-400' : 'text-white'}`}>{stats.preventableRate}%</div>
            <div className="text-[10px] text-white/25">Preventable</div>
          </div>
          {stats.topCause && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className={`text-sm font-bold ${CAUSE_COLORS[stats.topCause.cause] || 'text-white'}`}>{stats.topCause.cause.replace(/_/g, ' ')}</div>
              <div className="text-[10px] text-white/25">Top Cause ({stats.topCause.count})</div>
            </div>
          )}
        </div>
      )}

      {/* Cause breakdown */}
      {stats?.byCause && Object.keys(stats.byCause).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white/60 mb-3">Death Causes</h2>
          <div className="space-y-1.5">
            {Object.entries(stats.byCause as Record<string, number>).sort((a, b) => b[1] - a[1]).map(([cause, count]) => (
              <div key={cause} className="flex items-center gap-3">
                <span className={`text-sm flex-1 ${CAUSE_COLORS[cause] || 'text-white/40'}`}>{cause.replace(/_/g, ' ')}</span>
                <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500/50 rounded-full" style={{ width: `${(count / stats.totalDeaths) * 100}%` }} />
                </div>
                <span className="text-xs font-mono text-white/30 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Records list */}
      {isLoading ? <SkeletonTable rows={5} /> : !records?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center text-white/40">No mortality records</div>
      ) : (
        <div className="space-y-2">
          {records.map((r: any) => (
            <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <Skull size={14} className="text-red-400" />
                  <span className="text-sm font-medium text-white">{r.entityType} — {r.strain}</span>
                  <span className="font-mono text-xs text-white/30">×{r.quantity}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${CAUSE_COLORS[r.causeCategory]} bg-white/5`}>{r.causeCategory.replace(/_/g, ' ')}</span>
              </div>
              {r.causeDetail && <p className="text-xs text-white/40 mb-1">{r.causeDetail}</p>}
              <div className="flex items-center gap-3 text-[10px] text-white/20">
                <span>{new Date(r.date).toLocaleDateString('en-ZA')}</span>
                {r.preventable && <span className="text-amber-400">Preventable</span>}
                {r.actionTaken && <span>Action: {r.actionTaken}</span>}
                {r.phase && <span>Phase: {r.phase}</span>}
                {r.reviewedAt ? (
                  <span className="text-green-400 ml-auto">Reviewed ✓</span>
                ) : hasMinLevel(3) ? (
                  <button onClick={() => reviewMut.mutate(r.id)} className="text-primary hover:text-primary-light ml-auto">Review</button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Death Modal */}
      <Modal open={showRecord} onClose={() => setShowRecord(false)} title="Record Mortality">
        <div className="grid grid-cols-2 gap-3">
          <ModalSelect label="Type" value={form.entityType} onChange={e => setForm(f => ({ ...f, entityType: (e.target as HTMLSelectElement).value }))}>
            <option value="CLONE">Clone</option>
            <option value="PLANT">Plant</option>
            <option value="MOTHER">Mother Plant</option>
          </ModalSelect>
          <ModalInput label="Quantity" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: (e.target as HTMLInputElement).value }))} />
        </div>
        <ModalSelect label="Strain" value={form.strain} onChange={e => setForm(f => ({ ...f, strain: (e.target as HTMLSelectElement).value }))}>
          <option value="">Select strain</option>
          {strains?.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </ModalSelect>
        <ModalSelect label="Cause of Death" value={form.causeCategory} onChange={e => setForm(f => ({ ...f, causeCategory: (e.target as HTMLSelectElement).value }))}>
          {CAUSES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
        </ModalSelect>
        <ModalInput label="Detail (what happened)" placeholder="e.g. Mould found on roots in tray CT-005" value={form.causeDetail} onChange={e => setForm(f => ({ ...f, causeDetail: (e.target as HTMLInputElement).value }))} />
        <label className="flex items-center gap-2 text-sm text-white/50 my-2">
          <input type="checkbox" checked={form.preventable} onChange={e => setForm(f => ({ ...f, preventable: e.target.checked }))} className="w-4 h-4 rounded" />
          This was preventable
        </label>
        {form.preventable && (
          <ModalInput label="Corrective action taken" placeholder="e.g. Adjusted watering schedule" value={form.actionTaken} onChange={e => setForm(f => ({ ...f, actionTaken: (e.target as HTMLInputElement).value }))} />
        )}
        <ModalSelect label="Phase when death occurred" value={form.phase} onChange={e => setForm(f => ({ ...f, phase: (e.target as HTMLSelectElement).value }))}>
          <option value="">Unknown</option>
          <option value="ROOTING">Rooting</option>
          <option value="VEGETATIVE">Vegetative</option>
          <option value="FLOWERING">Flowering</option>
          <option value="TRANSPLANT">Transplant</option>
        </ModalSelect>
        <ModalButton loading={recordMut.isPending} onClick={() => recordMut.mutate()} disabled={!form.strain || !form.causeCategory}>
          Record Death — {form.quantity} {form.entityType.toLowerCase()}{parseInt(form.quantity) > 1 ? 's' : ''}
        </ModalButton>
      </Modal>
    </div>
  );
}
