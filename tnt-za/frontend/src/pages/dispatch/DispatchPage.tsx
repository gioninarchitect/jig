import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useReadOnly } from '../../hooks/useReadOnly';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import { Truck, Plus, Package, CheckCircle, Clock, MapPin, ShieldCheck, Upload, Eye, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

export default function DispatchPage() {
  const { hasMinLevel } = useRBAC();
  const readOnly = useReadOnly();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    batchIds: '', destinationFacilityId: '', transporter: '', vehicleReg: '',
    driverName: '', driverIdNumber: '', driverPhone: '', driverLicenseExpiry: '',
    expectedDuration: '', deliveryType: 'SELF_DELIVER', waybillNumber: '', clientName: '', clientContact: '',
  });
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [showInspect, setShowInspect] = useState<any>(null);
  const INSPECTION_ITEMS = [
    { key: 'sealsIntact', label: 'Tamper seals intact' },
    { key: 'cargoSecured', label: 'Cargo secured & labelled' },
    { key: 'tempLogger', label: 'Temperature logger active' },
    { key: 'gpsTracker', label: 'GPS tracker operational' },
    { key: 'driverBriefed', label: 'Driver briefed on route + SOP' },
    { key: 'manifestSigned', label: 'Manifest signed by driver' },
    { key: 'licenseVerified', label: 'Driver licence + ID verified' },
  ];
  const [inspectForm, setInspectForm] = useState<{ passed: boolean; notes: string; photo: File | null; checks: Record<string, boolean> }>({
    passed: true, notes: '', photo: null,
    checks: Object.fromEntries(INSPECTION_ITEMS.map(i => [i.key, false])) as Record<string, boolean>,
  });

  const { data: manifests, isLoading } = useQuery({
    queryKey: ['manifests'],
    queryFn: () => api.get('/transport/manifests').then(r => r.data.manifests),
  });

  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/batches').then(r => r.data.batches),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/transport/manifests', {
        ...form,
        batchIds: form.batchIds.split(',').map(s => s.trim()).filter(Boolean),
        expectedDuration: form.expectedDuration ? parseInt(form.expectedDuration) : undefined,
      });
      if (licensePhoto && data.manifest?.id) {
        const fd = new FormData();
        fd.append('photo', licensePhoto);
        await api.post(`/transport/manifests/${data.manifest.id}/driver-license`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manifests'] });
      setShowCreate(false);
      setLicensePhoto(null);
      setForm(f => ({ ...f, driverName: '', driverIdNumber: '', driverPhone: '', driverLicenseExpiry: '' }));
      addToast('success', 'Manifest created');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const inspectMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('passed', String(inspectForm.passed));
      fd.append('notes', inspectForm.notes);
      fd.append('checks', JSON.stringify(inspectForm.checks));
      if (inspectForm.photo) fd.append('photo', inspectForm.photo);
      return api.post(`/transport/manifests/${showInspect.id}/vehicle-inspection`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manifests'] });
      setShowInspect(null);
      setInspectForm({ passed: true, notes: '', photo: null, checks: Object.fromEntries(INSPECTION_ITEMS.map(i => [i.key, false])) as Record<string, boolean> });
      addToast('success', 'Vehicle inspection recorded');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const departMut = useMutation({
    mutationFn: (id: string) => api.patch(`/transport/manifests/${id}/depart`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['manifests'] }); addToast('success', 'Marked as departed'); },
  });

  const arriveMut = useMutation({
    mutationFn: (id: string) => api.patch(`/transport/manifests/${id}/arrive`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['manifests'] }); addToast('success', 'Marked as arrived'); },
  });

  const releasedBatches = batches?.filter((b: any) => b.status === 'RELEASED') || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Dispatch & Transport</h1>
          <p className="text-sm text-white/40">Transport manifests — Steps 15-17</p>
        </div>
        {!readOnly && hasMinLevel(3) && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <Plus size={16} /> New Manifest
          </button>
        )}
      </div>

      {isLoading ? <SkeletonTable rows={4} /> : !manifests?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center text-white/40">No transport manifests</div>
      ) : (
        <div className="space-y-2">
          {manifests.map((m: any) => {
            const isPending = !m.departedAt;
            const isInTransit = m.departedAt && !m.arrivedAt;
            const isComplete = !!m.arrivedAt;
            return (
              <div key={m.id} className={`bg-white/5 border rounded-xl p-4 ${isInTransit ? 'border-amber-500/20' : 'border-white/10'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Truck size={16} className={isComplete ? 'text-green-400' : isInTransit ? 'text-amber-400' : 'text-blue-400'} />
                      <span className="text-sm font-medium text-white">{m.transporter || 'Transport'}</span>
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">{m.vehicleReg} · {m.driverName || '—'}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${isComplete ? 'bg-green-500/20 text-green-400' : isInTransit ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {isComplete ? 'DELIVERED' : isInTransit ? 'IN TRANSIT' : 'PENDING'}
                  </span>
                </div>

                <div className="flex gap-3 text-xs text-white/30 mb-2 flex-wrap">
                  {m.departedAt && <span>Departed: {new Date(m.departedAt).toLocaleString('en-ZA')}</span>}
                  {m.arrivedAt && <span>Arrived: {new Date(m.arrivedAt).toLocaleString('en-ZA')}</span>}
                  {m.expectedDuration && <span>Expected: {m.expectedDuration}min</span>}
                  {m.driverIdNumber && <span>ID: {m.driverIdNumber}</span>}
                  {m.driverPhone && <span>☎ {m.driverPhone}</span>}
                </div>

                {/* Inspection + license chips */}
                <div className="flex gap-2 flex-wrap mb-2">
                  {m.driverLicenseUrl ? (
                    <a href={m.driverLicenseUrl} target="_blank" rel="noreferrer"
                      className="text-[10px] px-2 py-1 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 flex items-center gap-1 hover:bg-green-500/15">
                      <Eye size={10} /> Licence on file
                    </a>
                  ) : (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={10} /> Licence missing
                    </span>
                  )}
                  {m.vehicleInspectedAt ? (
                    <span className={`text-[10px] px-2 py-1 rounded-full border flex items-center gap-1
                      ${m.vehicleInspectionPassed ? 'bg-green-500/10 border-green-500/25 text-green-400' : 'bg-red-500/10 border-red-500/25 text-red-400'}`}>
                      <ShieldCheck size={10} />
                      {m.vehicleInspectionPassed ? 'Inspection ✓' : 'Inspection FAILED'}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 flex items-center gap-1">
                      <ShieldCheck size={10} /> Not inspected
                    </span>
                  )}
                </div>

                {/* Actions */}
                {!readOnly && hasMinLevel(1) && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {!m.vehicleInspectedAt && (
                      <button onClick={() => setShowInspect(m)}
                        className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-500/20 transition min-h-[36px] flex items-center gap-1">
                        <ShieldCheck size={12} /> Pre-dispatch Inspection
                      </button>
                    )}
                    {isPending && m.vehicleInspectedAt && m.vehicleInspectionPassed && (
                      <button onClick={() => departMut.mutate(m.id)} disabled={departMut.isPending}
                        className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-500/20 transition min-h-[36px] flex items-center gap-1">
                        <Truck size={12} /> Mark Departed
                      </button>
                    )}
                    {isPending && m.vehicleInspectedAt && !m.vehicleInspectionPassed && (
                      <span className="text-[11px] text-red-400 italic">Cannot dispatch — inspection failed</span>
                    )}
                    {isInTransit && (
                      <button onClick={() => arriveMut.mutate(m.id)} disabled={arriveMut.isPending}
                        className="px-3 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-500/20 transition min-h-[36px] flex items-center gap-1">
                        <CheckCircle size={12} /> Mark Arrived
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Transport Manifest">
        <ModalInput label="Transporter / Courier" placeholder="e.g. SecureMed Logistics" value={form.transporter} onChange={e => setForm(f => ({ ...f, transporter: (e.target as HTMLInputElement).value }))} />
        <div className="grid grid-cols-2 gap-3">
          <ModalInput label="Vehicle Reg" placeholder="e.g. NW-42-GP" value={form.vehicleReg} onChange={e => setForm(f => ({ ...f, vehicleReg: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="Driver Name" placeholder="Driver" value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: (e.target as HTMLInputElement).value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ModalInput label="Driver ID / Passport" placeholder="SA ID number" value={form.driverIdNumber} onChange={e => setForm(f => ({ ...f, driverIdNumber: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="Driver Phone" placeholder="+27 …" value={form.driverPhone} onChange={e => setForm(f => ({ ...f, driverPhone: (e.target as HTMLInputElement).value }))} />
        </div>
        <ModalInput label="Licence expiry" type="date" value={form.driverLicenseExpiry} onChange={e => setForm(f => ({ ...f, driverLicenseExpiry: (e.target as HTMLInputElement).value }))} />
        <div className="mb-4">
          <label className="block text-sm text-white/50 mb-1.5">Driver's licence photo</label>
          <label className="flex items-center gap-2 px-3 py-2.5 bg-dark border border-white/10 rounded-xl text-white/60 text-sm cursor-pointer hover:border-primary transition">
            <Upload size={14} className="text-primary" />
            <span className="flex-1 truncate">{licensePhoto?.name ?? 'Tap to upload a photo of the licence'}</span>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => setLicensePhoto(e.target.files?.[0] ?? null)} />
          </label>
          {licensePhoto && (
            <button type="button" onClick={() => setLicensePhoto(null)} className="text-[11px] text-white/30 hover:text-red-400 mt-1">
              Clear photo
            </button>
          )}
        </div>
        <ModalSelect label="Delivery Type" value={form.deliveryType} onChange={e => setForm(f => ({ ...f, deliveryType: (e.target as HTMLSelectElement).value }))}>
          <option value="SELF_DELIVER">Self Deliver</option>
          <option value="COURIER">Courier (First Freight etc)</option>
          <option value="CLIENT_PICKUP">Client Pickup</option>
        </ModalSelect>
        {form.deliveryType === 'COURIER' && (
          <ModalInput label="Waybill Number" placeholder="e.g. FF-2026-0045" value={form.waybillNumber} onChange={e => setForm(f => ({ ...f, waybillNumber: (e.target as HTMLInputElement).value }))} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <ModalInput label="Client Name" placeholder="Recipient" value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="Client Contact" placeholder="Phone" value={form.clientContact} onChange={e => setForm(f => ({ ...f, clientContact: (e.target as HTMLInputElement).value }))} />
        </div>
        <ModalInput label="Expected Duration (minutes)" type="number" placeholder="60" value={form.expectedDuration} onChange={e => setForm(f => ({ ...f, expectedDuration: (e.target as HTMLInputElement).value }))} />
        {releasedBatches.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm text-white/50 mb-1.5">Batches (select from released)</label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {releasedBatches.map((b: any) => (
                <label key={b.id} className="flex items-center gap-2 text-sm text-white/60 cursor-pointer py-1">
                  <input type="checkbox" checked={form.batchIds.includes(b.id)}
                    onChange={e => {
                      const ids = form.batchIds.split(',').filter(Boolean);
                      if (e.target.checked) ids.push(b.id);
                      else ids.splice(ids.indexOf(b.id), 1);
                      setForm(f => ({ ...f, batchIds: ids.join(',') }));
                    }} className="w-4 h-4 rounded" />
                  <span className="font-mono text-primary">{b.batchNumber}</span> — {b.strain}
                </label>
              ))}
            </div>
          </div>
        )}
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!form.transporter || !form.vehicleReg}>
          Create Manifest
        </ModalButton>
      </Modal>

      {/* Pre-dispatch vehicle inspection */}
      <Modal open={!!showInspect} onClose={() => setShowInspect(null)} title={`Vehicle Inspection — ${showInspect?.vehicleReg || ''}`}>
        <p className="text-xs text-white/40 mb-3">
          Walk-around check before the vehicle leaves the ILCO yard. All items must be confirmed
          before the manifest can be marked as departed.
        </p>

        <div className="space-y-1.5 mb-3">
          {INSPECTION_ITEMS.map(item => (
            <label key={item.key} className="flex items-center gap-2.5 text-sm text-white/80 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={!!inspectForm.checks[item.key]}
                onChange={e => setInspectForm(f => ({ ...f, checks: { ...f.checks, [item.key]: e.target.checked } }))}
                className="w-4 h-4 rounded"
              />
              {item.label}
            </label>
          ))}
        </div>

        <div className="mb-3">
          <label className="block text-sm text-white/50 mb-1.5">Overall outcome</label>
          <div className="flex gap-2">
            <button onClick={() => setInspectForm(f => ({ ...f, passed: true }))}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${inspectForm.passed ? 'bg-green-500/15 border-green-500/30 text-green-300' : 'bg-white/5 border-white/10 text-white/40'}`}>
              PASS — cleared to dispatch
            </button>
            <button onClick={() => setInspectForm(f => ({ ...f, passed: false }))}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${!inspectForm.passed ? 'bg-red-500/15 border-red-500/30 text-red-300' : 'bg-white/5 border-white/10 text-white/40'}`}>
              FAIL — hold dispatch
            </button>
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-sm text-white/50 mb-1.5">Notes</label>
          <textarea
            value={inspectForm.notes}
            onChange={e => setInspectForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Anything the next inspector should know…"
            className="w-full px-3 py-2 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none min-h-[72px] resize-y"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-white/50 mb-1.5">Inspection photo (seals / cargo / truck)</label>
          <label className="flex items-center gap-2 px-3 py-2.5 bg-dark border border-white/10 rounded-xl text-white/60 text-sm cursor-pointer hover:border-primary transition">
            <Upload size={14} className="text-primary" />
            <span className="flex-1 truncate">{inspectForm.photo?.name ?? 'Tap to upload'}</span>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => setInspectForm(f => ({ ...f, photo: e.target.files?.[0] ?? null }))} />
          </label>
        </div>

        <ModalButton loading={inspectMut.isPending} onClick={() => inspectMut.mutate()}>
          Record Inspection
        </ModalButton>
      </Modal>
    </div>
  );
}
