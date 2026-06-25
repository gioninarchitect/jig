import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { Bird, Plus, Pencil, Thermometer, Skull, Truck, Scale, Egg, Home, Check, Camera, X, Package } from 'lucide-react';
import api from '../../services/api';

// ── Bilingual chicken-farm ops (Loraine): EN / AF toggle ──────────────
type Lang = 'en' | 'af';
const T: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Chicken Farm', coops: 'Coops', mortality: 'Mortality', temp: 'Temperature', catch: 'Catch', abattoir: 'Abattoir', intake: 'Chick Intake',
    totalBirds: 'Total birds', coopsCount: 'Coops', mortToday: 'Mortality today', mortTotal: 'Total mortality',
    birds: 'birds', today: 'today', total: 'total', edit: 'Edit', add: 'Add', record: 'Record', save: 'Save', saveChanges: 'Save changes',
    signoff: 'Sign off', signed: 'Signed', signedBy: 'Signed by', coop: 'Coop', date: 'Date', deaths: 'Deaths', tempC: 'Temperature °C',
    notes: 'Notes', cratesLoaded: 'Crates loaded', perCrate: 'Chickens per crate', totalChickens: 'Total chickens', cratesOnScale: 'Crates on scale',
    weightKg: 'Total weight (kg)', count: 'Count', reasonLabel: 'Reason for change (required)', noRecords: 'No records yet',
    editFlock: 'Edit flock count', flockCount: 'Birds placed in coop', recorded: 'Recorded', saved: 'Saved', newRecord: 'New record', optional: 'optional',
    placed: 'Placed', left: 'left', died: 'died',
    crates: 'Crates', loadCrate: 'Load crate', photo: 'Crate photo', takePhoto: 'Take / choose photo', chickenCount: 'Chicken count',
    verify: 'Verify', flag: 'Flag', pending: 'Pending', verified: 'Verified', flagged: 'Flagged', noCrates: 'No crates loaded yet', staffSaid: 'Staff submitted',
  },
  af: {
    title: 'Hoenderplaas', coops: 'Hokke', mortality: 'Mortaliteit', temp: 'Temperatuur', catch: 'Vang', abattoir: 'Slagpale', intake: 'Nuwe Kuikens',
    totalBirds: 'Totale voëls', coopsCount: 'Hokke', mortToday: 'Mortaliteit vandag', mortTotal: 'Totale mortaliteit',
    birds: 'voëls', today: 'vandag', total: 'totaal', edit: 'Wysig', add: 'Voeg by', record: 'Teken aan', save: 'Stoor', saveChanges: 'Stoor veranderinge',
    signoff: 'Teken af', signed: 'Geteken', signedBy: 'Geteken deur', coop: 'Hok', date: 'Datum', deaths: 'Vrekke', tempC: 'Temperatuur °C',
    notes: 'Notas', cratesLoaded: 'Kratte gelaai', perCrate: 'Hoenders per krat', totalChickens: 'Totale hoenders', cratesOnScale: 'Kratte op skaal',
    weightKg: 'Totale gewig (kg)', count: 'Aantal', reasonLabel: 'Rede vir verandering (verplig)', noRecords: 'Geen rekords nog nie',
    editFlock: 'Wysig trop telling', flockCount: 'Kuikens in hok geplaas', recorded: 'Aangeteken', saved: 'Gestoor', newRecord: 'Nuwe rekord', optional: 'opsioneel',
    placed: 'Geplaas', left: 'oor', died: 'dood',
    crates: 'Kratte', loadCrate: 'Laai krat', photo: 'Krat foto', takePhoto: 'Neem / kies foto', chickenCount: 'Hoender telling',
    verify: 'Keur goed', flag: 'Vlag', pending: 'Hangende', verified: 'Gekeur', flagged: 'Gevlag', noCrates: 'Geen kratte gelaai nie', staffSaid: 'Personeel het ingedien',
  },
};

