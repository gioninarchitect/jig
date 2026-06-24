import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useReadOnly } from '../../hooks/useReadOnly';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonCard } from '../../components/Skeleton';
import SOPHeader from '../../components/SOPHeader';
import { Building2, Plus, ChevronRight, Grid3X3, Leaf, X, Pencil } from 'lucide-react';
import api from '../../services/api';

// Strain → colour (matches the facility GridView palette)
const STRAIN_HEX: Record<string, string> = {
  'SL': '#7CC47C', 'KB': '#D4B86A', 'Heady Eddy': '#5FC9C0', 'Heady Daddy': '#B68BD4',
  'Elvis': '#E58BA0', 'GP': '#7FA8E5', 'Sunday Driver': '#F0A65A', 'Keke': '#6FD0E0',
  'Avro Banana': '#E8D86A', 'Old Cheese': '#B7B05A', 'Cereal Milk': '#E0C9A8', 'DP': '#C08A6A',
  'Higher Primate': '#D46AB0', 'Strawberry Lemonade': '#E5D17F', 'Cheese': '#C9C36A', 'Subr01?': '#888',
};
function strainColor(s?: string | null) {
  if (!s) return '#2a2a2a';
  if (STRAIN_HEX[s]) return STRAIN_HEX[s];
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h} 45% 60%)`;
}
// Plant status → light colour
function statusLight(status?: string, strain?: string | null) {
  switch (status) {
    case 'OCCUPIED': return { dot: '#22C55E', label: 'Active' };       // green
    case 'FLAGGED': case 'RESERVED': return { dot: '#F8C242', label: 'Flagged' }; // yellow
    case 'DESTROYED': case 'DEAD': return { dot: '#DC2626', label: 'Dead' };      // red
    case 'HARVESTED': return { dot: '#3B82F6', label: 'Harvested' };              // blue
    case 'MAINTENANCE': return { dot: '#7FA8E5', label: 'Maintenance' };
    default: return { dot: strain ? '#22C55E' : '#3a3a3a', label: strain ? 'Active' : 'Empty' };
  }
}

export default function BayGridPage() {
  const { hasMinLevel } = useRBAC();
  const readOnly = useReadOnly();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [ghForm, setGhForm] = useState({ name: '', type: 'VEG', totalBays: 3, rows: 4, subrows: 4, spotsPerSubrow: 130 });
  // drill path: [gh, bay, {row}, {subrow}]
  const [gh, setGh] = useState<any>(null);
  const [bay, setBay] = useState<any>(null);
  const [row, setRow] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [pot, setPot] = useState<any>(null);
  const [potView, setPotView] = useState<'grid' | 'list'>('grid'); // LEVEL 3 plant view mode

  const { data: layout, isLoading } = useQuery({ queryKey: ['baygrid-layout'], queryFn: () => api.get('/baygrid/layout').then(r => r.data.layout) });

  const { data: spots } = useQuery({
    queryKey: ['subrow-spots', bay?.id, row?.row, sub?.subrow],
    queryFn: () => api.get(`/baygrid/bays/${bay.id}/subrow/${row.row}/${sub.subrow}`).then(r => r.data.spots),
    enabled: !!(bay && row && sub),
  });

  // All pots in the bay — drives the portrait Bay view's live plant grid + the last view's bed.
  const { data: baySpots } = useQuery({
    queryKey: ['bay-spots', bay?.id],
    queryFn: () => api.get(`/baygrid/bays/${bay.id}/spots`).then(r => r.data.spots),
    enabled: !!bay,
  });
  const spotsByLane = useMemo(() => {
    const m: Record<string, any[]> = {};
    (baySpots || []).forEach((s: any) => { const k = `${s.row}-${s.subrow}`; (m[k] = m[k] || []).push(s); });
    return m;
  }, [baySpots]);
  // Last view = the selected ROW's 4-across bed. seq = (depth-1)*4 + lane (subrow), so #1 is
  // bottom-LEFT and numbers climb left→right then up (top-right = highest). For a 4-column
  // grid that means rendering rows top-down: highest depth first, lanes 1→4 within each:
  //   9 10 11 12 / 5 6 7 8 / 1 2 3 4   (#1 bottom-left → top-right).
  const bedPots = useMemo(() => {
    if (!row) return [];
    return (baySpots || [])
      .filter((s: any) => s.row === row.row)
      .map((s: any) => ({ ...s, seq: (Number(s.position) - 1) * 4 + s.subrow }))
      .sort((a: any, b: any) => (Number(b.position) - Number(a.position)) || (a.subrow - b.subrow));
  }, [baySpots, row]);
  const { data: strainList } = useQuery({ queryKey: ['strains-list'], queryFn: () => api.get('/strains').then(r => r.data.strains || r.data) });

  const [showEdit, setShowEdit] = useState(false);
  const [editStrain, setEditStrain] = useState('');
  const [confirmRestrain, setConfirmRestrain] = useState(false);
  // group / multi-select of pots
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [showBulkStrain, setShowBulkStrain] = useState(false);
  const [bulkStrain, setBulkStrain] = useState('');
  const [confirmBulk, setConfirmBulk] = useState<string | null>(null);
  const editMut = useMutation({
    mutationFn: () => api.patch(`/baygrid/bays/${bay.id}/subrow/${row.row}/${sub.subrow}/strain`, { strain: editStrain || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baygrid-layout'] });
      qc.invalidateQueries({ queryKey: ['subrow-spots'] });
      qc.invalidateQueries({ queryKey: ['bay-spots'] });
      setSub((s: any) => ({ ...s, strain: editStrain || null }));
      setShowEdit(false); addToast('success', 'Subrow strain updated');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  // Bulk re-strain: clears every plant in the subrow (records mortality) then sets the new strain.
  const restrainMut = useMutation({
    mutationFn: () => api.patch(`/baygrid/bays/${bay.id}/subrow/${row.row}/${sub.subrow}/restrain`, { strain: editStrain }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['baygrid-layout'] });
      qc.invalidateQueries({ queryKey: ['subrow-spots'] });
      qc.invalidateQueries({ queryKey: ['bay-spots'] });
      setSub((s: any) => ({ ...s, strain: editStrain }));
      setShowEdit(false);
      addToast('success', `Re-strained to ${editStrain} · cleared ${r.data?.cleared ?? 0} plant(s)`);
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  // group action on a selection of pots
  const bulkMut = useMutation({
    mutationFn: (vars: { action: string; strain?: string }) => api.patch('/baygrid/spots/bulk', { spotIds: [...selected], action: vars.action, strain: vars.strain }),
    onSuccess: (r: any, vars) => {
      qc.invalidateQueries({ queryKey: ['baygrid-layout'] });
      qc.invalidateQueries({ queryKey: ['subrow-spots'] });
      qc.invalidateQueries({ queryKey: ['bay-spots'] });
      addToast('success', `${vars.action === 'restrain' ? 'Re-strained' : vars.action} ${r.data?.affected ?? selected.size} pot(s)${r.data?.mortality ? ` · ${r.data.mortality} mortality` : ''}`);
      setSelected(new Set()); setRangeStart(null); setRangeMode(false); setShowBulkStrain(false); setBulkStrain(''); setConfirmBulk(null);
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const potActionMut = useMutation({
    mutationFn: (action: string) => api.patch(`/baygrid/spots/${pot.id}/status`, { action }),
    onSuccess: (res, action) => {
      qc.invalidateQueries({ queryKey: ['subrow-spots'] });
      qc.invalidateQueries({ queryKey: ['bay-spots'] });
      setPot((p: any) => ({ ...p, status: res.data.spot?.status }));
      addToast('success', `Pot ${action === 'cull' ? 'culled' : action === 'flag' ? 'flagged' : action === 'clear' ? 'cleared' : 'restored'}`);
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/baygrid/greenhouses', ghForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['baygrid-layout'] }); setShowCreate(false); addToast('success', 'Greenhouse created'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  // edit greenhouse (name / type / bays) + delete — full CRUD
  const [editGh, setEditGh] = useState<any>(null);
  const [ghEditForm, setGhEditForm] = useState({ name: '', type: 'VEG', totalBays: 1 });
  const [confirmDelGh, setConfirmDelGh] = useState(false);
  const editGhMut = useMutation({
    mutationFn: () => api.patch(`/baygrid/greenhouses/${editGh.id}`, { name: ghEditForm.name, type: ghEditForm.type, totalBays: ghEditForm.totalBays }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['baygrid-layout'] }); setEditGh(null); addToast('success', 'Greenhouse updated'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  const delGhMut = useMutation({
    mutationFn: () => api.delete(`/baygrid/greenhouses/${editGh.id}`),
    onSuccess: (r: any) => { qc.invalidateQueries({ queryKey: ['baygrid-layout'] }); setEditGh(null); setConfirmDelGh(false); addToast('success', r.data?.archived ? 'Greenhouse archived (had plants)' : 'Greenhouse deleted'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const reset = (level: number) => { if (level < 4) setPot(null); if (level < 3) { setSub(null); setSelectMode(false); setSelected(new Set()); setRangeMode(false); setRangeStart(null); } if (level < 2) setRow(null); if (level < 1) setBay(null); if (level < 1) setGh(null); };

  return (
    <div className="space-y-5">
      <SOPHeader sopNumber="3-CUL-2" title="GridView · Greenhouse → Bay → Row → Subrow → Plant" effectiveDate="16/06/2026" version="2.0" responsibility="Cultivators" reportsTo="Head of Cultivation" authorisedBy="Facility Manager" checkedBy="QA" />

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 flex-wrap text-sm">
        <button onClick={() => { setGh(null); setBay(null); setRow(null); setSub(null); }} className={`px-2.5 py-1 rounded-lg border ${!gh ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-white/60 hover:border-primary/40'}`}>Facility</button>
        {gh && <><ChevronRight size={14} className="text-white/20" /><button onClick={() => { setBay(null); setRow(null); setSub(null); }} className={`px-2.5 py-1 rounded-lg border ${!bay ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-white/60'}`}>{gh.name}</button></>}
        {bay && <><ChevronRight size={14} className="text-white/20" /><button onClick={() => { setRow(null); setSub(null); }} className={`px-2.5 py-1 rounded-lg border ${!row ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-white/60'}`}>{bay.name}</button></>}
        {row && <><ChevronRight size={14} className="text-white/20" /><button onClick={() => setSub(null)} className={`px-2.5 py-1 rounded-lg border ${!sub ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-white/60'}`}>Row {row.row}</button></>}
        {sub && <><ChevronRight size={14} className="text-white/20" /><span className="px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 text-primary">Subrow {sub.subrow}</span></>}
        {!gh && !readOnly && hasMinLevel(3) && (
          <button onClick={() => setShowCreate(true)} className="ml-auto px-3 py-1.5 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"><Plus size={14} /> Greenhouse</button>
        )}
      </div>

      {isLoading ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div> : (
        <>
          {/* LEVEL 0 — Greenhouses */}
          {!gh && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(layout || []).map((g: any) => {
                const strains = new Set<string>(); g.bays.forEach((b: any) => b.rows.forEach((r: any) => r.subrows.forEach((s: any) => s.strain && strains.add(s.strain))));
                return (
                  <div key={g.id} className="relative bg-white/5 border border-white/10 rounded-xl p-4 hover:border-primary/40 transition">
                    <button onClick={() => setGh(g)} className="text-left w-full">
                      <div className="flex items-center gap-2 mb-1 pr-7"><Building2 size={16} className="text-primary" /><span className="font-bold text-white">{g.name}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">{g.type}</span></div>
                      <div className="text-xs text-white/40">{g.bays.length} bays · {strains.size} strains</div>
                      <div className="flex flex-wrap gap-1 mt-2">{[...strains].slice(0, 8).map(s => <span key={s} className="w-3 h-3 rounded-sm" style={{ background: strainColor(s) }} title={s} />)}</div>
                    </button>
                    {!readOnly && hasMinLevel(3) && (
                      <button onClick={(e) => { e.stopPropagation(); setGhEditForm({ name: g.name, type: g.type, totalBays: g.bays.length }); setConfirmDelGh(false); setEditGh(g); }} title="Edit greenhouse"
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 transition"><Pencil size={13} /></button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* LEVEL 1 — Bays */}
          {gh && !bay && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {gh.bays.map((b: any) => {
                const strains = new Set<string>(); b.rows.forEach((r: any) => r.subrows.forEach((s: any) => s.strain && strains.add(s.strain)));
                return (
                  <button key={b.id} onClick={() => setBay(b)} className="text-left bg-white/5 border border-white/10 rounded-xl p-4 hover:border-primary/40 transition">
                    <div className="font-bold text-white mb-1">{b.name}</div>
                    <div className="text-xs text-white/40 mb-2">{b.rows.length} rows × 4 subrows{strains.size > 1 ? ' · MIXED' : strains.size === 1 ? ` · ${[...strains][0]}` : ''}</div>
                    <div className="flex flex-wrap gap-1">{[...strains].map(s => <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: strainColor(s), color: '#0A0A0A' }}>{s}</span>)}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* LEVEL 2 — the BAY in PORTRAIT: Row 1..N as tall columns side-by-side, each
              column = its 4 subrow lanes running DOWN (the physical bed length), strain-
              coloured. Horizontal-scroll on small screens so the rows stay portrait.
              Tap a lane → drill to its plants (1,5,9… sequence) where strain is editable. */}
          {bay && !sub && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {bay.rows.map((r: any) => {
                const rowStrains = new Set<string>(r.subrows.map((s: any) => s.strain).filter(Boolean));
                const rowTotal = r.subrows.reduce((a: number, s: any) => a + (s.spots || 0), 0);
                return (
                <div key={r.row} className="flex-shrink-0 w-[200px] sm:w-[240px] bg-white/5 border border-white/10 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="text-sm font-bold text-white/80">Row {r.row}</div>
                    <div className="text-[9px] text-white/30 truncate max-w-[60%] text-right">{rowStrains.size > 1 ? `${rowStrains.size} strains` : [...rowStrains][0] || 'empty'} · {rowTotal}/{r.subrows.length * 130} plants</div>
                  </div>
                  {/* 4 subrow lanes running DOWN — each shows its LIVE plant grid, every pot
                      coloured by status (green active · amber flagged · red culled/dead · grey empty). */}
                  <div className="flex gap-1.5" style={{ height: 384 }}>
                    {r.subrows.map((s: any) => {
                      const col = strainColor(s.strain);
                      const lanePots = spotsByLane[`${r.row}-${s.subrow}`] || [];
                      return (
                      <button key={s.subrow} onClick={() => { setRow(r); setSub(s); }}
                        className="flex-1 rounded-md overflow-hidden border border-white/10 hover:ring-1 hover:ring-white/50 transition flex flex-col"
                        title={`Lane ${s.subrow} · ${s.strain || 'empty'} · ${s.spots} plants — tap for pots`}>
                        <div className="py-0.5 text-center" style={{ background: col }}>
                          <span className="text-[8px] font-bold text-black/80">S{s.subrow}</span>
                        </div>
                        <div className="flex-1 bg-black/40 p-0.5 overflow-y-auto">
                          {lanePots.length > 0 ? (
                            <div className="grid gap-px content-start" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                              {lanePots.map((pp: any) => {
                                const lt = statusLight(pp.status, pp.strain);
                                const issue = pp.status === 'FLAGGED' || pp.status === 'RESERVED' || pp.status === 'DESTROYED' || pp.status === 'DEAD' || pp.status === 'MAINTENANCE' || pp.status === 'HARVESTED';
                                const empty = !pp.strain && (!pp.status || pp.status === 'EMPTY');
                                // healthy pot → STRAIN colour (4-in-a-row strain map); issue → status colour; empty → grey
                                const cell = issue ? lt.dot : empty ? '#2f2f2f' : strainColor(pp.strain || s.strain);
                                return <div key={pp.id} className="rounded-[1px]" style={{ background: cell, aspectRatio: '1' }} title={`#${pp.position} · ${pp.strain || s.strain || 'empty'} · ${lt.label}`} />;
                              })}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-[8px] text-white/30" style={{ writingMode: 'vertical-rl' as any }}>{s.strain || 'empty'}</div>
                          )}
                        </div>
                      </button>
                      );
                    })}
                  </div>
                  <div className="text-center text-[8px] text-white/25 mt-1 tracking-wider">S1 · S2 · S3 · S4 — tap a lane to drill</div>
                </div>
                );
              })}
            </div>
          )}

          {/* LEVEL 3 — Plants/Pots in the subrow (status lights) */}
          {sub && (
            <div>
              <div className="flex items-center gap-3 mb-3 text-sm">
                <span className="px-2 py-1 rounded-lg font-bold" style={{ background: strainColor(sub.strain), color: '#0A0A0A' }}>{sub.strain || 'empty'}</span>
                {!readOnly && hasMinLevel(2) && (
                  <button onClick={() => { setEditStrain(sub.strain || ''); setShowEdit(true); }} className="px-2 py-1 rounded-lg bg-white/5 border border-white/15 text-white/70 text-xs font-semibold hover:border-primary/40">Edit strain</button>
                )}
                <span className="text-white/50">{(spots || []).length} pots · {bay.name} · Row {row.row} · Subrow {sub.subrow}</span>
                <div className="ml-auto flex items-center gap-3 text-[11px] text-white/50">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#22C55E' }} /> Active</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F8C242' }} /> Flagged</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#DC2626' }} /> Dead</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3B82F6' }} /> Harvested</span>
                </div>
              </div>
              {!readOnly && hasMinLevel(1) && (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <button onClick={() => { setSelectMode(m => !m); setSelected(new Set()); setRangeMode(false); setRangeStart(null); setConfirmBulk(null); }}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${selectMode ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/5 border-white/15 text-white/70 hover:border-primary/40'}`}>
                    {selectMode ? 'Done selecting' : 'Select pots'}
                  </button>
                  {selectMode && <>
                    <button onClick={() => setSelected(new Set(bedPots.map((s: any) => s.id)))} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/15 text-white/70 text-xs font-semibold">Select all</button>
                    <button onClick={() => { setRangeMode(m => !m); setRangeStart(null); }} className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${rangeMode ? 'bg-amber-500/20 border-amber-500/50 text-amber-200' : 'bg-white/5 border-white/15 text-white/70'}`}>{rangeMode ? (rangeStart === null ? 'Tap start pot…' : 'Tap end pot…') : 'Range'}</button>
                    <button onClick={() => { setSelected(new Set()); setRangeStart(null); }} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/15 text-white/70 text-xs font-semibold">Clear</button>
                    <span className="text-primary text-xs font-bold">{selected.size} selected</span>
                  </>}
                </div>
              )}
              {/* List / Grid toggle — grid = visual status map · list = easy range-select + re-strain */}
              <div className="flex items-center gap-1 mb-2">
                <button onClick={() => setPotView('grid')} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${potView === 'grid' ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/5 border-white/15 text-white/50'}`}>Grid</button>
                <button onClick={() => setPotView('list')} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${potView === 'list' ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/5 border-white/15 text-white/50'}`}>List</button>
              </div>
              {/* GRID — the row's 4-across bed: #1 bottom-left → top-right. Each pot tappable → modal. */}
              {potView === 'grid' && (
              <div className="grid gap-1 max-h-[64vh] overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(4, minmax(40px, 1fr))' }}>
                {bedPots.map((sp: any, i: number) => {
                  const light = statusLight(sp.status, sp.strain);
                  const isSel = selected.has(sp.id);
                  const issue = sp.status === 'FLAGGED' || sp.status === 'RESERVED' || sp.status === 'DESTROYED' || sp.status === 'DEAD' || sp.status === 'MAINTENANCE' || sp.status === 'HARVESTED';
                  const tint = issue ? light.dot : (sp.strain ? strainColor(sp.strain) : '#262626');
                  return (
                    <button key={sp.id} onClick={() => {
                      if (!selectMode) { setPot(sp); return; }
                      if (rangeMode) {
                        if (rangeStart === null) { setRangeStart(i); setSelected(prev => new Set(prev).add(sp.id)); }
                        else { const a = Math.min(rangeStart, i), b = Math.max(rangeStart, i); setSelected(prev => { const n = new Set(prev); for (let k = a; k <= b; k++) n.add(bedPots[k].id); return n; }); setRangeMode(false); setRangeStart(null); }
                      } else { setSelected(prev => { const n = new Set(prev); n.has(sp.id) ? n.delete(sp.id) : n.add(sp.id); return n; }); }
                    }} className="aspect-square rounded-md flex flex-col items-center justify-center gap-0.5 hover:ring-1 hover:ring-white/50 transition relative"
                      style={{ background: isSel ? '#3a3320' : `${tint}33`, border: isSel ? '2px solid #C9A84C' : `1px solid ${tint}` }}
                      title={`#${sp.seq} · L${sp.subrow} · ${sp.strain || 'empty'} · ${light.label}`}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: light.dot, boxShadow: `0 0 4px ${light.dot}` }} />
                      <span className="text-[8px] font-mono text-white/55">#{sp.seq}</span>
                    </button>
                  );
                })}
              </div>
              )}
              {/* LIST — same bed, top→bottom; easier for range-select + re-strain */}
              {potView === 'list' && (
              <div className="flex flex-col gap-1 max-h-[64vh] overflow-y-auto pr-1">
                {bedPots.map((sp: any, i: number) => {
                  const light = statusLight(sp.status, sp.strain);
                  const isSel = selected.has(sp.id);
                  return (
                    <button key={sp.id} onClick={() => {
                      if (!selectMode) { setPot(sp); return; }
                      if (rangeMode) {
                        if (rangeStart === null) { setRangeStart(i); setSelected(prev => new Set(prev).add(sp.id)); }
                        else { const a = Math.min(rangeStart, i), b = Math.max(rangeStart, i); setSelected(prev => { const n = new Set(prev); for (let k = a; k <= b; k++) n.add(bedPots[k].id); return n; }); setRangeMode(false); setRangeStart(null); }
                      } else { setSelected(prev => { const n = new Set(prev); n.has(sp.id) ? n.delete(sp.id) : n.add(sp.id); return n; }); }
                    }} className="flex items-center gap-2.5 rounded-md px-2.5 py-2 hover:ring-1 hover:ring-white/50 transition text-left min-h-[38px]"
                      style={{ background: isSel ? '#3a3320' : '#161616', border: isSel ? '2px solid #C9A84C' : `1px solid ${strainColor(sp.strain)}55` }} title={`#${sp.seq} · ${light.label}`}>
                      <span className="text-[11px] font-mono text-white/45 w-9 flex-shrink-0">#{sp.seq}</span>
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: light.dot }} />
                      <span className="text-[11px] text-white/55 truncate">L{sp.subrow} · {light.label}</span>
                      <span className="text-[10px] text-white/25 font-mono ml-auto truncate">{sp.spotId || ''}</span>
                    </button>
                  );
                })}
              </div>
              )}
              {selectMode && selected.size > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap bg-zinc-900/90 border border-white/10 rounded-xl p-2.5">
                  <span className="text-xs text-white/70 font-bold mr-1">{selected.size} pots →</span>
                  <button onClick={() => bulkMut.mutate({ action: 'harvest' })} disabled={bulkMut.isPending} className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">Harvested</button>
                  <button onClick={() => bulkMut.mutate({ action: 'flag' })} disabled={bulkMut.isPending} className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">Flag</button>
                  <button onClick={() => bulkMut.mutate({ action: 'restore' })} disabled={bulkMut.isPending} className="px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-xs font-semibold">Restore</button>
                  <button onClick={() => { confirmBulk === 'cull' ? bulkMut.mutate({ action: 'cull' }) : setConfirmBulk('cull'); }} disabled={bulkMut.isPending} className="px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">{confirmBulk === 'cull' ? '⚠ Tap again — cull' : 'Cull'}</button>
                  <button onClick={() => { confirmBulk === 'clear' ? bulkMut.mutate({ action: 'clear' }) : setConfirmBulk('clear'); }} disabled={bulkMut.isPending} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/15 text-white/60 text-xs font-semibold">{confirmBulk === 'clear' ? '⚠ Tap again — clear (empty pot)' : 'Clear'}</button>
                  {hasMinLevel(2) && (
                    <button onClick={() => setShowBulkStrain(true)} disabled={bulkMut.isPending} className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">Re-strain</button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* POT data modal */}
      <Modal open={!!pot} onClose={() => setPot(null)} title={pot ? `Pot · #${pot.seq ?? pot.position ?? ''}` : ''}>
        {pot && (() => { const light = statusLight(pot.status, pot.strain); return (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: light.dot, boxShadow: `0 0 6px ${light.dot}` }} /><span className="text-white font-semibold">{light.label}</span></div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 rounded-lg p-2"><div className="text-white/40">Pot QR</div><div className="text-white font-mono">{pot.spotId}</div></div>
              <div className="bg-white/5 rounded-lg p-2"><div className="text-white/40">Strain</div><div className="text-white">{pot.strain || '—'}</div></div>
              <div className="bg-white/5 rounded-lg p-2"><div className="text-white/40">Location</div><div className="text-white">{gh?.name} › {bay?.name} › R{row?.row} › Lane {sub?.subrow} › #{pot.seq ?? pot.position}</div></div>
              <div className="bg-white/5 rounded-lg p-2"><div className="text-white/40">Plant</div><div className="text-white font-mono">{pot.plantId || 'CFS baseline — slot'}</div></div>
            </div>
            <div className="text-[11px] text-white/30 pt-1">Permanent pot QR; content (plant) changes per cycle. {pot.allocatedAt ? `Allocated ${new Date(pot.allocatedAt).toLocaleDateString()}.` : ''}{pot.status === 'HARVESTED' && pot.harvestedAt ? ` Harvested ${new Date(pot.harvestedAt).toLocaleDateString()}.` : ''}</div>
            {!readOnly && hasMinLevel(1) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10 mt-2">
                <button onClick={() => potActionMut.mutate('harvest')} disabled={potActionMut.isPending} className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold hover:bg-blue-500/20">Harvested</button>
                <button onClick={() => potActionMut.mutate('cull')} disabled={potActionMut.isPending} className="px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/20">Cull (dead)</button>
                <button onClick={() => potActionMut.mutate('flag')} disabled={potActionMut.isPending} className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20">Flag (sick)</button>
                <button onClick={() => potActionMut.mutate('restore')} disabled={potActionMut.isPending} className="px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-xs font-semibold hover:bg-green-500/20">Restore</button>
                <button onClick={() => potActionMut.mutate('clear')} disabled={potActionMut.isPending} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/15 text-white/60 text-xs font-semibold hover:bg-white/10">Clear pot</button>
                {/* Re-strain this pot's subrow (strain is set per subrow) — level 2+ (incl. Cultivation Supervisor) */}
                {hasMinLevel(2) && (
                  <button onClick={() => { setSub({ subrow: pot.subrow, strain: pot.strain }); setEditStrain(pot.strain || ''); setConfirmRestrain(false); setPot(null); setShowEdit(true); }}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/20">Re-strain subrow</button>
                )}
              </div>
            )}
          </div>
        ); })()}
      </Modal>

      {/* Edit subrow strain (Cultivator+ ; strain-locked + audited) */}
      <Modal open={showEdit} onClose={() => { setShowEdit(false); setConfirmRestrain(false); }} title={sub ? `Strain · ${bay?.name} Row ${row?.row} Subrow ${sub?.subrow}` : ''}>
        <ModalSelect label="Strain" value={editStrain} onChange={e => setEditStrain((e.target as HTMLSelectElement).value)}>
          <option value="">— empty (clear) —</option>
          {(strainList || []).map((s: any) => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
        </ModalSelect>
        <div className="text-[11px] text-white/35 mb-2">One strain per subrow (130 plants). Locked once plants are placed — clear first to change. Audited.</div>
        <ModalButton loading={editMut.isPending} onClick={() => editMut.mutate()}>Save strain</ModalButton>
        {sub?.strain && editStrain && editStrain !== sub?.strain && (
          <button
            onClick={() => { if (confirmRestrain) { restrainMut.mutate(); setConfirmRestrain(false); } else { setConfirmRestrain(true); } }}
            disabled={restrainMut.isPending}
            className="w-full mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/20">
            {restrainMut.isPending ? 'Re-straining…'
              : confirmRestrain ? `⚠ Tap again to confirm — clears ALL ${sub?.strain} plants (recorded as mortality)`
              : `Re-strain subrow → ${editStrain} (clears existing plants)`}
          </button>
        )}
      </Modal>

      {/* Bulk re-strain selected pots */}
      <Modal open={showBulkStrain} onClose={() => setShowBulkStrain(false)} title={`Re-strain ${selected.size} selected pots`}>
        <ModalSelect label="New strain" value={bulkStrain} onChange={e => setBulkStrain((e.target as HTMLSelectElement).value)}>
          <option value="">— pick a strain —</option>
          {(strainList || []).map((s: any) => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
        </ModalSelect>
        <div className="text-[11px] text-white/35 mb-2">Clears the selected pots' plants (recorded as mortality) and sets the new strain. Raises a change-control deviation. Audited.</div>
        <ModalButton loading={bulkMut.isPending} disabled={!bulkStrain} onClick={() => bulkMut.mutate({ action: 'restrain', strain: bulkStrain })}>Re-strain {selected.size} pots → {bulkStrain || '…'}</ModalButton>
      </Modal>

      {/* Edit greenhouse — full CRUD (name / type / bays + delete) */}
      <Modal open={!!editGh} onClose={() => { setEditGh(null); setConfirmDelGh(false); }} title={editGh ? `Edit · ${editGh.name}` : ''}>
        <ModalInput label="Name" value={ghEditForm.name} onChange={e => setGhEditForm(f => ({ ...f, name: (e.target as HTMLInputElement).value }))} />
        <ModalSelect label="Type" value={ghEditForm.type} onChange={e => setGhEditForm(f => ({ ...f, type: (e.target as HTMLSelectElement).value }))}>
          <option value="VEG">Veg</option><option value="FLOWER">Flower</option><option value="MOTHER">Mother</option><option value="DRY">Dry</option><option value="PROCESS">Process</option>
        </ModalSelect>
        <ModalInput label="Bays" type="number" value={String(ghEditForm.totalBays)} onChange={e => setGhEditForm(f => ({ ...f, totalBays: parseInt((e.target as HTMLInputElement).value) || 1 }))} />
        <div className="text-[11px] text-white/35 mb-2">Increasing bays adds new bays (same row/subrow layout); reducing removes empty trailing bays. Audited.</div>
        <ModalButton loading={editGhMut.isPending} disabled={!ghEditForm.name} onClick={() => editGhMut.mutate()}>Save changes</ModalButton>
        <button
          onClick={() => { confirmDelGh ? delGhMut.mutate() : setConfirmDelGh(true); }}
          disabled={delGhMut.isPending}
          className="w-full mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/20">
          {delGhMut.isPending ? 'Deleting…' : confirmDelGh ? '⚠ Tap again to confirm — delete greenhouse (archives if it has plants)' : 'Delete greenhouse'}
        </button>
      </Modal>

      {/* Create greenhouse */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Greenhouse">
        <ModalInput label="Name" placeholder="e.g. GH3" value={ghForm.name} onChange={e => setGhForm(f => ({ ...f, name: (e.target as HTMLInputElement).value }))} />
        <ModalSelect label="Type" value={ghForm.type} onChange={e => setGhForm(f => ({ ...f, type: (e.target as HTMLSelectElement).value }))}>
          <option value="VEG">Veg</option><option value="FLOWER">Flower</option><option value="MOTHER">Mother</option><option value="DRY">Dry</option><option value="PROCESS">Process</option>
        </ModalSelect>
        <ModalInput label="Bays" type="number" value={String(ghForm.totalBays)} onChange={e => setGhForm(f => ({ ...f, totalBays: parseInt((e.target as HTMLInputElement).value) || 1 }))} />
        <ModalInput label="Rows / bay" type="number" value={String(ghForm.rows)} onChange={e => setGhForm(f => ({ ...f, rows: parseInt((e.target as HTMLInputElement).value) || 1 }))} />
        <ModalInput label="Subrows / row" type="number" value={String(ghForm.subrows)} onChange={e => setGhForm(f => ({ ...f, subrows: parseInt((e.target as HTMLInputElement).value) || 1 }))} />
        <ModalInput label="Plants / subrow" type="number" value={String(ghForm.spotsPerSubrow)} onChange={e => setGhForm(f => ({ ...f, spotsPerSubrow: parseInt((e.target as HTMLInputElement).value) || 1 }))} />
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!ghForm.name}>Create</ModalButton>
      </Modal>
    </div>
  );
}
