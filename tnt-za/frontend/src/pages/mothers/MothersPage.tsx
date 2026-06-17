import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonCard } from '../../components/Skeleton';
import SOPHeader from '../../components/SOPHeader';
import { Crown, Plus, GitBranch, Scissors, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400', STRESSED: 'bg-amber-500/20 text-amber-400',
  CULLED: 'bg-red-500/20 text-red-400', RETIRED: 'bg-white/10 text-white/40',
};

export default function MothersPage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editMotherId, setEditMotherId] = useState<string | null>(null);
  const [confirmDelMother, setConfirmDelMother] = useState<string | null>(null);
  const openEditMother = (m: any) => {
    setEditMotherId(m.id);
    setMotherForm({ identifier: m.identifier || '', strain: m.strain || '', source: m.source || 'CLONED', breeder: m.breeder || '', room: m.room || 'MR1', quantity: String(m.quantity || 1), inceptionDate: m.inceptionDate ? new Date(m.inceptionDate).toISOString().slice(0, 10) : '', lifecycleDays: String(m.lifecycleDays || 180) });
    setShowCreate(true);
  };
  const [showClone, setShowClone] = useState<string | null>(null);
  const [selectedMother, setSelectedMother] = useState<any>(null);
  const [motherForm, setMotherForm] = useState({ identifier: '', strain: '', source: 'CLONED', breeder: '', room: 'MR1', quantity: '1', inceptionDate: '', lifecycleDays: '180' });
  const [cuttings, setCuttings] = useState('10');
  const [clonePurpose, setClonePurpose] = useState('PRODUCTION');
  const [clientName, setClientName] = useState('');

  const [showEvent, setShowEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ eventType: 'HEALTH_CHECK', description: '', notes: '' });

  const { data: mothers, isLoading } = useQuery({ queryKey: ['mothers'], queryFn: () => api.get('/baygrid/mothers').then(r => r.data.mothers) });
  const { data: motherDetail } = useQuery({
    queryKey: ['mother', selectedMother?.id],
    queryFn: () => api.get(`/baygrid/mothers/${selectedMother.id}`).then(r => r.data.mother),
    enabled: !!selectedMother,
  });
  const { data: timeline } = useQuery({
    queryKey: ['mother-timeline', selectedMother?.id],
    queryFn: () => api.get(`/mothers/${selectedMother.id}/timeline`).then(r => r.data.timeline),
    enabled: !!selectedMother,
  });

  const eventMut = useMutation({
    mutationFn: () => api.post(`/mothers/${selectedMother.id}/events`, eventForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mother-timeline'] }); qc.invalidateQueries({ queryKey: ['mother'] }); setShowEvent(false); setEventForm({ eventType: 'HEALTH_CHECK', description: '', notes: '' }); addToast('success', 'Event logged'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const createMut = useMutation({
    mutationFn: () => editMotherId ? api.patch(`/baygrid/mothers/${editMotherId}`, motherForm) : api.post('/baygrid/mothers', motherForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mothers'] }); setShowCreate(false); addToast('success', editMotherId ? 'Mother updated' : 'Mother plant registered'); setEditMotherId(null); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  const delMotherMut = useMutation({
    mutationFn: (id: string) => api.delete(`/baygrid/mothers/${id}`),
    onSuccess: (r: any) => { qc.invalidateQueries({ queryKey: ['mothers'] }); setConfirmDelMother(null); addToast('success', r.data?.archived ? 'Mother retired (had clones)' : 'Mother deleted'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const cloneMut = useMutation({
    mutationFn: () => api.post('/baygrid/clone-trays', {
      motherPlantId: showClone, strain: mothers?.find((m: any) => m.id === showClone)?.strain,
      totalCuttings: parseInt(cuttings), purpose: clonePurpose,
      clientName: clonePurpose === 'CLIENT' ? clientName : undefined,
    }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['mothers'] }); setShowClone(null); setClonePurpose('PRODUCTION'); setClientName(''); addToast('success', `Clone tray ${res.data.tray.trayNumber} created — ${cuttings} cuttings (${clonePurpose})`); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="space-y-6">
      <SOPHeader
        sopNumber="3-CUL-6"
        title="Mother Bay · Current Mothers Register"
        effectiveDate="10/10/2025"
        version="1.0"
        responsibility="Plant Technicians"
        reportsTo="Head Grower"
        authorisedBy="Authorised Representative"
        checkedBy="Responsible Pharmacist"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mother Plants</h1>
          <p className="text-sm text-white/40">Mother → Clone Trays → Plants → Bays</p>
        </div>
        {hasMinLevel(2) && (
          <button onClick={() => { setEditMotherId(null); setMotherForm({ identifier: '', strain: '', source: 'CLONED', breeder: '', room: 'MR1', quantity: '1', inceptionDate: '', lifecycleDays: '180' }); setShowCreate(true); }} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <Plus size={16} /> Register Mother
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      ) : !mothers?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center">
          <Crown size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40 mb-4">No mother plants registered</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            const rooms = Array.from(new Set(mothers.map((m: any) => m.room || 'Unassigned'))).sort();
            const today = new Date();
            return rooms.map((room: any) => {
              const inRoom = mothers.filter((m: any) => (m.room || 'Unassigned') === room);
              const totalQty = inRoom.reduce((s: number, m: any) => s + (m.quantity || 1), 0);
              return (
                <div key={room}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-amber-300 font-mono">{room === 'MR1' ? 'Mother Room 1 · MR1' : room === 'MR2' ? 'Mother Room 2 · MR2' : room}</span>
                    <span className="text-xs text-white/40">{inRoom.length} entries · {totalQty} plants</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {inRoom.map((m: any) => {
                      const cullOverdue = m.cullDate && new Date(m.cullDate) <= today;
                      return (
                        <div key={m.id} onClick={() => setSelectedMother(m)}
                          className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/[0.07] transition active:scale-[0.98]">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Crown size={16} className="text-amber-400" />
                              <span className="font-bold font-mono text-white">{m.identifier}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[m.status]}`}>{m.status}</span>
                              {hasMinLevel(2) && (<>
                                <button onClick={(e) => { e.stopPropagation(); openEditMother(m); }} className="p-1 rounded text-white/40 hover:text-primary" title="Edit mother"><Pencil size={13} /></button>
                                <button onClick={(e) => { e.stopPropagation(); confirmDelMother === m.id ? delMotherMut.mutate(m.id) : setConfirmDelMother(m.id); }} className={`p-1 rounded ${confirmDelMother === m.id ? 'text-red-400' : 'text-white/40 hover:text-red-400'}`} title={confirmDelMother === m.id ? 'Tap again to confirm delete' : 'Delete mother'}><Trash2 size={13} /></button>
                              </>)}
                            </div>
                          </div>
                          <div className="text-sm text-white/70 mb-1">{m.strain} · <span className="text-white/50">{m.quantity || 1} plants</span></div>
                          <div className="text-xs text-white/40 mb-2">
                            {m.inceptionDate ? `Inception ${new Date(m.inceptionDate).toLocaleDateString()}` : m.source}
                          </div>
                          {m.cullDate && (
                            <div className={`text-xs mb-3 font-medium ${cullOverdue ? 'text-red-400' : 'text-white/40'}`}>
                              Cull {new Date(m.cullDate).toLocaleDateString()} {cullOverdue ? '· OVERDUE' : `· ${m.lifecycleDays || 180}d cycle`}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex gap-4 text-xs text-white/40">
                              <span><GitBranch size={12} className="inline mr-1" />{m.totalClones} clones</span>
                            </div>
                            {hasMinLevel(2) && m.status === 'ACTIVE' && (
                              <button onClick={(e) => { e.stopPropagation(); setShowClone(m.id); setCuttings('10'); }}
                                className="px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition flex items-center gap-1 min-h-[36px]">
                                <Scissors size={12} /> Clone
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Mother Detail Modal */}
      <Modal open={!!selectedMother && !!motherDetail} onClose={() => setSelectedMother(null)} title={`Mother: ${motherDetail?.identifier || ''}`}>
        {motherDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40">Strain</div>
                <div className="text-sm text-white font-medium">{motherDetail.strain}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40">Source</div>
                <div className="text-sm text-white font-medium">{motherDetail.source}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40">Total Clones</div>
                <div className="text-sm text-white font-bold font-mono">{motherDetail.totalClones}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40">Test Status</div>
                <div className="text-sm text-white font-medium">{motherDetail.testStatus}</div>
              </div>
            </div>
            {motherDetail.breeder && <p className="text-sm text-white/50">Breeder: {motherDetail.breeder}</p>}
            {motherDetail.notes && <p className="text-sm text-white/40">{motherDetail.notes}</p>}

            {/* Bay position + health */}
            {(motherDetail.bayId || motherDetail.lastHealthCheck) && (
              <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center justify-between">
                {motherDetail.bayPosition && <span className="text-xs text-white/40">Bay Position: <strong className="text-white">#{motherDetail.bayPosition}</strong></span>}
                {motherDetail.lastHealthCheck && <span className="text-xs text-white/40">Last check: {new Date(motherDetail.lastHealthCheck).toLocaleDateString('en-ZA')}</span>}
                {motherDetail.nextHealthCheck && new Date(motherDetail.nextHealthCheck) <= new Date() && <span className="text-xs text-red-400 font-bold">Health check overdue</span>}
              </div>
            )}

            {/* Log event button */}
            {hasMinLevel(1) && (
              <button onClick={() => { setShowEvent(true); setEventForm({ eventType: 'HEALTH_CHECK', description: '', notes: '' }); }}
                className="w-full py-2.5 bg-primary/10 border border-primary/30 text-primary rounded-xl text-sm font-semibold hover:bg-primary/20 transition min-h-[44px]">
                + Log Event (Health Check / Feed / Note)
              </button>
            )}

            {/* Timeline */}
            {timeline && timeline.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-2">Timeline</h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {timeline.map((ev: any) => (
                    <div key={ev.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-primary">{ev.eventType.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-white/20">{new Date(ev.timestamp).toLocaleDateString('en-ZA')}</span>
                      </div>
                      <div className="text-xs text-white/50">{ev.description}</div>
                      {ev.notes && <div className="text-[10px] text-white/25 mt-0.5">{ev.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="text-sm font-semibold text-white/60">Clone History</h3>
            {motherDetail.cloneTrays?.length > 0 ? (
              <div className="space-y-2">
                {motherDetail.cloneTrays.map((ct: any) => (
                  <div key={ct.id} className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-primary text-sm">{ct.trayNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ct.status === 'ROOTED' ? 'bg-green-500/20 text-green-400' : ct.status === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{ct.status}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-white/40">
                      <span>Cut: {new Date(ct.cloneDate).toLocaleDateString('en-ZA')}</span>
                      <span>Taken: {ct.totalCuttings}</span>
                      <span>Rooted: {ct.rooted}</span>
                      <span>Dead: {ct.mortality}</span>
                    </div>
                    {ct.totalCuttings > 0 && (
                      <div className="mt-1.5 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(ct.rooted / ct.totalCuttings) * 100}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-sm">No clone trays yet</p>
            )}
          </div>
        )}
      </Modal>

      {/* Create Mother Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setEditMotherId(null); }} title={editMotherId ? 'Edit Mother Plant' : 'Register Mother Plant'}>
        <ModalInput label="Identifier" placeholder="e.g. KB-01, SL-01" value={motherForm.identifier} onChange={e => setMotherForm(f => ({ ...f, identifier: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Strain" placeholder="e.g. SL, KB, Cereal Milk" value={motherForm.strain} onChange={e => setMotherForm(f => ({ ...f, strain: (e.target as HTMLInputElement).value }))} />
        <ModalSelect label="Mother Room" value={motherForm.room} onChange={e => setMotherForm(f => ({ ...f, room: (e.target as HTMLSelectElement).value }))}>
          <option value="MR1">Mother Room 1 (MR1)</option>
          <option value="MR2">Mother Room 2 (MR2)</option>
        </ModalSelect>
        <ModalInput label="Quantity (plants)" type="number" placeholder="e.g. 20" value={motherForm.quantity} onChange={e => setMotherForm(f => ({ ...f, quantity: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Inception date" type="date" value={motherForm.inceptionDate} onChange={e => setMotherForm(f => ({ ...f, inceptionDate: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Lifecycle (days)" type="number" placeholder="180" value={motherForm.lifecycleDays} onChange={e => setMotherForm(f => ({ ...f, lifecycleDays: (e.target as HTMLInputElement).value }))} />
        <ModalSelect label="Source" value={motherForm.source} onChange={e => setMotherForm(f => ({ ...f, source: (e.target as HTMLSelectElement).value }))}>
          <option value="CLONED">Cloned (from another mother)</option>
          <option value="PURCHASED">Purchased (seed)</option>
        </ModalSelect>
        {motherForm.inceptionDate && (
          <div className="text-xs text-white/40 mb-2">Auto cull date: <span className="text-amber-300 font-medium">{new Date(new Date(motherForm.inceptionDate).getTime() + (parseInt(motherForm.lifecycleDays)||180)*86400000).toLocaleDateString()}</span> (inception + {motherForm.lifecycleDays||180}d)</div>
        )}
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!motherForm.identifier || !motherForm.strain}>
          {editMotherId ? 'Save changes' : 'Register Mother'}
        </ModalButton>
      </Modal>

      {/* Clone Modal */}
      <Modal open={!!showClone} onClose={() => setShowClone(null)} title="Take Cuttings">
        {/* Purpose selection */}
        <div className="mb-4">
          <label className="block text-sm text-white/50 mb-2">Clone Purpose</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'PRODUCTION', label: 'Production', desc: 'Grow → Harvest → Sell', color: 'primary' },
              { id: 'R_AND_D', label: 'R&D', desc: 'New mother plant', color: 'purple-400' },
              { id: 'CLIENT', label: 'For Client', desc: 'Sell clone directly', color: 'blue-400' },
            ].map(p => (
              <button key={p.id} onClick={() => setClonePurpose(p.id)}
                className={`p-3 rounded-xl border text-center transition active:scale-[0.97] ${clonePurpose === p.id ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'}`}>
                <div className="text-xs font-semibold text-white">{p.label}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <ModalInput label="Number of Cuttings" type="number" value={cuttings} onChange={e => setCuttings((e.target as HTMLInputElement).value)} />

        {clonePurpose === 'CLIENT' && (
          <ModalInput label="Client Name" placeholder="e.g. Green Valley Farms" value={clientName} onChange={e => setClientName((e.target as HTMLInputElement).value)} />
        )}

        <p className="text-xs text-white/30">
          {clonePurpose === 'PRODUCTION' && 'Clones will root → transplant to GH → full 17-step production workflow.'}
          {clonePurpose === 'R_AND_D' && 'Clones will root → become new mother plants. R&D rooting log tracked.'}
          {clonePurpose === 'CLIENT' && 'Clones will root → health check → dispatch to client with certificate.'}
        </p>

        <ModalButton loading={cloneMut.isPending} onClick={() => cloneMut.mutate()}
          disabled={!cuttings || parseInt(cuttings) < 1 || (clonePurpose === 'CLIENT' && !clientName)}>
          {clonePurpose === 'PRODUCTION' && `Create Production Tray — ${cuttings} cuttings`}
          {clonePurpose === 'R_AND_D' && `Create R&D Tray — ${cuttings} cuttings`}
          {clonePurpose === 'CLIENT' && `Create Client Tray — ${cuttings} for ${clientName || '...'}`}
        </ModalButton>
      </Modal>

      {/* Log Mother Event Modal */}
      <Modal open={showEvent} onClose={() => setShowEvent(false)} title="Log Mother Event">
        <ModalSelect label="Event Type" value={eventForm.eventType} onChange={e => setEventForm(f => ({ ...f, eventType: (e.target as HTMLSelectElement).value }))}>
          <option value="HEALTH_CHECK">Health Check</option>
          <option value="FEEDING">Feeding</option>
          <option value="CLONE_TAKEN">Clone Taken</option>
          <option value="PHOTO">Photo Taken</option>
          <option value="STATUS_CHANGE">Status Change</option>
          <option value="DEFECT_FOUND">Defect Found</option>
          <option value="TREATMENT">Treatment Applied</option>
          <option value="NOTE">General Note</option>
        </ModalSelect>
        <ModalInput label="Description" placeholder="e.g. Healthy, no signs of stress" value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Notes (optional)" placeholder="Additional details" value={eventForm.notes} onChange={e => setEventForm(f => ({ ...f, notes: (e.target as HTMLInputElement).value }))} />
        <ModalButton loading={eventMut.isPending} onClick={() => eventMut.mutate()} disabled={!eventForm.description}>
          Log Event
        </ModalButton>
      </Modal>
    </div>
  );
}
