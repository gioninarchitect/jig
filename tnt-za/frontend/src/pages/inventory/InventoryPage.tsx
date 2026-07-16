import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { Package, Plus, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Pencil, FlaskConical, ChevronRight } from 'lucide-react';
import api from '../../services/api';

type Cat = 'CHEMICAL' | 'SUBSTRATE' | 'CONSUMABLE' | 'HYGIENE' | 'REGISTER' | 'ALERTS';
const TABS: { key: Cat; label: string }[] = [
  { key: 'CHEMICAL', label: 'Chemicals' },
  { key: 'SUBSTRATE', label: 'Substrate' },
  { key: 'CONSUMABLE', label: 'Consumables' },
  { key: 'HYGIENE', label: 'Hygiene' },
  { key: 'REGISTER', label: 'Chem. Register' },
  { key: 'ALERTS', label: 'Alerts' },
];
const fmt = (n: number) => (Number.isInteger(n) ? n : Number(n.toFixed(2))).toLocaleString();

export default function InventoryPage() {
  const { hasMinLevel } = useRBAC();
  const qc = useQueryClient();
  const addToast = useToastStore(s => s.addToast);
  const canEdit = hasMinLevel(1);
  const [tab, setTab] = useState<Cat>('CHEMICAL');

  const { data: items } = useQuery({ queryKey: ['inv-items'], queryFn: () => api.get('/inventory/items').then(r => r.data.items) });
  const { data: alerts } = useQuery({ queryKey: ['inv-alerts'], queryFn: () => api.get('/inventory/alerts').then(r => r.data.alerts) });
  const { data: register } = useQuery({ queryKey: ['inv-register'], queryFn: () => api.get('/inventory/register').then(r => r.data.register), enabled: tab === 'REGISTER' });

  const alertCount = (alerts?.lowStock?.length || 0) + (alerts?.expiring?.length || 0);
  const catItems = (items || []).filter((i: any) => i.category === tab);

  // ── movement modal (Stock In / Stock Out) ──
  const [mv, setMv] = useState<{ item: any; type: 'IN' | 'OUT' } | null>(null);
  const [mvForm, setMvForm] = useState<any>({});
  const mvMut = useMutation({
    mutationFn: () => api.post('/inventory/movements', { itemId: mv!.item.id, type: mv!.type, ...mvForm, date: mvForm.date || undefined }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['inv-items'] }); qc.invalidateQueries({ queryKey: ['inv-alerts'] });
      qc.invalidateQueries({ queryKey: ['inv-register'] }); qc.invalidateQueries({ queryKey: ['inv-moves'] });
      addToast('success', `${mv!.type === 'IN' ? 'Stock in' : 'Stock out'} · balance ${fmt(r.data.balance)} ${mv!.item.unit}`);
      setMv(null); setMvForm({});
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  const openMv = (item: any, type: 'IN' | 'OUT') => { setMv({ item, type }); setMvForm({ quantity: '' }); };

  // ── add item ──
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<any>({ category: 'CHEMICAL', unit: 'L' });
  const addMut = useMutation({
    mutationFn: () => api.post('/inventory/items', addForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inv-items'] }); setShowAdd(false); setAddForm({ category: 'CHEMICAL', unit: 'L' }); addToast('success', 'Item added'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  // ── movements drawer ──
  const [drawer, setDrawer] = useState<any>(null);
  const { data: moves } = useQuery({ queryKey: ['inv-moves', drawer?.id], queryFn: () => api.get(`/inventory/items/${drawer.id}/movements`).then(r => r.data.movements), enabled: !!drawer });

  const lowFor = (id: string) => alerts?.lowStock?.some((l: any) => l.id === id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5"><Package className="text-amber-400" size={26} /> Inventory / Stock</h1>
        {canEdit && tab !== 'REGISTER' && tab !== 'ALERTS' && (
          <button onClick={() => { setAddForm({ category: tab, unit: tab === 'SUBSTRATE' ? 'kg' : 'unit' }); setShowAdd(true); }}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-1.5"><Plus size={14} /> Add item</button>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${tab === t.key ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/5 border-white/10 text-white/55 hover:border-primary/40'}`}>
            {t.key === 'ALERTS' && <AlertTriangle size={13} />}{t.key === 'REGISTER' && <FlaskConical size={13} />}{t.label}
            {t.key === 'ALERTS' && alertCount > 0 && <span className="ml-0.5 px-1.5 rounded-full bg-red-500/25 text-red-200 text-[10px] font-bold">{alertCount}</span>}
          </button>
        ))}
      </div>

      {/* ── item categories ── */}
      {['CHEMICAL', 'SUBSTRATE', 'CONSUMABLE', 'HYGIENE'].includes(tab) && (
        !catItems.length ? <Empty text="No items yet" /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {catItems.map((i: any) => (
              <div key={i.id} className={`bg-white/5 border rounded-xl p-4 ${lowFor(i.id) ? 'border-red-500/40' : 'border-white/10'}`}>
                <div className="flex items-start justify-between">
                  <button onClick={() => setDrawer(i)} className="text-left">
                    <div className="font-bold text-white flex items-center gap-1.5">{i.name}<ChevronRight size={13} className="text-white/30" /></div>
                    <div className="text-[11px] text-white/40">{i.location || 'Cultivation'}</div>
                  </button>
                  {canEdit && <button onClick={() => setDrawer({ ...i, edit: true })} className="text-white/30 hover:text-primary"><Pencil size={13} /></button>}
                </div>
                <div className="mt-2 text-3xl font-bold text-white">{fmt(i.balance)} <span className="text-sm text-white/40 font-normal">{i.unit}</span></div>
                {lowFor(i.id) && <div className="text-[11px] text-red-300 mt-0.5 flex items-center gap-1"><AlertTriangle size={11} /> low — reorder ≤ {fmt(i.reorderLevel)}</div>}
                {canEdit && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => openMv(i, 'IN')} className="flex-1 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-300 text-xs font-semibold flex items-center justify-center gap-1"><ArrowDownCircle size={13} /> Stock in</button>
                    <button onClick={() => openMv(i, 'OUT')} className="flex-1 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1"><ArrowUpCircle size={13} /> Stock out</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── chemical register ── */}
      {tab === 'REGISTER' && (
        !register?.length ? <Empty text="No chemical batches received yet — record a chemical Stock in with a batch # and expiry." /> : (
          <Table head={['Date', 'Chemical', 'Batch #', 'Expiry', 'Qty', 'Checked by']}
            rows={register.map((r: any) => [new Date(r.date).toLocaleDateString(), r.chemical, r.batchNumber || '—',
              r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '—', `${fmt(r.quantity)} ${r.unit}`, r.checkedBy || '—'])} />
        )
      )}

      {/* ── alerts ── */}
      {tab === 'ALERTS' && (
        <div className="space-y-4">
          <Section title="Low stock" empty={!alerts?.lowStock?.length}>
            {alerts?.lowStock?.map((l: any) => (
              <Row key={l.id} left={<span className="text-white">{l.name}</span>} right={<span className="text-red-300 font-semibold">{fmt(l.balance)} {l.unit} <span className="text-white/40 font-normal">≤ reorder {fmt(l.reorderLevel)}</span></span>} />
            ))}
          </Section>
          <Section title="Expiring / expired chemical batches (still on hand)" empty={!alerts?.expiring?.length}>
            {alerts?.expiring?.map((e: any) => (
              <Row key={e.id} left={<span className="text-white">{e.name} <span className="text-white/40">· batch {e.batchNumber || '—'}</span></span>}
                right={<span className={`font-semibold ${e.daysLeft < 0 ? 'text-red-300' : 'text-amber-300'}`}>{e.expiryDate ? new Date(e.expiryDate).toLocaleDateString() : '—'} · {e.daysLeft < 0 ? `${-e.daysLeft}d expired` : `${e.daysLeft}d left`}</span>} />
            ))}
          </Section>
        </div>
      )}

      {/* movement modal */}
      <Modal open={!!mv} onClose={() => setMv(null)} title={mv ? `${mv.type === 'IN' ? 'Stock in' : 'Stock out'} · ${mv.item.name}` : ''}>
        {mv && (
          <div className="space-y-2">
            <ModalInput label={`Quantity (${mv.item.unit})`} type="number" step="any" value={mvForm.quantity ?? ''} onChange={e => setMvForm({ ...mvForm, quantity: (e.target as HTMLInputElement).value })} />
            <ModalInput label="Date" type="date" value={mvForm.date ?? ''} onChange={e => setMvForm({ ...mvForm, date: (e.target as HTMLInputElement).value })} />
            {mv.type === 'IN' && (
              <>
                <ModalInput label="Product in (supplier / PO — optional)" value={mvForm.productIn ?? ''} onChange={e => setMvForm({ ...mvForm, productIn: (e.target as HTMLInputElement).value })} />
                {mv.item.category === 'CHEMICAL' && <>
                  <ModalInput label="Batch # (optional)" value={mvForm.batchNumber ?? ''} onChange={e => setMvForm({ ...mvForm, batchNumber: (e.target as HTMLInputElement).value })} />
                  <ModalInput label="Expiry date (optional)" type="date" value={mvForm.expiryDate ?? ''} onChange={e => setMvForm({ ...mvForm, expiryDate: (e.target as HTMLInputElement).value })} />
                </>}
              </>
            )}
            <ModalInput label="Comment (optional)" value={mvForm.comment ?? ''} onChange={e => setMvForm({ ...mvForm, comment: (e.target as HTMLInputElement).value })} />
            <ModalButton loading={mvMut.isPending} disabled={!(parseFloat(mvForm.quantity) > 0)} onClick={() => mvMut.mutate()}>{mv.type === 'IN' ? 'Add to stock' : 'Take from stock'}</ModalButton>
          </div>
        )}
      </Modal>

      {/* add item */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add inventory item">
        <ModalInput label="Name" value={addForm.name ?? ''} onChange={e => setAddForm({ ...addForm, name: (e.target as HTMLInputElement).value })} />
        <ModalSelect label="Category" value={addForm.category} onChange={e => setAddForm({ ...addForm, category: (e.target as HTMLSelectElement).value })}>
          {['CHEMICAL', 'SUBSTRATE', 'CONSUMABLE', 'HYGIENE'].map(c => <option key={c} value={c}>{c[0] + c.slice(1).toLowerCase()}</option>)}
        </ModalSelect>
        <div className="grid grid-cols-2 gap-2">
          <ModalInput label="Unit" placeholder="L · kg · unit" value={addForm.unit ?? ''} onChange={e => setAddForm({ ...addForm, unit: (e.target as HTMLInputElement).value })} />
          <ModalInput label="Reorder level (optional)" type="number" step="any" value={addForm.reorderLevel ?? ''} onChange={e => setAddForm({ ...addForm, reorderLevel: (e.target as HTMLInputElement).value })} />
        </div>
        <ModalButton loading={addMut.isPending} disabled={!addForm.name?.trim()} onClick={() => addMut.mutate()}>Add item</ModalButton>
      </Modal>

      {/* movements + edit drawer */}
      <ItemDrawer drawer={drawer} moves={moves} onClose={() => setDrawer(null)} canEdit={canEdit} />
    </div>
  );
}

function ItemDrawer({ drawer, moves, onClose, canEdit }: any) {
  const qc = useQueryClient();
  const addToast = useToastStore(s => s.addToast);
  const [reorder, setReorder] = useState(''); const [reason, setReason] = useState('');
  const editMut = useMutation({
    mutationFn: () => api.patch(`/inventory/items/${drawer.id}`, { reorderLevel: reorder === '' ? null : reorder, changeReason: reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inv-items'] }); qc.invalidateQueries({ queryKey: ['inv-alerts'] }); addToast('success', 'Saved'); onClose(); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  if (!drawer) return null;
  return (
    <Modal open={!!drawer} onClose={onClose} title={`${drawer.name} · ${fmt(drawer.balance)} ${drawer.unit}`}>
      {drawer.edit && canEdit ? (
        <div className="space-y-2">
          <ModalInput label={`Reorder level (${drawer.unit}) — blank to clear`} type="number" step="any" defaultValue={drawer.reorderLevel ?? ''} onChange={e => setReorder((e.target as HTMLInputElement).value)} />
          <ModalInput label="Reason for change (required)" value={reason} onChange={e => setReason((e.target as HTMLInputElement).value)} />
          <ModalButton loading={editMut.isPending} disabled={!reason.trim()} onClick={() => editMut.mutate()}>Save changes</ModalButton>
        </div>
      ) : (
        !moves?.length ? <p className="text-white/40 text-sm text-center py-6">No movements yet.</p> : (
          <div className="max-h-[60vh] overflow-y-auto -mx-1">
            {moves.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between px-2 py-2 border-b border-white/5 text-sm">
                <div>
                  <span className={`font-mono text-xs font-bold ${m.type === 'IN' ? 'text-green-300' : 'text-amber-300'}`}>{m.type === 'IN' ? '+' : '−'}{fmt(m.quantity)}</span>
                  <span className="text-white/40 text-xs ml-2">{new Date(m.date).toLocaleDateString()}</span>
                  {m.batchNumber && <span className="text-white/40 text-xs ml-2">batch {m.batchNumber}</span>}
                  {m.source === 'CHEMICAL_APPLICATION' && <span className="ml-2 text-[10px] px-1.5 rounded bg-purple-500/20 text-purple-200">applied</span>}
                  {m.comment && <div className="text-white/40 text-[11px]">{m.comment}</div>}
                </div>
                <span className="text-white/70 font-mono text-xs">= {fmt(m.balanceAfter)}</span>
              </div>
            ))}
          </div>
        )
      )}
    </Modal>
  );
}

const Empty = ({ text }: { text: string }) => <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center text-white/40">{text}</div>;
const Section = ({ title, empty, children }: any) => (
  <div>
    <h2 className="text-xs uppercase tracking-wide text-amber-400/80 font-semibold mb-2">{title}</h2>
    {empty ? <div className="text-white/30 text-sm">Nothing flagged.</div> : <div className="rounded-xl border border-white/10 bg-zinc-950/60 divide-y divide-white/5">{children}</div>}
  </div>
);
const Row = ({ left, right }: any) => <div className="flex items-center justify-between px-3 py-2.5 text-sm">{left}{right}</div>;
const Table = ({ head, rows }: { head: string[]; rows: any[][] }) => (
  <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/60">
    <table className="w-full text-sm">
      <thead><tr className="text-left text-[10px] uppercase tracking-[0.15em] text-amber-400/80 border-b border-white/10">{head.map(h => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-white/5 hover:bg-white/5">{r.map((c, j) => <td key={j} className="px-3 py-2 text-white/80">{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);
