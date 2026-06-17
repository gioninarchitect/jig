import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonTable } from '../../components/Skeleton';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import SOPHeader from '../../components/SOPHeader';
import { ClipboardList, Plus } from 'lucide-react';
import api from '../../services/api';

// =====================================================================
// Cultivation Activity Log — SOPs 3-CUL-6/7/9
//
// Free-form activity log per zone. Captures what was done, when, by
// whom, and why. Feeds the audit chain.
// =====================================================================

import { FACILITY_ZONES, zoneFamily, zoneLabel } from '../../constants/facilityZones';

type Zone = string;
const FAMILY_CFG: Record<string, { sop: string; effective: string }> = {
  MOTHER:     { sop: '3-CUL-6',    effective: '03/09/2025' },
  CLONE:      { sop: '3-CUL-7',    effective: '01/03/2026' },
  GREENHOUSE: { sop: '3-CUL-9/10', effective: '03/09/2025' },
};

interface ActivityEntry {
  id: string; date: string; time: string; zone: Zone;
  activityPerformed: string; reason: string; performedBy: string; signedAt: string;
  strainId?: string; batchNo?: string; numberSize?: number;
}

export default function ActivityLogPage() {
  const { hasMinLevel } = useRBAC();
  const user = useAuthStore(s => s.user);
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const canLog = hasMinLevel(1);

  const [zone, setZone] = useState<Zone>('GH1');
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState({ activityPerformed: '', reason: '', strainId: '', batchNo: '', numberSize: '' });

  const config = { ...FAMILY_CFG[zoneFamily(zone)], label: zoneLabel(zone) };

  const { data: entries, isLoading } = useQuery<ActivityEntry[]>({
    queryKey: ['activity-log', zone],
    queryFn: () => api.get(`/activity-log?zone=${zone}`).then(r => r.data.entries ?? []).catch(() => []),
  });

  const logMut = useMutation({
    mutationFn: () => api.post('/activity-log', {
      zone,
      activityPerformed: form.activityPerformed,
      reason: form.reason,
      strainId: form.strainId || undefined,
      batchNo: form.batchNo || undefined,
      numberSize: form.numberSize ? parseInt(form.numberSize) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-log'] });
      setShowLog(false);
      setForm({ activityPerformed: '', reason: '', strainId: '', batchNo: '', numberSize: '' });
      addToast('success', 'Activity logged');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error ?? 'Failed'),
  });

  return (
    <div className="space-y-6">
      <SOPHeader
        sopNumber={config.sop}
        title={`Cultivation Activity Log · ${config.label}`}
        effectiveDate={config.effective}
        version="1.0"
        responsibility="Plant Technicians"
        reportsTo="Head Grower"
        authorisedBy="Authorised Representative"
        checkedBy="Responsible Pharmacist"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ClipboardList className="text-amber-400" size={26} /> Activity Log
          </h1>
          <p className="text-sm text-white/40 mt-1">Log activities performed in the zone, with reason and performer</p>
        </div>
        {canLog && (
          <button
            onClick={() => setShowLog(true)}
            className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <Plus size={16} /> Log activity
          </button>
        )}
      </div>

      {/* Zone chips */}
      <div className="flex gap-2 flex-wrap">
        {FACILITY_ZONES.map(z => (
          <button key={z.key} onClick={() => setZone(z.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border min-h-[36px] ${
              zone === z.key
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:text-white'
            }`}>
            {z.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonTable />
      ) : !entries?.length ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <ClipboardList className="mx-auto text-white/30 mb-3" size={36} />
          <p className="text-white/60 text-sm">No activities logged for {config.label} yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-amber-400/80 border-b border-white/10">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Activity</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Performed by</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-2.5 font-mono text-xs text-white/80">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-white/60">{e.time}</td>
                  <td className="px-4 py-2.5 text-white">{e.activityPerformed}</td>
                  <td className="px-4 py-2.5 text-white/60">{e.reason}</td>
                  <td className="px-4 py-2.5 text-white/60 text-xs">{e.performedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showLog} onClose={() => setShowLog(false)} title={`Log activity · ${config.label}`}>
        <div className="space-y-2">
          <ModalInput label="Activity performed" placeholder="e.g. Foliar spray, Trim, Topping"
            value={form.activityPerformed} onChange={e => setForm({ ...form, activityPerformed: e.target.value })} />

          <ModalInput label="Reason" placeholder="Why this activity was performed"
            value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />

          {zone === 'CLONE_ROOM' && (
            <>
              <ModalInput label="Strain ID (optional)" placeholder="e.g. AUR-22"
                value={form.strainId} onChange={e => setForm({ ...form, strainId: e.target.value })} />
              <ModalInput label="Batch No (optional)" placeholder="e.g. B-2026-012"
                value={form.batchNo} onChange={e => setForm({ ...form, batchNo: e.target.value })} />
              <ModalInput label="Number size / plants (optional)" placeholder="e.g. 120" type="number"
                value={form.numberSize} onChange={e => setForm({ ...form, numberSize: e.target.value })} />
            </>
          )}

          <ModalButton
            onClick={() => logMut.mutate()}
            disabled={logMut.isPending || !form.activityPerformed || !form.reason}
          >
            {logMut.isPending ? 'Logging…' : 'Log activity'}
          </ModalButton>
          <p className="text-[11px] text-white/30 text-center">
            Performed by <span className="text-white/50">{user?.name ?? 'you'}</span> · recorded in audit chain
          </p>
        </div>
      </Modal>
    </div>
  );
}