type Kind = 'mortality' | 'temp' | 'catch' | 'abattoir' | 'intake';
type Field = { k: string; type: 'coop' | 'num' | 'txt'; lbl?: string; req?: boolean; step?: string; opt?: boolean };
const FIELDS: Record<Kind, Field[]> = {
  mortality: [{ k: 'coopName', type: 'coop', lbl: 'coop', req: true }, { k: 'count', type: 'num', lbl: 'deaths', req: true }, { k: 'notes', type: 'txt', lbl: 'notes' }],
  temp: [{ k: 'coopName', type: 'coop', lbl: 'coop', req: true }, { k: 'tempC', type: 'num', lbl: 'tempC', req: true, step: '0.1' }],
  catch: [{ k: 'coopName', type: 'coop', lbl: 'coop', opt: true }, { k: 'cratesLoaded', type: 'num', lbl: 'cratesLoaded', req: true }, { k: 'perCrate', type: 'num', lbl: 'perCrate', req: true }, { k: 'notes', type: 'txt', lbl: 'notes' }],
  abattoir: [{ k: 'cratesOnScale', type: 'num', lbl: 'cratesOnScale', req: true }, { k: 'perCrate', type: 'num', lbl: 'perCrate', req: true }, { k: 'totalWeightKg', type: 'num', lbl: 'weightKg', req: true, step: '0.1' }, { k: 'notes', type: 'txt', lbl: 'notes' }],
  intake: [{ k: 'coopName', type: 'coop', lbl: 'coop', opt: true }, { k: 'count', type: 'num', lbl: 'count', req: true }, { k: 'notes', type: 'txt', lbl: 'notes' }],
};
const TAB_ICON: Record<string, any> = { coops: Home, mortality: Skull, temp: Thermometer, catch: Truck, abattoir: Scale, intake: Egg, crates: Package };

