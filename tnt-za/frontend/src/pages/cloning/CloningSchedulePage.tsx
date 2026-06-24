import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalButton } from '../../components/Modal';
import { SkeletonCard } from '../../components/Skeleton';
import SOPHeader from '../../components/SOPHeader';
import MediaUpload from '../../components/MediaUpload';
import { Scissors, Plus, Crown, Layers, List, Trash2, Grid3x3 } from 'lucide-react';
import { strainColor } from '../../utils/strainColor';
import api from '../../services/api';

// Tray status → indicator colour (matches greenhouse status lights)
const TRAY_DOT: Record<string, string> = { ROOTING: '#F8C242', ROOTED: '#22C55E', TRANSPLANTED: '#7FA8E5', FAILED: '#DC2626' };
const RACK_SIZE = 16; // 4 shelves × 4 trays per nursery rack
const rackLabel = (i: number) => `Rack ${String.fromCharCode(65 + i)}`;

// dd/mm for tray codes (ILCO handwritten format)
const ddmm = (d?: string | Date | null) => { if (!d) return ''; const x = new Date(d); return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}`; };
// Mother number from an identifier like "SL 007 14/10/2025" → "7" (offspring index; mother line = 0)
const motherNum = (m?: any) => { const mm = String(m?.identifier || '').match(/\b(\d{1,4})\b/); return mm ? String(parseInt(mm[1], 10)) : '?'; };

const STATUS_COLORS: Record<string, string> = {
  ROOTING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  ROOTED: 'bg-green-500/15 text-green-300 border-green-500/30',
  TRANSPLANTED: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  FAILED: 'bg-red-500/15 text-red-300 border-red-500/30',
};
const PURPOSE_LABEL: Record<string, string> = { PRODUCTION: 'Production', R_AND_D: 'New Mothers', CLIENT: 'Client' };

// A tray's lifecycle — any state is correctable (e.g. a fresh tray wrongly seeded as Rooted).
const TRAY_STATUSES = [
  { value: 'ROOTING', label: 'Rooting', color: 'bg-amber-500 text-black border-amber-500' },
  { value: 'ROOTED', label: 'Rooted', color: 'bg-green-500 text-black border-green-500' },
  { value: 'TRANSPLANTED', label: 'Transplanted', color: 'bg-blue-500 text-white border-blue-500' },
  { value: 'FAILED', label: 'Failed', color: 'bg-red-500 text-white border-red-500' },
];
const PURPOSE_PILLS = [
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'R_AND_D', label: 'New Mothers' },
  { value: 'CLIENT', label: 'Client' },
];

// Individual-clone lifecycle (per-clone CRUD, like a bay pot)
const CLONE_STATUSES = [
  { value: 'ROOTING', label: 'Rooting', color: 'bg-amber-500 text-black border-amber-500' },
  { value: 'ROOTED', label: 'Rooted', color: 'bg-green-500 text-black border-green-500' },
  { value: 'TRANSPLANTED', label: 'Transplanted', color: 'bg-blue-500 text-white border-blue-500' },
  { value: 'CULLED', label: 'Culled', color: 'bg-red-500 text-white border-red-500' },
  { value: 'DEAD', label: 'Dead', color: 'bg-red-700 text-white border-red-700' },
];
const CLONE_DOT: Record<string, string> = { ROOTING: '#F8C242', ROOTED: '#22C55E', TRANSPLANTED: '#7FB0E5', CULLED: '#DC2626', DEAD: '#991B1B' };

// Tap-friendly pill selector — replaces the fiddly dropdowns the NM found confusing.
function PillRow({ options, value, onChange }: { options: { value: string; label: string; color?: string; dim?: boolean }[]; value: string; onChange: (v: string) => void; }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={`px-3.5 py-2 rounded-full text-sm font-medium border transition min-h-[42px] active:scale-95 ${active ? (o.color || 'bg-primary text-white border-primary') : `bg-white/5 border-white/10 hover:text-white hover:border-white/25 ${o.dim ? 'text-white/25' : 'text-white/50'}`}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const today = () => new Date().toISOString().split('T')[0];

