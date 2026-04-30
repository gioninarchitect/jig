import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import SOPHeader from '../../components/SOPHeader';
import { Droplets, Plus, Beaker, AlertTriangle, TrendingUp } from 'lucide-react';
import api from '../../services/api';

export default function FeedingPage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showRecord, setShowRecord] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [form, setForm] = useState({ greenhouseId: '', bayId: '', feedPlanId: '', waterVolume: '', phIn: '', ecIn: '', phRunOff: '', ecRunOff: '', notes: '' });
  const [planForm, setPlanForm] = useState({ name: '', greenhouseId: '', phase: 'VEG', notes: '' });

  const { data: greenhouses } = useQuery({ queryKey: ['greenhouses'], queryFn: () => api.get('/baygrid/greenhouses').then(r => r.data.greenhouses) });
  const { data: records, isLoading } = useQuery({ queryKey: ['feed-records'], queryFn: () => api.get('/feeding/records').then(r => r.data.records) });
  const { data: plans } = useQuery({ queryKey: ['feed-plans'], queryFn: () => api.get('/feeding/plans').then(r => r.data.plans) });
  const { data: stats } = useQuery({ queryKey: ['feed-stats'], queryFn: () => api.get('/feeding/stats').then(r => r.data.stats) });

  const recordMut = useMutation({
    mutationFn: () => api.post('/feeding/records', {
      ...form,
      waterVolume: form.waterVolume ? parseFloat(form.waterVolume) : undefined,
      phIn: form.phIn ? parseFloat(form.phIn) : undefined,
      ecIn: form.ecIn ? parseFloat(form.ecIn) : undefined,
      phRunOff: form.phRunOff ? parseFloat(form.phRunOff) : undefined,
      ecRunOff: form.ecRunOff ? parseFloat(form.ecRunOff) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feed-records'] }); qc.invalidateQueries({ queryKey: ['feed-stats'] }); setShowRecord(false); addToast('success', 'Feed recorded'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const planMut = useMutation({
    mutationFn: () => api.post('/feeding/plans', { ...planForm, schedule: [] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feed-plans'] }); setShowPlan(false); addToast('success', 'Feed plan created'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="space-y-4">
      <SOPHeader
        sopNumber="3-CUL-11"
        title="Feeding & Irrigation Log"
        effectiveDate="01/09/2025"
        version="1.0"
        responsibility="Irrigation Tech"
        reportsTo="Head Grower"
        authorisedBy="Authorised Representative"
        checkedBy="Responsible Pharmacist"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Feeding & Irrigation</h1>
          <p className="text-sm text-white/40">Feed plans, records, pH/EC tracking</p>
        </div>
        {hasMinLevel(2) && (
          <div className="flex gap-2">
            <button onClick={() => setShowPlan(true)} className="px-3 py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-xs font-semibold hover:bg-white/10 transition min-h-[40px]">
              + Plan
            </button>
            <button onClick={() => setShowRecord(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
              <Plus size={16} /> Record Feed
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold font-mono text-white">{stats.activePlans}</div>
            <div className="text-[10px] text-white/25">Active Plans</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold font-mono text-white">{stats.recordsThisWeek}</div>
            <div className="text-[10px] text-white/25">This Week</div>
          </div>
          <div className={`rounded-xl p-3 text-center border ${stats.avgPh && (stats.avgPh < 5.5 || stats.avgPh > 6.8) ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
            <div className={`text-xl font-bold font-mono ${stats.avgPh && (stats.avgPh < 5.5 || stats.avgPh > 6.8) ? 'text-red-400' : 'text-white'}`}>{stats.avgPh || '—'}</div>
            <div className="text-[10px] text-white/25">Avg pH</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold font-mono text-white">{stats.avgEc || '—'}</div>
            <div className="text-[10px] text-white/25">Avg EC</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold font-mono text-white">{stats.totalWaterL}</div>
            <div className="text-[10px] text-white/25">Litres/wk</div>
          </div>
        </div>
      )}

      {/* Feed Plans */}
      {plans && plans.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2"><Beaker size={14} className="text-primary" /> Active Feed Plans</h2>
          <div className="space-y-1.5">
            {plans.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-white/70">{p.name}</span>
                <span className="text-xs text-primary">{p.phase}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent records */}
      {isLoading ? <SkeletonTable rows={5} /> : !records?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center text-white/40">No feeding records yet</div>
      ) : (
        <div className="space-y-2">
          {records.map((r: any) => {
            const phOutOfRange = r.phIn && (r.phIn < 5.5 || r.phIn > 6.8);
            return (
              <div key={r.id} className={`bg-white/5 border rounded-xl p-4 ${phOutOfRange ? 'border-amber-500/20' : 'border-white/10'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Droplets size={14} className="text-blue-400" />
                    <span className="text-sm font-medium text-white">{r.feedPlan?.name || 'Manual feed'}</span>
                  </div>
                  <span className="text-xs text-white/20">{new Date(r.date).toLocaleDateString('en-ZA')}</span>
                </div>
                <div className="flex gap-4 text-xs text-white/40 font-mono mt-1">
                  {r.waterVolume && <span>{r.waterVolume}L</span>}
                  {r.phIn && <span className={phOutOfRange ? 'text-amber-400 font-bold' : ''}>pH {r.phIn}</span>}
                  {r.ecIn && <span>EC {r.ecIn}</span>}
                  {r.phRunOff && <span>RunOff pH {r.phRunOff}</span>}
                  {r.ecRunOff && <span>RunOff EC {r.ecRunOff}</span>}
                </div>
                {r.notes && <div className="text-xs text-white/30 mt-1">{r.notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Record Feed Modal */}
      <Modal open={showRecord} onClose={() => setShowRecord(false)} title="Record Feeding">
        {greenhouses && (
          <ModalSelect label="Greenhouse" value={form.greenhouseId} onChange={e => setForm(f => ({ ...f, greenhouseId: (e.target as HTMLSelectElement).value }))}>
            <option value="">Select greenhouse</option>
            {greenhouses.map((gh: any) => <option key={gh.id} value={gh.id}>{gh.name}</option>)}
          </ModalSelect>
        )}
        {plans && plans.length > 0 && (
          <ModalSelect label="Feed Plan (optional)" value={form.feedPlanId} onChange={e => setForm(f => ({ ...f, feedPlanId: (e.target as HTMLSelectElement).value }))}>
            <option value="">No plan (manual)</option>
            {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.phase})</option>)}
          </ModalSelect>
        )}
        <div className="grid grid-cols-3 gap-3">
          <ModalInput label="Water (L)" type="number" placeholder="0" value={form.waterVolume} onChange={e => setForm(f => ({ ...f, waterVolume: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="pH In" type="number" step="0.1" placeholder="6.2" value={form.phIn} onChange={e => setForm(f => ({ ...f, phIn: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="EC In" type="number" step="0.1" placeholder="1.4" value={form.ecIn} onChange={e => setForm(f => ({ ...f, ecIn: (e.target as HTMLInputElement).value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ModalInput label="Run-off pH" type="number" step="0.1" placeholder="6.0" value={form.phRunOff} onChange={e => setForm(f => ({ ...f, phRunOff: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="Run-off EC" type="number" step="0.1" placeholder="1.8" value={form.ecRunOff} onChange={e => setForm(f => ({ ...f, ecRunOff: (e.target as HTMLInputElement).value }))} />
        </div>
        <ModalInput label="Notes" placeholder="Optional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: (e.target as HTMLInputElement).value }))} />
        <ModalButton loading={recordMut.isPending} onClick={() => recordMut.mutate()} disabled={!form.greenhouseId}>
          Record Feed
        </ModalButton>
      </Modal>

      {/* Create Plan Modal */}
      <Modal open={showPlan} onClose={() => setShowPlan(false)} title="Create Feed Plan">
        <ModalInput label="Plan Name" placeholder="e.g. GH1 Veg Week 1-2" value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: (e.target as HTMLInputElement).value }))} />
        {greenhouses && (
          <ModalSelect label="Greenhouse" value={planForm.greenhouseId} onChange={e => setPlanForm(f => ({ ...f, greenhouseId: (e.target as HTMLSelectElement).value }))}>
            <option value="">Select greenhouse</option>
            {greenhouses.map((gh: any) => <option key={gh.id} value={gh.id}>{gh.name}</option>)}
          </ModalSelect>
        )}
        <ModalSelect label="Phase" value={planForm.phase} onChange={e => setPlanForm(f => ({ ...f, phase: (e.target as HTMLSelectElement).value }))}>
          <option value="VEG">Vegetative</option><option value="FLOWER">Flower</option><option value="FLUSH">Flush</option>
        </ModalSelect>
        <ModalButton loading={planMut.isPending} onClick={() => planMut.mutate()} disabled={!planForm.name || !planForm.greenhouseId}>
          Create Plan
        </ModalButton>
      </Modal>
    </div>
  );
}
