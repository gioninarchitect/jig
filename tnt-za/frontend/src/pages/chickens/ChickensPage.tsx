import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { Bird, Plus, ChevronRight, Camera, Check, X, ShieldCheck, Play } from 'lucide-react';
import api from '../../services/api';

const STATUS = {
  VERIFIED: { dot: '#22C55E', ring: '#22C55E', label: 'Verified' },
  PENDING: { dot: '#F8C242', ring: '#6b551f', label: 'Pending' },
  FLAGGED: { dot: '#DC2626', ring: '#DC2626', label: 'Flagged' },
} as const;
const st = (s: string) => (STATUS as any)[s] || STATUS.PENDING;

export default function ChickensPage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [house, setHouse] = useState<string | null>(null);
  const [showLoad, setShowLoad] = useState(false);
  const [loadForm, setLoadForm] = useState({ house: 'House 1', chickenCount: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [review, setReview] = useState(false);
  const [rIdx, setRIdx] = useState(0);
  const [vCount, setVCount] = useState('');

  const { data: summary } = useQuery({ queryKey: ['chicken-summary'], queryFn: () => api.get('/chickens/summary').then(r => r.data.summary) });
  const { data: crates } = useQuery({
    queryKey: ['chicken-crates', house],
    queryFn: () => api.get(`/chickens/crates${house ? `?house=${encodeURIComponent(house)}` : ''}`).then(r => r.data.crates),
  });

  const loadMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('house', loadForm.house); fd.append('chickenCount', loadForm.chickenCount);
      if (photo) fd.append('photo', photo);
      return api.post('/chickens/crates', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['chicken-crates'] }); qc.invalidateQueries({ queryKey: ['chicken-summary'] }); setShowLoad(false); setPhoto(null); setLoadForm(f => ({ ...f, chickenCount: '' })); addToast('success', `Crate ${res.data.crate?.crateNumber} loaded`); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const verifyMut = useMutation({
    mutationFn: (p: { id: string; action: 'verify' | 'flag'; verifiedCount?: number; flagReason?: string }) =>
      api.patch(`/chickens/crates/${p.id}/verify`, { action: p.action, verifiedCount: p.verifiedCount, flagReason: p.flagReason }),
    onSuccess: (_r, p) => { qc.invalidateQueries({ queryKey: ['chicken-crates'] }); qc.invalidateQueries({ queryKey: ['chicken-summary'] }); addToast('success', p.action === 'flag' ? 'Flagged' : 'Verified'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const pending = (crates || []).filter((c: any) => c.status === 'PENDING');
  const reviewCrate = pending[rIdx];
  const advance = () => { if (rIdx + 1 < pending.length) { setRIdx(rIdx + 1); setVCount(''); } else { setReview(false); setRIdx(0); setVCount(''); } };

  return (
    <div className="space-y-5">
      {/* breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm flex-wrap">
        <button onClick={() => setHouse(null)} className={`px-2.5 py-1 rounded-lg border ${!house ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-white/60'}`}>Chicken Farm</button>
        {house && <><ChevronRight size={14} className="text-white/20" /><span className="px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 text-primary">{house}</span></>}
        <div className="ml-auto flex gap-2">
          {hasMinLevel(3) && (crates || []).some((c: any) => c.status === 'PENDING') && (
            <button onClick={() => { setReview(true); setRIdx(0); setVCount(''); }} className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm font-semibold flex items-center gap-1.5"><Play size={14} /> Daily Verify</button>
          )}
          {house && hasMinLevel(1) && (
            <button onClick={() => { setLoadForm(f => ({ ...f, house })); setShowLoad(true); }} className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-1.5"><Plus size={14} /> Load Crate</button>
          )}
        </div>
      </div>

      {/* Farm overview */}
      {!house && summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[['Flock', summary.totals.flock, ''], ['Crates', summary.totals.crates, ''], ['Pending', summary.totals.pending, 'text-amber-300'], ['Flagged', summary.totals.flagged, 'text-red-300']].map(([k, v, c]: any) => (
              <div key={k} className="bg-white/5 border border-white/10 rounded-xl p-3"><div className={`text-2xl font-bold ${c || 'text-white'}`}>{Number(v).toLocaleString()}</div><div className="text-xs text-white/40">{k}</div></div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summary.houses.map((h: any) => (
              <button key={h.name} onClick={() => setHouse(h.name)} className="text-left bg-white/5 border border-white/10 rounded-xl p-4 hover:border-primary/40 transition">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2"><Bird size={18} className="text-primary" /><span className="font-bold text-white">{h.name}</span></div>
                  <span className="text-xs text-white/40">{h.flock.toLocaleString()} birds</span>
                </div>
                <div className="flex gap-3 text-xs text-white/50 mt-2">
                  <span>{h.crates} crates</span>
                  <span className="text-green-300">✓ {h.verified}</span>
                  <span className="text-amber-300">⏳ {h.pending}</span>
                  {h.flagged > 0 && <span className="text-red-300">⚑ {h.flagged}</span>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* House → crate photo cards */}
      {house && (
        !crates?.length ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
            <Bird size={36} className="text-white/15 mx-auto mb-3" /><p className="text-white/40">No crates loaded in {house} yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {crates.map((c: any) => { const s = st(c.status); return (
              <div key={c.id} className="bg-white/5 rounded-xl overflow-hidden border-2" style={{ borderColor: s.ring + '66' }}>
                <div className="aspect-square bg-black/40 relative">
                  {c.photoUrl ? <img src={c.photoUrl} alt={c.crateNumber} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20"><Camera size={28} /></div>}
                  <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full" style={{ background: s.dot, boxShadow: `0 0 6px ${s.dot}` }} />
                  <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full">🐔 {c.verifiedCount ?? c.chickenCount}</span>
                </div>
                <div className="p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-white/60">{c.crateNumber}</span>
                    <span className="text-[10px] font-semibold" style={{ color: s.dot }}>{s.label}</span>
                  </div>
                  {hasMinLevel(3) && c.status === 'PENDING' && (
                    <div className="flex gap-1 mt-1.5">
                      <button onClick={() => verifyMut.mutate({ id: c.id, action: 'verify' })} className="flex-1 py-1 rounded bg-green-500/15 border border-green-500/30 text-green-300 text-[11px] font-semibold">✓ Verify</button>
                      <button onClick={() => verifyMut.mutate({ id: c.id, action: 'flag', flagReason: 'count mismatch' })} className="flex-1 py-1 rounded bg-red-500/10 border border-red-500/25 text-red-300 text-[11px] font-semibold">⚑ Flag</button>
                    </div>
                  )}
                </div>
              </div>
            ); })}
          </div>
        )
      )}

      {/* Daily Verify — Review Reel */}
      {review && reviewCrate && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex items-center justify-between p-4">
            <span className="text-white/60 text-sm">Daily Verify · {rIdx + 1}/{pending.length}</span>
            <button onClick={() => setReview(false)} className="text-white/50 hover:text-white"><X size={22} /></button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-4 gap-3">
            <div className="w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10">
              {reviewCrate.photoUrl ? <img src={reviewCrate.photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20"><Camera size={40} /></div>}
            </div>
            <div className="text-center">
              <div className="text-white font-bold">{reviewCrate.crateNumber} · {reviewCrate.house}</div>
              <div className="text-white/50 text-sm">Staff submitted: <b className="text-white">{reviewCrate.chickenCount}</b> birds</div>
            </div>
            <input value={vCount} onChange={e => setVCount(e.target.value)} type="number" placeholder={`Your count (default ${reviewCrate.chickenCount})`}
              className="w-full max-w-sm px-3 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white text-center placeholder:text-white/25" />
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            <button onClick={() => { verifyMut.mutate({ id: reviewCrate.id, action: 'flag', verifiedCount: vCount ? parseInt(vCount) : undefined, flagReason: 'count mismatch' }); advance(); }}
              className="py-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 font-bold flex items-center justify-center gap-2"><X size={18} /> Flag</button>
            <button onClick={() => { verifyMut.mutate({ id: reviewCrate.id, action: 'verify', verifiedCount: vCount ? parseInt(vCount) : undefined }); advance(); }}
              className="py-4 rounded-2xl bg-green-500/15 border border-green-500/40 text-green-300 font-bold flex items-center justify-center gap-2"><Check size={18} /> Verify</button>
          </div>
        </div>
      )}

      {/* Load crate */}
      <Modal open={showLoad} onClose={() => setShowLoad(false)} title="Load Crate — count + photo">
        <ModalSelect label="House" value={loadForm.house} onChange={e => setLoadForm(f => ({ ...f, house: (e.target as HTMLSelectElement).value }))}>
          {(summary?.houses || []).map((h: any) => <option key={h.name} value={h.name}>{h.name}</option>)}
        </ModalSelect>
        <ModalInput label="Chicken count (varies by bird size)" type="number" placeholder="e.g. 12" value={loadForm.chickenCount} onChange={e => setLoadForm(f => ({ ...f, chickenCount: (e.target as HTMLInputElement).value }))} />
        <div className="mb-3">
          <label className="block text-xs text-white/50 mb-1.5">Crate photo (evidence)</label>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setPhoto((e.target as HTMLInputElement).files?.[0] || null)} />
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full py-3 rounded-xl bg-white/5 border border-dashed border-white/20 text-white/60 text-sm flex items-center justify-center gap-2">
            <Camera size={16} /> {photo ? photo.name.slice(0, 28) : 'Take / choose photo'}
          </button>
        </div>
        <ModalButton loading={loadMut.isPending} onClick={() => loadMut.mutate()} disabled={!loadForm.chickenCount}>Load crate</ModalButton>
      </Modal>
    </div>
  );
}