export default function CloningSchedulePage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [lockedMother, setLockedMother] = useState<any>(null); // set when cloning is opened FROM a mother card
  const addAnotherRef = useRef(false); // "Save & add another" — keep modal open for rapid sheet capture
  const [nurseryView, setNurseryView] = useState<'racks' | 'list'>('racks');
  const [detail, setDetail] = useState<any>(null); // clone-tray detail/pop modal
  const [trayEdit, setTrayEdit] = useState<{ rooted: string; mortality: string; notes: string }>({ rooted: '', mortality: '', notes: '' });
  const openDetail = (t: any) => { setDetail(t); setConfirmDelTray(false); setTrayEdit({ rooted: String(t.rooted ?? 0), mortality: String(t.mortality ?? 0), notes: t.notes || '' }); };
  const [form, setForm] = useState({ strain: '', motherPlantId: '', motherUnit: '', motherLabel: '', trayNo: '1', batchNumber: '', totalCuttings: '126', cloneDate: today(), rootingDays: '14', purpose: 'PRODUCTION', clientName: '' });

  const { data: trays, isLoading } = useQuery({ queryKey: ['clone-trays'], queryFn: () => api.get('/baygrid/clone-trays').then(r => r.data.trays) });
  const { data: mothers } = useQuery({ queryKey: ['mothers'], queryFn: () => api.get('/baygrid/mothers').then(r => r.data.mothers) });

  // Cloning opened FROM a mother card (?mother=<id>): pre-link strain + mother (breadcrumb),
  // NM only fills tray details. No strain/pot picker.
  useEffect(() => {
    const mid = sp.get('mother');
    if (!mid || !mothers) return;
    const m = mothers.find((x: any) => x.id === mid);
    if (m) {
      setLockedMother(m);
      setForm(f => ({ ...f, strain: m.strain, motherPlantId: m.id, motherUnit: '1', motherLabel: '' }));
      setShowCreate(true);
    }
  }, [sp, mothers]);
  const closeCreate = () => { setShowCreate(false); setLockedMother(null); if (sp.get('mother')) navigate('/cloning', { replace: true }); };

  const selectedMother = mothers?.find((m: any) => m.id === form.motherPlantId);
  // Tray code: STRAIN-M{mother}-{offspring}-T{tray}-{cloneDate}, e.g. SL-M40-1-T1-19/06.
  // strain · mother (0-index) · offspring (starts at 1) · tray · start date (today).
  // The real mother linkage is motherPlantId on the tray; this is the human label.
  const cloneCode = selectedMother && form.trayNo
    ? `${form.strain}-M${motherNum(selectedMother)}-${form.motherUnit || '1'}-T${form.trayNo}-${ddmm(form.cloneDate)}`
    : '';

  const createMut = useMutation({
    mutationFn: () => api.post('/baygrid/clone-trays', {
      motherPlantId: form.motherPlantId,
      strain: form.strain,
      motherUnit: form.motherUnit ? parseInt(form.motherUnit) : undefined,
      motherLabel: form.motherLabel || undefined,
      batchNumber: form.batchNumber.trim() || cloneCode || undefined,
      totalCuttings: parseInt(form.totalCuttings),
      cloneDate: form.cloneDate,
      rootingDays: parseInt(form.rootingDays),
      purpose: form.purpose,
      clientName: form.purpose === 'CLIENT' ? form.clientName : undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['clone-trays'] }); qc.invalidateQueries({ queryKey: ['mothers'] });
      addToast('success', `Tray ${res.data.tray?.trayNumber || ''} saved — ${form.totalCuttings} cuttings`);
      if (addAnotherRef.current) {
        // Keep the modal open for the next line on the sheet: clear mother + count + code, keep tray #, date, rooting.
        setLockedMother(null); if (sp.get('mother')) navigate('/cloning', { replace: true });
        setForm(f => ({ ...f, strain: '', motherPlantId: '', motherUnit: '', motherLabel: '', batchNumber: '', totalCuttings: '126' }));
      } else {
        setShowCreate(false); setLockedMother(null); if (sp.get('mother')) navigate('/cloning', { replace: true });
        setForm({ strain: '', motherPlantId: '', motherUnit: '', motherLabel: '', trayNo: '1', batchNumber: '', totalCuttings: '126', cloneDate: today(), rootingDays: '14', purpose: 'PRODUCTION', clientName: '' });
      }
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  // NM updates the tray from the detail modal: rooted count, mortality, status, photo/video proof, notes.
  const updateTrayMut = useMutation({
    mutationFn: (patch: any) => api.patch(`/baygrid/clone-trays/${detail.id}`, patch),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['clone-trays'] });
      setDetail((d: any) => ({ ...d, ...res.data.tray }));
      addToast('success', 'Tray updated');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  // Delete the whole tray (blocked server-side once transplanted).
  const [confirmDelTray, setConfirmDelTray] = useState(false);
  const delTrayMut = useMutation({
    mutationFn: () => api.delete(`/baygrid/clone-trays/${detail.id}`),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['clone-trays'] }); qc.invalidateQueries({ queryKey: ['mothers'] });
      setDetail(null); setConfirmDelTray(false);
      addToast('success', `Tray deleted${r.data?.clonesRemoved ? ` · ${r.data.clonesRemoved} cuttings removed` : ''}`);
    },
    onError: (e: any) => { setConfirmDelTray(false); addToast('error', e.response?.data?.error || 'Failed'); },
  });

  // Per-clone drill: the tray's individual cuttings, each tappable → status (like a bay pot).
  const [showClones, setShowClones] = useState(false);
  const [clone, setClone] = useState<any>(null);
  const { data: cloneData } = useQuery({
    queryKey: ['tray-clones', detail?.id],
    queryFn: () => api.get(`/clones/tray/${detail.id}`).then(r => r.data),
    enabled: !!detail && showClones,
  });
  const clones: any[] = cloneData?.clones || [];
  const cloneMut = useMutation({
    mutationFn: (vars: { id: string; status: string }) => api.patch(`/clones/${vars.id}`, { status: vars.status }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['tray-clones', detail?.id] });
      qc.invalidateQueries({ queryKey: ['clone-trays'] });
      setClone((c: any) => c ? { ...c, ...res.data.clone } : null);
      addToast('success', 'Clone updated');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const activeMothers = (mothers || []).filter((m: any) => m.status === 'ACTIVE');

  return (
    <div className="space-y-5">
      <SOPHeader sopNumber="3-CUL-7" title="Cloning & Transplanting Schedule" effectiveDate="16/06/2026" version="1.0"
        responsibility="Nursery Manager / Cultivators" reportsTo="Head of Cultivation" authorisedBy="Facility Manager" checkedBy="QA" referenceDoc="New Cloning form · Mother cloning" />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Nursery · Cloning</h1>
          <p className="text-sm text-white/40">Trays in racks · 1 tray = 126 cuttings · tap a tray to drill in</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Rack ⇆ List view */}
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button onClick={() => setNurseryView('racks')} className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 ${nurseryView === 'racks' ? 'bg-primary text-white' : 'bg-white/5 text-white/50'}`}><Layers size={13} /> Racks</button>
            <button onClick={() => setNurseryView('list')} className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 ${nurseryView === 'list' ? 'bg-primary text-white' : 'bg-white/5 text-white/50'}`}><List size={13} /> List</button>
          </div>
          {hasMinLevel(1) && (
            <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 min-h-[44px]">
              <Plus size={16} /> New Cloning Job
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      ) : !trays?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
          <Scissors size={36} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/40 mb-1">No cloning jobs yet</p>
          <p className="text-xs text-white/25">Start one from a mother plant to create a clone tray + batch #</p>
        </div>
      ) : nurseryView === 'racks' ? (
        /* RACK VIEW — trays sit in racks (4 shelves × 4 trays). Tap a tray to drill in. */
        <div className="space-y-4">
          <div className="text-xs text-white/40">
            {trays.length} tray{trays.length !== 1 ? 's' : ''} · {trays.reduce((a: number, t: any) => a + (t.totalCuttings || 0), 0).toLocaleString()} cuttings in the nursery
          </div>
          {Array.from({ length: Math.ceil(trays.length / RACK_SIZE) }, (_, ri) => trays.slice(ri * RACK_SIZE, ri * RACK_SIZE + RACK_SIZE)).map((rack: any[], ri: number) => (
            <div key={ri} className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <Layers size={14} className="text-primary" />
                <span className="text-sm font-semibold text-white/80">{rackLabel(ri)}</span>
                <span className="text-xs text-white/30">{rack.length} / {RACK_SIZE} trays</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {rack.map((t: any) => {
                  const rootPct = t.totalCuttings ? Math.round((t.rooted / t.totalCuttings) * 100) : 0;
                  const dot = TRAY_DOT[t.status] || '#888';
                  const col = strainColor(t.strain);
                  return (
                    <button key={t.id} onClick={() => openDetail(t)} title={`${t.trayNumber} · ${t.strain} · ${t.status}`}
                      className="text-left rounded-lg p-2.5 transition active:scale-95 hover:ring-1 hover:ring-white/50"
                      style={{ background: `${col}1f`, border: `1px solid ${col}55`, borderLeft: `3px solid ${dot}` }}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-white truncate">{t.trayNumber}</span>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
                      </div>
                      <div className="text-xs font-semibold mt-0.5 truncate" style={{ color: col }}>{t.strain}</div>
                      <div className="mt-1 text-white/90"><span className="text-lg font-bold leading-none">{t.totalCuttings}</span><span className="text-[10px] text-white/40"> cuttings</span></div>
                      <div className="h-1 rounded-full bg-black/40 overflow-hidden mt-1.5"><div className="h-full bg-green-500" style={{ width: `${rootPct}%` }} /></div>
                      <div className="text-[9px] text-white/40 mt-0.5 capitalize">{t.status.toLowerCase()} · {rootPct}% rooted</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trays.map((t: any) => {
            const day = Math.max(0, Math.floor((Date.now() - new Date(t.cloneDate).getTime()) / 86400000));
            const rootPct = t.totalCuttings ? Math.round((t.rooted / t.totalCuttings) * 100) : 0;
            return (
              <div key={t.id} onClick={() => openDetail(t)}
                className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:border-primary/40 hover:bg-white/[0.07] transition active:scale-[0.99]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold font-mono text-white">{t.trayNumber}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[t.status] || 'bg-white/10 text-white/50'}`}>{t.status}</span>
                </div>
                <div className="text-sm text-white/80 mb-1">{t.strain}</div>
                <div className="text-xs text-white/40 mb-2 flex items-center gap-1"><Crown size={11} className="text-amber-400" /> {t.motherPlant?.identifier || '—'} · <span className={t.purpose === 'R_AND_D' ? 'text-purple-300' : t.purpose === 'CLIENT' ? 'text-blue-300' : ''}>{PURPOSE_LABEL[t.purpose] || t.purpose}</span></div>
                <div className="flex justify-between text-xs text-white/50 mb-2">
                  <span>{t.totalCuttings} cuttings</span><span>{t.rooted} rooted</span><span className={t.mortality > 0 ? 'text-red-300' : ''}>{t.mortality} lost</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-2"><div className="h-full bg-green-500" style={{ width: `${rootPct}%` }} /></div>
                <div className="flex justify-between text-[11px] text-white/35">
                  <span>Day {day} / {t.rootingDays}</span>
                  <span>{new Date(t.cloneDate).toLocaleDateString('en-ZA')}{t.transplantDate ? ` → ${new Date(t.transplantDate).toLocaleDateString('en-ZA')}` : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clone-tray detail (pop modal) */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Tray ${detail.trayNumber}` : ''}>
        {detail && (() => {
          const day = Math.max(0, Math.floor((Date.now() - new Date(detail.cloneDate).getTime()) / 86400000));
          const rootPct = detail.totalCuttings ? Math.round((detail.rooted / detail.totalCuttings) * 100) : 0;
          const photos: string[] = Array.isArray(detail.photos) ? detail.photos : [];
          const isDone = detail.status === 'TRANSPLANTED' || detail.status === 'FAILED';
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[detail.status] || 'bg-white/10 text-white/50'}`}>{detail.status}</span>
                <span className="text-sm text-white font-semibold">{detail.strain}</span>
                <span className="text-xs text-white/40">{PURPOSE_LABEL[detail.purpose] || detail.purpose}{detail.clientName ? ` · ${detail.clientName}` : ''}</span>
              </div>

              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-white/40 mb-1">Mother lineage</div>
                <div className="flex items-center gap-2 text-sm text-white"><Crown size={13} className="text-amber-400" /> {detail.motherPlant?.identifier || '—'}{detail.motherLabel ? ` · pot ${detail.motherLabel}` : ''}{detail.motherPlant?.room ? ` · ${detail.motherPlant.room}` : ''}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/5 rounded-lg p-2"><div className="text-lg font-bold text-white">{detail.totalCuttings}</div><div className="text-[10px] text-white/40">cuttings</div></div>
                <div className="bg-white/5 rounded-lg p-2"><div className="text-lg font-bold text-green-300">{detail.rooted}</div><div className="text-[10px] text-white/40">rooted ({rootPct}%)</div></div>
                <div className="bg-white/5 rounded-lg p-2"><div className={`text-lg font-bold ${detail.mortality > 0 ? 'text-red-300' : 'text-white'}`}>{detail.mortality}</div><div className="text-[10px] text-white/40">lost</div></div>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${rootPct}%` }} /></div>
              <div className="flex justify-between text-[11px] text-white/40">
                <span>Day {day} / {detail.rootingDays}</span>
                <span>{new Date(detail.cloneDate).toLocaleDateString('en-ZA')}{detail.transplantDate ? ` → ${new Date(detail.transplantDate).toLocaleDateString('en-ZA')}` : ` · transplant ~day ${detail.rootingDays}`}</span>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 text-[11px] text-white/50 space-y-1">
                <div className="text-xs text-white/40 mb-1">Rooting / mortality checks</div>
                {[7, 14, 21].map((d, i) => { const due = new Date(detail.cloneDate); due.setDate(due.getDate() + d); return (
                  <div key={i} className="flex justify-between"><span>Mortality Check W{i + 1}</span><span className={day >= d ? 'text-green-300' : ''}>{due.toLocaleDateString('en-ZA')}{day >= d ? ' · due' : ''}</span></div>
                ); })}
              </div>

              <MediaUpload value={photos} onChange={(urls) => updateTrayMut.mutate({ photos: urls })} label="Photo / short-video proof" />

              {/* Stage — tap to set/correct the tray's status (any state, even after transplant) */}
              {hasMinLevel(1) && (
                <div className="border-t border-white/10 pt-3">
                  <div className="text-[10px] text-white/40 mb-2">Stage — tap to set</div>
                  <PillRow value={detail.status} onChange={(v) => updateTrayMut.mutate({ status: v })} options={TRAY_STATUSES} />
                </div>
              )}

              {hasMinLevel(1) && !isDone && (
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] text-white/40">Rooted</label><input type="number" value={trayEdit.rooted} onChange={e => setTrayEdit(s => ({ ...s, rooted: e.target.value }))} className="w-full px-2 py-1.5 bg-dark border border-white/10 rounded-lg text-white text-sm focus:border-primary focus:outline-none" /></div>
                    <div><label className="text-[10px] text-white/40">Lost</label><input type="number" value={trayEdit.mortality} onChange={e => setTrayEdit(s => ({ ...s, mortality: e.target.value }))} className="w-full px-2 py-1.5 bg-dark border border-white/10 rounded-lg text-white text-sm focus:border-primary focus:outline-none" /></div>
                  </div>
                  <textarea placeholder="Notes…" value={trayEdit.notes} onChange={e => setTrayEdit(s => ({ ...s, notes: e.target.value }))} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-lg text-white text-sm min-h-[56px] focus:border-primary focus:outline-none" />
                  <button onClick={() => updateTrayMut.mutate({ rooted: parseInt(trayEdit.rooted) || 0, mortality: parseInt(trayEdit.mortality) || 0, notes: trayEdit.notes })} disabled={updateTrayMut.isPending} className="px-3 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 min-h-[40px]">Save counts + notes</button>
                </div>
              )}

              {/* Drill into the individual clones — each tappable like a bay pot */}
              <div className="border-t border-white/10 pt-3">
                <button onClick={() => setShowClones(true)}
                  className="w-full px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-sm font-semibold hover:bg-emerald-500/20 min-h-[44px] flex items-center justify-center gap-2">
                  <Grid3x3 size={15} /> View {detail.totalCuttings} clones
                </button>
              </div>

              {/* Delete the whole tray (2-tap confirm). Server blocks it once transplanted. */}
              {hasMinLevel(1) && (
                <div className="border-t border-white/10 pt-3">
                  <button onClick={() => confirmDelTray ? delTrayMut.mutate() : setConfirmDelTray(true)} disabled={delTrayMut.isPending}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border min-h-[40px] flex items-center gap-1.5 ${confirmDelTray ? 'bg-red-500/25 border-red-500/50 text-red-200' : 'bg-red-500/10 border-red-500/25 text-red-300 hover:bg-red-500/20'}`}>
                    <Trash2 size={13} /> {delTrayMut.isPending ? 'Deleting…' : confirmDelTray ? 'Tap again to confirm — delete tray' : 'Delete tray'}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Clone grid — every cutting in the tray, tappable like a bay pot */}
      <Modal open={showClones} onClose={() => setShowClones(false)} title={detail ? `${detail.trayNumber} · clones` : ''}>
        {(() => {
          const counts = clones.reduce((a: any, c: any) => { a[c.status] = (a[c.status] || 0) + 1; return a; }, {});
          return (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-[11px]">
                {CLONE_STATUSES.map(s => counts[s.value] ? (
                  <span key={s.value} className="flex items-center gap-1 text-white/60"><span className="w-2 h-2 rounded-full" style={{ background: CLONE_DOT[s.value] }} />{s.label} {counts[s.value]}</span>
                ) : null)}
              </div>
              {clones.length === 0 ? (
                <div className="text-center text-white/30 text-sm py-8">Loading clones…</div>
              ) : (
                <div className="grid gap-1 max-h-[60vh] overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
                  {clones.map((c: any) => {
                    const dot = CLONE_DOT[c.status] || '#888';
                    return (
                      <button key={c.id} onClick={() => setClone(c)} title={`${c.cloneId} · ${c.status}`}
                        className="aspect-square rounded flex flex-col items-center justify-center gap-0.5 hover:ring-1 hover:ring-white/50 transition"
                        style={{ background: `${dot}26`, border: `1px solid ${dot}` }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                        <span className="text-[7px] font-mono text-white/55">{c.sequenceNumber}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="text-[11px] text-white/30">Tap a clone to set its status. Tray rooted/lost counts update automatically.</div>
            </div>
          );
        })()}
      </Modal>

      {/* Single clone — status CRUD (consistent with bay-pot + mother) */}
      <Modal open={!!clone} onClose={() => setClone(null)} title={clone ? `Clone ${clone.cloneId}` : ''}>
        {clone && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: CLONE_DOT[clone.status] || '#888' }} />
              <span className="text-white font-semibold">{clone.strain}</span>
              <span className="text-white/40 text-xs">#{clone.sequenceNumber} · health {String(clone.healthStatus || '').toLowerCase()}</span>
            </div>
            <div>
              <div className="text-[10px] text-white/40 mb-2">Status — tap to set</div>
              <PillRow value={clone.status} onChange={(v) => cloneMut.mutate({ id: clone.id, status: v })} options={CLONE_STATUSES} />
            </div>
            {(clone.status === 'CULLED' || clone.status === 'DEAD') && clone.deathCause && (
              <div className="text-xs text-red-300/80">Cause: {String(clone.deathCause).toLowerCase()}{clone.deathDate ? ` · ${new Date(clone.deathDate).toLocaleDateString('en-ZA')}` : ''}</div>
            )}
          </div>
        )}
      </Modal>

      {/* New Cloning Job */}
      <Modal open={showCreate} onClose={closeCreate} title="New Cloning Job (SOP 3-CUL-7)">
        {lockedMother ? (
          /* Opened from the mother card — mother + strain already linked (breadcrumb). NM just fills the tray. */
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-primary/80 mb-1">Cloning from mother</div>
            <div className="flex items-center gap-2 text-sm text-white font-semibold"><Crown size={14} className="text-amber-400" /> {lockedMother.identifier} · {lockedMother.strain}{lockedMother.room ? ` · ${lockedMother.room}` : ''}</div>
            <div className="text-[11px] text-white/40 mt-1">Strain &amp; mother are linked automatically — just fill the tray details below.</div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm text-white/50 mb-2">Mother plant <span className="text-white/30 text-xs">· pick the mother to clone from (or open from a mother card)</span></label>
            <select value={form.motherPlantId}
              onChange={e => { const m = mothers?.find((x: any) => x.id === e.target.value); setForm(f => ({ ...f, motherPlantId: e.target.value, strain: m?.strain || '', motherUnit: '1', motherLabel: '' })); }}
              className="w-full px-4 py-2.5 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none">
              <option value="">— choose mother —</option>
              {activeMothers.map((m: any) => <option key={m.id} value={m.id}>{m.identifier} · {m.strain}{m.room ? ` · ${m.room}` : ''}</option>)}
            </select>
            {selectedMother && <div className="mt-2 text-[11px] text-primary/90 flex items-center gap-1"><Crown size={11} className="text-amber-400" /> {selectedMother.identifier} · {selectedMother.strain} — linked</div>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <ModalInput label="Tray # (T)" type="number" value={form.trayNo} onChange={e => setForm(f => ({ ...f, trayNo: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="Cuttings (full tray = 126)" type="number" value={form.totalCuttings} onChange={e => setForm(f => ({ ...f, totalCuttings: (e.target as HTMLInputElement).value }))} />
        </div>
        <ModalInput label="Clone date" type="date" value={form.cloneDate} onChange={e => setForm(f => ({ ...f, cloneDate: (e.target as HTMLInputElement).value }))} />
        {/* Auto-assembled tray code (matches the handwritten label). Editable to match the physical tray exactly. */}
        <div className="mb-4">
          <label className="block text-sm text-white/50 mb-1.5">Tray code <span className="text-white/30 text-xs">· auto from mother + tray + date</span></label>
          {cloneCode && !form.batchNumber && (
            <div className="mb-1.5 font-mono text-sm text-primary bg-primary/10 border border-primary/25 rounded-lg px-3 py-2">{cloneCode}</div>
          )}
          <input placeholder={cloneCode || 'pick a mother + tray # first'} value={form.batchNumber}
            onChange={e => setForm(f => ({ ...f, batchNumber: (e.target as HTMLInputElement).value }))}
            className="w-full px-4 py-2.5 bg-dark border border-white/10 rounded-xl text-white text-sm font-mono focus:border-primary focus:outline-none" />
          <p className="text-[11px] text-white/30 mt-1">Leave blank to use the auto code above, or type to override.</p>
        </div>
        <ModalInput label="Rooting days" type="number" value={form.rootingDays} onChange={e => setForm(f => ({ ...f, rootingDays: (e.target as HTMLInputElement).value }))} />
        <div className="mb-4">
          <label className="block text-sm text-white/50 mb-2">Purpose</label>
          <PillRow value={form.purpose} onChange={v => setForm(f => ({ ...f, purpose: v }))} options={PURPOSE_PILLS} />
        </div>
        {form.purpose === 'CLIENT' && (
          <ModalInput label="Client name" placeholder="who ordered" value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: (e.target as HTMLInputElement).value }))} />
        )}
        <div className="text-[11px] text-white/35 mb-2">Creates the clone tray + batch # and tracks W1–W3 mortality → transplant.</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={() => { addAnotherRef.current = true; createMut.mutate(); }} disabled={createMut.isPending || !form.motherPlantId || !form.totalCuttings}
            className="flex-1 px-4 py-3 rounded-xl bg-primary/15 border border-primary/40 text-primary text-sm font-bold hover:bg-primary/25 disabled:opacity-40 min-h-[48px]">
            + Save &amp; add another
          </button>
          <div className="flex-1">
            <ModalButton loading={createMut.isPending} onClick={() => { addAnotherRef.current = false; createMut.mutate(); }} disabled={!form.motherPlantId || !form.totalCuttings}>Save &amp; close</ModalButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
