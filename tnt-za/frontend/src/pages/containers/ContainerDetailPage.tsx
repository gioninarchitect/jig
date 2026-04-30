import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonPage } from '../../components/Skeleton';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { Box, ArrowRight, Scale, User, AlertTriangle, Package, Truck, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

const EVENT_ICONS: Record<string, string> = { LOAD: '📦', UNLOAD: '📤', MOVE: '🚚', WEIGH: '⚖️', HANDOVER: '🤝' };

export default function ContainerDetailPage() {
  const { id } = useParams();
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [action, setAction] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [handlerId, setHandlerId] = useState('');

  const { data: facilities } = useQuery({ queryKey: ['facilities'], queryFn: () => api.get('/facilities').then(r => r.data.facilities) });
  const zones = facilities?.[0]?.zones || [];

  const actionMut = useMutation({
    mutationFn: (d: { action: string }) => {
      const payload: any = { weight: parseFloat(weight), weightUnit: 'g', zoneId };
      if (d.action === 'handover') payload.incomingHandlerId = handlerId;
      return api.post(`/containers/${id}/${d.action}`, payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['container', id] }); setAction(null); setWeight(''); setZoneId(''); addToast('success', 'Action recorded'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['container', id],
    queryFn: () => api.get(`/containers/${id}`).then(r => r.data.container),
    enabled: !!id,
  });

  if (isLoading) return <SkeletonPage />;
  if (!data) return <p className="text-white/40">Container not found</p>;

  const weightData = data.events?.filter((e: any) => e.weight).map((e: any) => ({
    time: new Date(e.timestamp).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
    weight: e.weight,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Box size={20} className="text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold font-mono text-primary">{data.containerId}</h1>
          <p className="text-sm text-white/50">{data.containerType} &middot; {data.batch?.batchNumber || 'Unassigned'}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full ${data.status === 'LOADED' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/50'}`}>{data.status}</span>
      </div>

      {/* Action buttons */}
      {hasMinLevel(2) && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setAction('load')} className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition flex items-center gap-2"><Package size={14} /> Load</button>
          <button onClick={() => setAction('unload')} className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-semibold hover:bg-amber-500/20 transition flex items-center gap-2"><Package size={14} /> Unload</button>
          <button onClick={() => setAction('move')} className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-500/20 transition flex items-center gap-2"><Truck size={14} /> Move</button>
          <button onClick={() => setAction('handover')} className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-lg text-sm font-semibold hover:bg-purple-500/20 transition flex items-center gap-2"><Users size={14} /> Handover</button>
        </div>
      )}

      <Modal open={!!action} onClose={() => setAction(null)} title={`${action?.toUpperCase()} — ${data.containerId}`}>
        <ModalInput label="Weight (grams)" type="number" placeholder="0.00" value={weight} onChange={e => setWeight((e.target as HTMLInputElement).value)} />
        {(action === 'load' || action === 'move' || action === 'unload') && (
          <ModalSelect label="Zone" value={zoneId} onChange={e => setZoneId((e.target as HTMLSelectElement).value)}>
            <option value="">Select zone</option>
            {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </ModalSelect>
        )}
        {action === 'handover' && (
          <ModalInput label="Incoming Handler ID" placeholder="User ID of person receiving" value={handlerId} onChange={e => setHandlerId((e.target as HTMLInputElement).value)} />
        )}
        <ModalButton loading={actionMut.isPending} onClick={() => actionMut.mutate({ action: action! })} disabled={!weight}>
          Confirm {action}
        </ModalButton>
      </Modal>

      {/* Weight chart */}
      {weightData.length > 1 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white/60 mb-4">Weight Over Time</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightData}>
              <XAxis dataKey="time" stroke="#555" fontSize={11} />
              <YAxis stroke="#555" fontSize={11} unit="g" />
              <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #333', borderRadius: 8 }} />
              <Line type="monotone" dataKey="weight" stroke="#C9A84C" strokeWidth={2} dot={{ fill: '#C9A84C' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Event timeline */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white/60 mb-4">Event Timeline</h2>
        {!data.events?.length ? <p className="text-white/30 text-sm">No events recorded</p> : (
          <div className="space-y-3">
            {data.events.map((e: any, i: number) => (
              <div key={e.id} className="flex gap-4 text-sm">
                <div className="flex flex-col items-center">
                  <span className="text-lg">{EVENT_ICONS[e.eventType] || '📋'}</span>
                  {i < data.events.length - 1 && <div className="w-px h-full bg-white/10 mt-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{e.eventType}</span>
                    {e.weight && <span className="font-mono text-primary text-xs">{e.weight.toFixed(1)}g</span>}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {new Date(e.timestamp).toLocaleString('en-ZA')}
                    {e.outgoingHandler && <span> &middot; {e.outgoingHandler.name}</span>}
                    {e.incomingHandler && <span> → {e.incomingHandler.name}</span>}
                    {e.fromZone && <span> &middot; {e.fromZone.name}</span>}
                    {e.toZone && e.toZone.name !== e.fromZone?.name && <span> → {e.toZone.name}</span>}
                  </div>
                  {e.notes && <p className="text-xs text-amber-400 mt-1">{e.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