export default function ChickensPage() {
  const { hasMinLevel } = useRBAC();
  const qc = useQueryClient();
  const addToast = useToastStore(s => s.addToast);
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('chickenLang') as Lang) || 'af');
  const tr = T[lang];
  const setLanguage = (l: Lang) => { setLang(l); localStorage.setItem('chickenLang', l); };
  const [tab, setTab] = useState<'coops' | 'crates' | Kind>('coops');
  const canRecord = hasMinLevel(1);
  const canVerify = hasMinLevel(3);

  const { data: summary } = useQuery({ queryKey: ['chicken-summary'], queryFn: () => api.get('/chickens/summary').then(r => r.data.summary) });
  const { data: coops } = useQuery({ queryKey: ['chicken-coops'], queryFn: () => api.get('/chickens/coops').then(r => r.data.coops) });

  // Coop count edit (reason + audit)
  const [editCoop, setEditCoop] = useState<any>(null);
  const [coopVal, setCoopVal] = useState(''); const [coopReason, setCoopReason] = useState('');
  const coopMut = useMutation({
    mutationFn: () => api.patch(`/chickens/coops/${editCoop.id}`, { flockCount: parseInt(coopVal), changeReason: coopReason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chicken-coops'] }); qc.invalidateQueries({ queryKey: ['chicken-summary'] }); setEditCoop(null); setCoopReason(''); addToast('success', tr.saved); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  const openEditCoop = (c: any) => { setEditCoop(c); setCoopVal(String(c.placed ?? c.flockCount ?? c.flock)); setCoopReason(''); };

  const TABS: ('coops' | 'crates' | Kind)[] = ['coops', 'mortality', 'temp', 'catch', 'abattoir', 'intake', 'crates'];

  return (
    <div className="space-y-5">
      {/* header + language toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5"><Bird className="text-amber-400" size={26} /> {tr.title}</h1>
        <div className="flex rounded-lg overflow-hidden border border-white/15">
          {(['af', 'en'] as Lang[]).map(l => (
            <button key={l} onClick={() => setLanguage(l)}
              className={`px-3 py-1.5 text-xs font-bold ${lang === l ? 'bg-primary text-white' : 'bg-white/5 text-white/50 hover:text-white'}`}>
              {l === 'af' ? 'AFR' : 'ENG'}
            </button>
          ))}
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(k => { const Icon = TAB_ICON[k]; return (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${tab === k ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/5 border-white/10 text-white/55 hover:border-primary/40'}`}>
            <Icon size={14} /> {tr[k]}
          </button>
        ); })}
      </div>

      {/* ── COOPS ── */}
      {tab === 'coops' && (
        <>
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[[tr.totalBirds, summary.totals.flock, 'text-white'], [tr.coopsCount, summary.totals.coops, 'text-white'], [tr.mortToday, summary.totals.mortalityToday, 'text-amber-300'], [tr.mortTotal, summary.totals.mortalityTotal, 'text-red-300']].map(([k, v, c]: any) => (
                <div key={k} className="bg-white/5 border border-white/10 rounded-xl p-3"><div className={`text-2xl font-bold ${c}`}>{Number(v).toLocaleString()}</div><div className="text-xs text-white/40">{k}</div></div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(summary?.houses || []).map((h: any) => (
              <div key={h.name} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><Bird size={18} className="text-primary" /><span className="font-bold text-white">{h.name}</span></div>
                  {canRecord && <button onClick={() => openEditCoop(h)} className="text-primary hover:text-primary-light text-xs font-semibold flex items-center gap-1"><Pencil size={12} /> {tr.edit}</button>}
                </div>
                <div className="text-3xl font-bold text-white">{h.flock.toLocaleString()} <span className="text-sm text-white/40 font-normal">{tr.birds} {tr.left}</span></div>
                <div className="text-[11px] text-white/35 mt-0.5">{tr.placed} {h.placed.toLocaleString()}</div>
                <div className="flex gap-3 text-xs mt-2 text-white/50">
                  <span className="text-amber-300">↓ {h.mortalityToday} {tr.today}</span>
                  <span className="text-red-300">Σ {h.mortalityTotal} {tr.died}</span>
                  {h.tempC != null && <span className="text-sky-300 flex items-center gap-0.5"><Thermometer size={11} /> {h.tempC}°C</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── record tabs ── */}
      {tab !== 'coops' && tab !== 'crates' && <RecordTab kind={tab} coops={coops || []} tr={tr} canRecord={canRecord} />}
      {tab === 'crates' && <CratesTab coops={coops || []} tr={tr} canRecord={canRecord} canVerify={canVerify} />}

      {/* edit coop count modal */}
      <Modal open={!!editCoop} onClose={() => setEditCoop(null)} title={editCoop ? `${tr.editFlock} · ${editCoop.name}` : ''}>
        <ModalInput label={tr.flockCount} type="number" value={coopVal} onChange={e => setCoopVal((e.target as HTMLInputElement).value)} />
        <ModalInput label={tr.reasonLabel} value={coopReason} onChange={e => setCoopReason((e.target as HTMLInputElement).value)} />
        <ModalButton loading={coopMut.isPending} disabled={!coopVal || !coopReason.trim()} onClick={() => coopMut.mutate()}>{tr.saveChanges}</ModalButton>
      </Modal>
    </div>
  );
}

// ── Generic daily-record tab (mortality / temp / catch / abattoir / intake) ──
function RecordTab({ kind, coops, tr, canRecord }: { kind: Kind; coops: any[]; tr: any; canRecord: boolean }) {
  const qc = useQueryClient();
  const addToast = useToastStore(s => s.addToast);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [reason, setReason] = useState('');

  const { data: records } = useQuery({ queryKey: ['chicken', kind], queryFn: () => api.get(`/chickens/${kind}`).then(r => r.data.records) });
  const fields = FIELDS[kind];

  const reset = () => { setOpen(false); setEditId(null); setForm({}); setReason(''); };
  const saveMut = useMutation({
    mutationFn: () => {
      const body: any = { ...form };
      if (editId) return api.patch(`/chickens/${kind}/${editId}`, { ...body, changeReason: reason });
      return api.post(`/chickens/${kind}`, body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chicken', kind] }); qc.invalidateQueries({ queryKey: ['chicken-summary'] }); addToast('success', editId ? tr.saved : tr.recorded); reset(); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  const signMut = useMutation({
    mutationFn: (id: string) => api.post(`/chickens/abattoir/${id}/sign`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chicken', 'abattoir'] }); addToast('success', tr.signed); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const openAdd = () => { setEditId(null); setForm({ coopName: coops[0]?.name, date: new Date().toISOString().slice(0, 10) }); setReason(''); setOpen(true); };
  const openEdit = (r: any) => { setEditId(r.id); setForm({ ...r, date: r.date ? r.date.slice(0, 10) : '' }); setReason(''); setOpen(true); };

  const valid = fields.every(f => !f.req || (form[f.k] !== undefined && String(form[f.k]).trim() !== '')) && (!editId || reason.trim());
  const computed = kind === 'catch' ? (Number(form.cratesLoaded) || 0) * (Number(form.perCrate) || 0)
    : kind === 'abattoir' ? (Number(form.cratesOnScale) || 0) * (Number(form.perCrate) || 0) : null;

  return (
    <div className="space-y-3">
      {canRecord && (
        <button onClick={openAdd} className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-1.5"><Plus size={14} /> {tr.add}</button>
      )}
      {!records?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center text-white/40">{tr.noRecords}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/60">
          <table className="w-full text-sm">
            <tbody>
              {records.map((r: any) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-3 py-2.5 font-mono text-xs text-white/60 whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5 text-white">{renderRow(kind, r, tr)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {kind === 'abattoir' && (r.signedByName
                      ? <span className="text-green-300 text-[11px] font-semibold inline-flex items-center gap-1"><Check size={12} /> {tr.signed} · {r.signedByName}</span>
                      : canRecord && <button onClick={() => signMut.mutate(r.id)} className="text-green-300 hover:text-green-200 text-[11px] font-semibold mr-3">{tr.signoff}</button>)}
                    {canRecord && <button onClick={() => openEdit(r)} className="text-primary hover:text-primary-light text-[11px] font-semibold">{tr.edit}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={reset} title={editId ? `${tr.edit} · ${tr[kind]}` : `${tr[kind]} · ${tr.newRecord}`}>
        <ModalInput label={tr.date} type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: (e.target as HTMLInputElement).value })} />
        {fields.map(f => {
          const label = tr[f.lbl || f.k] + (f.opt ? ` (${tr.optional})` : '');
          if (f.type === 'coop') return (
            <ModalSelect key={f.k} label={label} value={form[f.k] || ''} onChange={e => setForm({ ...form, [f.k]: (e.target as HTMLSelectElement).value })}>
              {f.opt && <option value="">—</option>}
              {coops.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </ModalSelect>
          );
          return <ModalInput key={f.k} label={label} type={f.type === 'num' ? 'number' : 'text'} step={f.step} value={form[f.k] ?? ''} onChange={e => setForm({ ...form, [f.k]: (e.target as HTMLInputElement).value })} />;
        })}
        {computed !== null && <div className="mb-3 text-sm text-amber-300 font-semibold">{tr.totalChickens}: {computed.toLocaleString()}</div>}
        {editId && <ModalInput label={tr.reasonLabel} value={reason} onChange={e => setReason((e.target as HTMLInputElement).value)} />}
        <ModalButton loading={saveMut.isPending} disabled={!valid} onClick={() => saveMut.mutate()}>{editId ? tr.saveChanges : tr.record}</ModalButton>
      </Modal>
    </div>
  );
}

// ── Crates: per-crate count + photo evidence + admin verify (kept from v1) ──
function CratesTab({ coops, tr, canRecord, canVerify }: { coops: any[]; tr: any; canRecord: boolean; canVerify: boolean }) {
  const qc = useQueryClient();
  const addToast = useToastStore(s => s.addToast);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<{ house: string; chickenCount: string }>({ house: '', chickenCount: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: crates } = useQuery({ queryKey: ['chicken-crates'], queryFn: () => api.get('/chickens/crates').then(r => r.data.crates) });

  const loadMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('house', form.house || coops[0]?.name || 'Coop 1'); fd.append('chickenCount', form.chickenCount);
      if (photo) fd.append('photo', photo);
      return api.post('/chickens/crates', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chicken-crates'] }); setShow(false); setPhoto(null); setForm(f => ({ ...f, chickenCount: '' })); addToast('success', tr.recorded); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  const verifyMut = useMutation({
    mutationFn: (p: { id: string; action: 'verify' | 'flag' }) => api.patch(`/chickens/crates/${p.id}/verify`, { action: p.action, flagReason: p.action === 'flag' ? 'count mismatch' : undefined }),
    onSuccess: (_r, p) => { qc.invalidateQueries({ queryKey: ['chicken-crates'] }); addToast('success', p.action === 'flag' ? tr.flagged : tr.verified); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const STAT: Record<string, { dot: string; label: string }> = { VERIFIED: { dot: '#22C55E', label: tr.verified }, PENDING: { dot: '#F8C242', label: tr.pending }, FLAGGED: { dot: '#DC2626', label: tr.flagged } };

  return (
    <div className="space-y-3">
      {canRecord && (
        <button onClick={() => { setForm({ house: coops[0]?.name || '', chickenCount: '' }); setShow(true); }} className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-1.5"><Plus size={14} /> {tr.loadCrate}</button>
      )}
      {!crates?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center text-white/40">{tr.noCrates}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {crates.map((c: any) => { const s = STAT[c.status] || STAT.PENDING; return (
            <div key={c.id} className="bg-white/5 rounded-xl overflow-hidden border-2" style={{ borderColor: s.dot + '66' }}>
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
                <div className="text-[10px] text-white/40">{c.house}</div>
                {canVerify && c.status === 'PENDING' && (
                  <div className="flex gap-1 mt-1.5">
                    <button onClick={() => verifyMut.mutate({ id: c.id, action: 'verify' })} className="flex-1 py-1 rounded bg-green-500/15 border border-green-500/30 text-green-300 text-[11px] font-semibold flex items-center justify-center gap-1"><Check size={11} /> {tr.verify}</button>
                    <button onClick={() => verifyMut.mutate({ id: c.id, action: 'flag' })} className="flex-1 py-1 rounded bg-red-500/10 border border-red-500/25 text-red-300 text-[11px] font-semibold flex items-center justify-center gap-1"><X size={11} /> {tr.flag}</button>
                  </div>
                )}
              </div>
            </div>
          ); })}
        </div>
      )}

      <Modal open={show} onClose={() => setShow(false)} title={tr.loadCrate}>
        <ModalSelect label={tr.coop} value={form.house} onChange={e => setForm(f => ({ ...f, house: (e.target as HTMLSelectElement).value }))}>
          {coops.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </ModalSelect>
        <ModalInput label={tr.chickenCount} type="number" placeholder="e.g. 12" value={form.chickenCount} onChange={e => setForm(f => ({ ...f, chickenCount: (e.target as HTMLInputElement).value }))} />
        <div className="mb-3">
          <label className="block text-xs text-white/50 mb-1.5">{tr.photo}</label>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setPhoto((e.target as HTMLInputElement).files?.[0] || null)} />
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full py-3 rounded-xl bg-white/5 border border-dashed border-white/20 text-white/60 text-sm flex items-center justify-center gap-2">
            <Camera size={16} /> {photo ? photo.name.slice(0, 28) : tr.takePhoto}
          </button>
        </div>
        <ModalButton loading={loadMut.isPending} onClick={() => loadMut.mutate()} disabled={!form.chickenCount}>{tr.loadCrate}</ModalButton>
      </Modal>
    </div>
  );
}

function renderRow(kind: Kind, r: any, tr: any) {
  switch (kind) {
    case 'mortality': return <span><b>{r.coopName}</b> · {r.count} {tr.deaths.toLowerCase()}{r.notes ? ` · ${r.notes}` : ''}</span>;
    case 'temp': return <span><b>{r.coopName}</b> · {r.tempC}°C</span>;
    case 'catch': return <span>{r.coopName ? <b>{r.coopName} · </b> : ''}{r.cratesLoaded} × {r.perCrate} = <b className="text-amber-300">{r.totalChickens.toLocaleString()}</b> {tr.totalChickens.toLowerCase()}</span>;
    case 'abattoir': return <span>{r.cratesOnScale} × {r.perCrate} = <b>{r.totalChickens.toLocaleString()}</b> · <b className="text-amber-300">{r.totalWeightKg} kg</b></span>;
    case 'intake': return <span>{r.coopName ? <b>{r.coopName} · </b> : ''}{r.count.toLocaleString()} {tr.birds}</span>;
  }
}
