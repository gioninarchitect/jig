import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { BookOpen, AlertTriangle, Wrench, Plus, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function QMSPage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();

  const [showSOP, setShowSOP] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [showEquip, setShowEquip] = useState(false);
  const [showCalibrate, setShowCalibrate] = useState<string | null>(null);

  const [sopForm, setSopForm] = useState({ title: '', content: '', facilityId: '' });
  const [devForm, setDevForm] = useState({ sopId: '', description: '', severity: 'MEDIUM', facilityId: '' });
  const [equipForm, setEquipForm] = useState({ equipmentName: '', facilityId: '' });

  const { data: sops } = useQuery({ queryKey: ['sops'], queryFn: () => api.get('/qms/sops').then(r => r.data.sops) });
  const { data: deviations } = useQuery({ queryKey: ['deviations'], queryFn: () => api.get('/qms/deviations?open=true').then(r => r.data.deviations) });
  const { data: equipment } = useQuery({ queryKey: ['equipment'], queryFn: () => api.get('/qms/equipment').then(r => r.data.equipment) });
  const { data: facilities } = useQuery({ queryKey: ['facilities'], queryFn: () => api.get('/facilities').then(r => r.data.facilities) });

  const facilityId = facilities?.[0]?.id || '';

  const sopMut = useMutation({
    mutationFn: () => api.post('/qms/sops', { ...sopForm, facilityId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sops'] }); setShowSOP(false); setSopForm({ title: '', content: '', facilityId: '' }); addToast('success', 'SOP created'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const devMut = useMutation({
    mutationFn: () => api.post('/qms/deviations', { ...devForm, facilityId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deviations'] }); setShowDev(false); setDevForm({ sopId: '', description: '', severity: 'MEDIUM', facilityId: '' }); addToast('success', 'Deviation raised'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const equipMut = useMutation({
    mutationFn: () => api.post('/qms/equipment', { ...equipForm, facilityId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); setShowEquip(false); setEquipForm({ equipmentName: '', facilityId: '' }); addToast('success', 'Equipment registered'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const calibrateMut = useMutation({
    mutationFn: (id: string) => api.patch(`/qms/equipment/${id}/calibrate`, { nextDueDays: 30 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); setShowCalibrate(null); addToast('success', 'Calibration recorded'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Quality Management</h1>

      {/* SOPs */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><BookOpen size={16} className="text-primary" /><h2 className="text-sm font-semibold text-white/60">SOPs</h2></div>
          {hasMinLevel(3) && <button onClick={() => setShowSOP(true)} className="text-xs text-primary flex items-center gap-1 hover:text-primary-light"><Plus size={12} /> Add SOP</button>}
        </div>
        {!sops?.length ? <p className="text-white/30 text-sm">No SOPs</p> : sops.map((s: any) => (
          <div key={s.id} className="flex justify-between py-2 border-b border-white/5 text-sm">
            <span className="text-white/80">{s.title}</span>
            <div className="flex gap-3 text-xs text-white/40">
              <span>v{s.version}</span><span>{s._count?.acknowledgements || 0} acks</span>
            </div>
          </div>
        ))}
      </div>

      {/* Deviations */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400" /><h2 className="text-sm font-semibold text-white/60">Open Deviations</h2></div>
          {hasMinLevel(2) && <button onClick={() => setShowDev(true)} className="text-xs text-amber-400 flex items-center gap-1 hover:text-amber-300"><Plus size={12} /> Raise Deviation</button>}
        </div>
        {!deviations?.length ? <p className="text-white/30 text-sm">No open deviations</p> : deviations.map((d: any) => (
          <div key={d.id} className="py-2 border-b border-white/5 text-sm">
            <div className="flex justify-between">
              <span className="text-white/80">{d.description}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${d.severity === 'HIGH' || d.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{d.severity}</span>
            </div>
            <span className="text-xs text-white/30">SOP: {d.sop?.title}</span>
          </div>
        ))}
      </div>

      {/* Equipment */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Wrench size={16} className="text-primary" /><h2 className="text-sm font-semibold text-white/60">Equipment Calibration</h2></div>
          {hasMinLevel(3) && <button onClick={() => setShowEquip(true)} className="text-xs text-primary flex items-center gap-1 hover:text-primary-light"><Plus size={12} /> Add Equipment</button>}
        </div>
        {!equipment?.length ? <p className="text-white/30 text-sm">No equipment</p> : equipment.map((e: any) => {
          const daysUntil = e.nextDue ? Math.floor((new Date(e.nextDue).getTime() - Date.now()) / 86400000) : null;
          return (
            <div key={e.id} className="flex items-center justify-between py-2 border-b border-white/5 text-sm">
              <span className="text-white/80">{e.equipmentName}</span>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${daysUntil !== null && daysUntil <= 7 ? 'text-red-400' : 'text-white/40'}`}>
                  {daysUntil !== null ? `Due in ${daysUntil}d` : 'Not scheduled'}
                </span>
                {hasMinLevel(3) && (
                  <button onClick={() => calibrateMut.mutate(e.id)} className="text-xs text-primary hover:text-primary-light flex items-center gap-1">
                    <CheckCircle size={12} /> Calibrate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create SOP Modal */}
      <Modal open={showSOP} onClose={() => setShowSOP(false)} title="Create SOP">
        <ModalInput label="Title" placeholder="e.g. Harvest & Weighing Procedure" value={sopForm.title} onChange={e => setSopForm(f => ({ ...f, title: (e.target as HTMLInputElement).value }))} />
        <div className="mb-3">
          <label className="block text-sm text-white/50 mb-1">Content</label>
          <textarea placeholder="SOP content..." value={sopForm.content} onChange={e => setSopForm(f => ({ ...f, content: e.target.value }))}
            className="w-full px-3 py-2.5 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none min-h-[100px] resize-y" />
        </div>
        <ModalButton loading={sopMut.isPending} onClick={() => sopMut.mutate()} disabled={!sopForm.title || !sopForm.content}>Create SOP</ModalButton>
      </Modal>

      {/* Raise Deviation Modal */}
      <Modal open={showDev} onClose={() => setShowDev(false)} title="Raise Deviation">
        <ModalSelect label="Against SOP" value={devForm.sopId} onChange={e => setDevForm(f => ({ ...f, sopId: (e.target as HTMLSelectElement).value }))}>
          <option value="">Select SOP</option>
          {sops?.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </ModalSelect>
        <ModalInput label="Description" placeholder="What deviated from the SOP?" value={devForm.description} onChange={e => setDevForm(f => ({ ...f, description: (e.target as HTMLInputElement).value }))} />
        <ModalSelect label="Severity" value={devForm.severity} onChange={e => setDevForm(f => ({ ...f, severity: (e.target as HTMLSelectElement).value }))}>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </ModalSelect>
        <ModalButton loading={devMut.isPending} onClick={() => devMut.mutate()} disabled={!devForm.sopId || !devForm.description}>Raise Deviation</ModalButton>
      </Modal>

      {/* Register Equipment Modal */}
      <Modal open={showEquip} onClose={() => setShowEquip(false)} title="Register Equipment">
        <ModalInput label="Equipment Name" placeholder="e.g. Mettler Toledo XS205 — Drying Room" value={equipForm.equipmentName} onChange={e => setEquipForm(f => ({ ...f, equipmentName: (e.target as HTMLInputElement).value }))} />
        <ModalButton loading={equipMut.isPending} onClick={() => equipMut.mutate()} disabled={!equipForm.equipmentName}>Register</ModalButton>
      </Modal>
    </div>
  );
}
