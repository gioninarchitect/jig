import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { Bird, Plus, Pencil, Thermometer, Skull, Truck, Scale, Egg, Home, Check } from 'lucide-react';
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
    editFlock: 'Edit flock count', flockCount: 'Flock count', recorded: 'Recorded', saved: 'Saved', newRecord: 'New record', optional: 'optional',
  },
  af: {
    title: 'Hoenderplaas', coops: 'Hokke', mortality: 'Mortaliteit', temp: 'Temperatuur', catch: 'Vang', abattoir: 'Slagpale', intake: 'Nuwe Kuikens',
    totalBirds: 'Totale voëls', coopsCount: 'Hokke', mortToday: 'Mortaliteit vandag', mortTotal: 'Totale mortaliteit',
    birds: 'voëls', today: 'vandag', total: 'totaal', edit: 'Wysig', add: 'Voeg by', record: 'Teken aan', save: 'Stoor', saveChanges: 'Stoor veranderinge',
    signoff: 'Teken af', signed: 'Geteken', signedBy: 'Geteken deur', coop: 'Hok', date: 'Datum', deaths: 'Vrekke', tempC: 'Temperatuur °C',
    notes: 'Notas', cratesLoaded: 'Kratte gelaai', perCrate: 'Hoenders per krat', totalChickens: 'Totale hoenders', cratesOnScale: 'Kratte op skaal',
    weightKg: 'Totale gewig (kg)', count: 'Aantal', reasonLabel: 'Rede vir verandering (verplig)', noRecords: 'Geen rekords nog nie',
    editFlock: 'Wysig trop telling', flockCount: 'Trop telling', recorded: 'Aangeteken', saved: 'Gestoor', newRecord: 'Nuwe rekord', optional: 'opsioneel',
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
const TAB_ICON: Record<string, any> = { coops: Home, mortality: Skull, temp: Thermometer, catch: Truck, abattoir: Scale, intake: Egg };

export default function ChickensPage() {
  const { hasMinLevel } = useRBAC();
  const qc = useQueryClient();
  const addToast = useToastStore(s => s.addToast);
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('chickenLang') as Lang) || 'af');
  const tr = T[lang];
  const setLanguage = (l: Lang) => { setLang(l); localStorage.setItem('chickenLang', l); };
  const [tab, setTab] = useState<'coops' | Kind>('coops');
  const canRecord = hasMinLevel(1);

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
  const openEditCoop = (c: any) => { setEditCoop(c); setCoopVal(String(c.flock ?? c.flockCount)); setCoopReason(''); };

  const TABS: ('coops' | Kind)[] = ['coops', 'mortality', 'temp', 'catch', 'abattoir', 'intake'];

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
                <div className="text-3xl font-bold text-white">{h.flock.toLocaleString()} <span className="text-sm text-white/40 font-normal">{tr.birds}</span></div>
                <div className="flex gap-3 text-xs mt-2 text-white/50">
                  <span className="text-amber-300">↓ {h.mortalityToday} {tr.today}</span>
                  <span className="text-red-300">Σ {h.mortalityTotal} {tr.total}</span>
                  {h.tempC != null && <span className="text-sky-300 flex items-center gap-0.5"><Thermometer size={11} /> {h.tempC}°C</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── record tabs ── */}
      {tab !== 'coops' && <RecordTab kind={tab} coops={coops || []} tr={tr} canRecord={canRecord} />}

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

function renderRow(kind: Kind, r: any, tr: any) {
  switch (kind) {
    case 'mortality': return <span><b>{r.coopName}</b> · {r.count} {tr.deaths.toLowerCase()}{r.notes ? ` · ${r.notes}` : ''}</span>;
    case 'temp': return <span><b>{r.coopName}</b> · {r.tempC}°C</span>;
    case 'catch': return <span>{r.coopName ? <b>{r.coopName} · </b> : ''}{r.cratesLoaded} × {r.perCrate} = <b className="text-amber-300">{r.totalChickens.toLocaleString()}</b> {tr.totalChickens.toLowerCase()}</span>;
    case 'abattoir': return <span>{r.cratesOnScale} × {r.perCrate} = <b>{r.totalChickens.toLocaleString()}</b> · <b className="text-amber-300">{r.totalWeightKg} kg</b></span>;
    case 'intake': return <span>{r.coopName ? <b>{r.coopName} · </b> : ''}{r.count.toLocaleString()} {tr.birds}</span>;
  }
}
