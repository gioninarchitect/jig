import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonTable } from '../../components/Skeleton';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import SOPHeader from '../../components/SOPHeader';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';

const PHASES = ['', 'SEEDLING', 'VEGETATIVE', 'FLOWERING', 'HARVESTED', 'DRYING', 'CURING', 'PROCESSING', 'PACKAGED'];
const PHASE_DOT: Record<string, string> = {
  SEEDLING: 'bg-green-300', VEGETATIVE: 'bg-green-400', FLOWERING: 'bg-green-500',
  HARVESTED: 'bg-amber-400', DRYING: 'bg-amber-500', CURING: 'bg-orange-500',
  PROCESSING: 'bg-purple-400', PACKAGED: 'bg-primary',
};

export default function PlantsPage() {
  const navigate = useNavigate();
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [phase, setPhase] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlant, setNewPlant] = useState({ strain: '', facilityId: '', zoneId: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['plants', { search, phase, page }],
    queryFn: () => api.get('/plants', { params: { search: search || undefined, phase: phase || undefined, page, limit: 20 } }).then(r => r.data),
  });

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => api.get('/facilities').then(r => r.data.facilities),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/plants', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plants'] }); setShowCreate(false); addToast('success', 'Plant registered'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="space-y-4">
      <SOPHeader
        sopNumber="3-CUL-8"
        title="Current Plants Register"
        effectiveDate="10/10/2025"
        version="1.0"
        responsibility="Plant Technicians"
        reportsTo="Head Grower"
        authorisedBy="Authorised Representative"
        checkedBy="Responsible Pharmacist"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Plants</h1>
        {hasMinLevel(2) && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition">
            <Plus size={16} /> Register Plant
          </button>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Register New Plant">
        <ModalInput label="Strain" placeholder="e.g. Durban Poison" value={newPlant.strain} onChange={e => setNewPlant(p => ({ ...p, strain: (e.target as HTMLInputElement).value }))} />
        <ModalSelect label="Facility" value={newPlant.facilityId} onChange={e => setNewPlant(p => ({ ...p, facilityId: (e.target as HTMLSelectElement).value }))}>
          <option value="">Select facility</option>
          {facilities?.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </ModalSelect>
        {newPlant.facilityId && (
          <ModalSelect label="Zone" value={newPlant.zoneId} onChange={e => setNewPlant(p => ({ ...p, zoneId: (e.target as HTMLSelectElement).value }))}>
            <option value="">Select zone</option>
            {facilities?.find((f: any) => f.id === newPlant.facilityId)?.zones?.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </ModalSelect>
        )}
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate(newPlant)} disabled={!newPlant.strain || !newPlant.facilityId || !newPlant.zoneId}>
          Register Plant
        </ModalButton>
      </Modal>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search ID, RFID, strain..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:border-primary focus:outline-none" />
        </div>
        <select value={phase} onChange={(e) => { setPhase(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-primary focus:outline-none">
          {PHASES.map(p => <option key={p} value={p} className="bg-dark">{p || 'All Phases'}</option>)}
        </select>
      </div>

      {isLoading ? <SkeletonTable rows={8} /> : !data?.plants?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center">
          <p className="text-white/40">No plants found</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-white/40 border-b border-white/10">
                <th className="pb-2 font-medium">Plant ID</th><th className="pb-2 font-medium">Strain</th>
                <th className="pb-2 font-medium">Phase</th><th className="pb-2 font-medium">Zone</th>
                <th className="pb-2 font-medium">Handler</th><th className="pb-2 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {data.plants.map((p: any) => (
                  <tr key={p.id} onClick={() => navigate(`/plants/${p.id}`)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition">
                    <td className="py-3 font-mono text-primary">{p.identifier}</td>
                    <td className="py-3 text-white/80">{p.strain}</td>
                    <td className="py-3">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${PHASE_DOT[p.phase] || 'bg-gray-500'}`} />
                        <span className="text-white/70 text-xs">{p.phase}</span>
                      </span>
                    </td>
                    <td className="py-3 text-white/60">{p.zone?.name || '—'}</td>
                    <td className="py-3 text-white/60">{p.handler?.name || '—'}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'FLAGGED' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {data.plants.map((p: any) => (
              <div key={p.id} onClick={() => navigate(`/plants/${p.id}`)}
                className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/[0.07] transition">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono text-primary text-sm">{p.identifier}</div>
                    <div className="text-white/80 font-medium">{p.strain}</div>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full ${PHASE_DOT[p.phase] || 'bg-gray-500'}`} />
                </div>
                <div className="flex gap-4 mt-2 text-xs text-white/40">
                  <span>{p.phase}</span><span>{p.zone?.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="p-2 text-white/40 hover:text-white disabled:opacity-30"><ChevronLeft size={18} /></button>
              <span className="text-sm text-white/50">{page} / {data.pages}</span>
              <button disabled={page >= data.pages} onClick={() => setPage(page + 1)}
                className="p-2 text-white/40 hover:text-white disabled:opacity-30"><ChevronRight size={18} /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
