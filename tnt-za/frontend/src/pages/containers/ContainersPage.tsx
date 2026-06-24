import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useRBAC } from '../../hooks/useRBAC';
import { useReadOnly } from '../../hooks/useReadOnly';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonTable } from '../../components/Skeleton';
import Modal, { ModalSelect, ModalButton } from '../../components/Modal';
import { Box, AlertTriangle, Plus } from 'lucide-react';
import api from '../../services/api';

const TYPES = ['BIN', 'RACK', 'BAG', 'JAR', 'PACKAGE'];
const TYPE_LABELS: Record<string, string> = { BIN: 'Bin', RACK: 'Rack', BAG: 'Bag', JAR: 'Cure Container', PACKAGE: 'Package' };

export default function ContainersPage() {
  const navigate = useNavigate();
  const { hasMinLevel } = useRBAC();
  const readOnly = useReadOnly();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [cType, setCType] = useState('BIN');
  const [facilityId, setFacilityId] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['containers'], queryFn: () => api.get('/containers').then(r => r.data.containers) });
  const { data: facilities } = useQuery({ queryKey: ['facilities'], queryFn: () => api.get('/facilities').then(r => r.data.facilities) });

  const createMut = useMutation({
    mutationFn: () => api.post('/containers', { containerType: cType, facilityId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['containers'] }); setShowCreate(false); addToast('success', 'Container registered'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Containers</h1>
        {!readOnly && hasMinLevel(2) && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition">
            <Plus size={16} /> Register Container
          </button>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Register Container">
        <ModalSelect label="Container Type" value={cType} onChange={e => setCType((e.target as HTMLSelectElement).value)}>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </ModalSelect>
        <ModalSelect label="Facility" value={facilityId} onChange={e => setFacilityId((e.target as HTMLSelectElement).value)}>
          <option value="">Select facility</option>
          {facilities?.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </ModalSelect>
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!facilityId}>Register</ModalButton>
      </Modal>
      {isLoading ? <SkeletonTable rows={6} /> : !data?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 sm:p-12 text-center text-white/40">No containers registered</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-white/40 border-b border-white/10">
                <th className="pb-2 font-medium">ID</th><th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Batch</th><th className="pb-2 font-medium">Zone</th>
                <th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Last Weight</th>
              </tr></thead>
              <tbody>
                {data.map((c: any) => (
                  <tr key={c.id} onClick={() => navigate(`/containers/${c.id}`)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition">
                    <td className="py-3 font-mono text-primary">{c.containerId}</td>
                    <td className="py-3 text-white/70">{c.containerType}</td>
                    <td className="py-3 text-white/60 font-mono">{c.batch?.batchNumber || '—'}</td>
                    <td className="py-3 text-white/60">{c.currentZone?.name || '—'}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'LOADED' ? 'bg-primary/20 text-primary' : c.status === 'IN_TRANSIT' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/50'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-white/60">{c.events?.[0]?.weight ? `${c.events[0].weight.toFixed(1)}g` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {data.map((c: any) => (
              <div key={c.id} onClick={() => navigate(`/containers/${c.id}`)}
                className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/[0.07] transition active:scale-[0.98]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-mono text-primary text-sm font-bold">{c.containerId}</div>
                    <div className="text-xs text-white/40">{c.containerType} &middot; {c.currentZone?.name || 'No zone'}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'LOADED' ? 'bg-primary/20 text-primary' : c.status === 'IN_TRANSIT' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/50'}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-white/40">
                  {c.batch?.batchNumber && <span>Batch: {c.batch.batchNumber}</span>}
                  {c.events?.[0]?.weight && <span className="font-mono">{c.events[0].weight.toFixed(1)}g</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
