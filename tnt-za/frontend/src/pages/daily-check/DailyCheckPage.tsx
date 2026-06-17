import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonCard } from '../../components/Skeleton';
import Modal, { ModalButton } from '../../components/Modal';
import SOPHeader from '../../components/SOPHeader';
import { FACILITY_ZONES, zoneFamily } from '../../constants/facilityZones';
import { ClipboardCheck, CheckCircle2, XCircle, Plus } from 'lucide-react';
import api from '../../services/api';

// =====================================================================
// Daily Zone Check Sheet — SOP 3-CUL-6 (Mother Bay) + 3-CUL-8 (Greenhouse)
// + equivalent for Clone Room
//
// Replaces the printed "Daily Check Sheet" forms. One page, one SOP per
// zone; item list configured per zone. Each submission is a single date-
// stamped record with every item marked pass/fail + notes.
// =====================================================================

type Zone = string;
// map a room's family → its check-config key
const FAMILY_KEY: Record<string, 'MOTHER_BAY' | 'CLONE_ROOM' | 'GREENHOUSE'> = { MOTHER: 'MOTHER_BAY', CLONE: 'CLONE_ROOM', GREENHOUSE: 'GREENHOUSE' };

const ZONE_CONFIG: Record<Zone, {
  label: string; sop: string; effective: string;
  items: string[];
}> = {
  MOTHER_BAY: {
    label: 'Mother Bay', sop: '3-CUL-6', effective: '17/10/2025',
    items: [
      'Check lights', 'Extraction fans', 'Oscillating fans', 'Feed lines',
      'Wet wall & filters', 'Heater fan', 'Tears on plastic', 'Plant bins',
      'Foot bath', 'PPE station', 'Drippers', 'Plants', 'Plant labels',
    ],
  },
  GREENHOUSE: {
    label: 'Greenhouse', sop: '3-CUL-8', effective: '17/10/2025',
    items: [
      'Check lights', 'Extraction fans', 'Oscillating fans', 'Feed lines',
      'Wet wall & filters', 'UV screens', 'Black-out screen', 'Tears on plastic',
      'Plant bins', 'Foot baths', 'PPE stations', 'Drippers', 'Plants',
    ],
  },
  CLONE_ROOM: {
    label: 'Clone Room', sop: '3-CUL-7', effective: '01/03/2026',
    items: [
      'Aircon units', 'Dehumidifiers', 'Lights / timers', 'Feed tray water level',
      'Clone domes intact', 'Trays labelled', 'PPE station', 'Foot bath',
      'Sanitizer dispensers', 'Tear-downs / waste bins',
    ],
  },
};

interface CheckRecord {
  id: string;
  date: string;
  zone: Zone;
  items: Record<string, 'PASS' | 'FAIL' | null>;
  notes?: string;
  doneBy: string;
  signedAt: string;
}

export default function DailyCheckPage() {
  const { hasMinLevel } = useRBAC();
  const user = useAuthStore(s => s.user);
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const canSubmit = hasMinLevel(1);

  const [zone, setZone] = useState<Zone>('GH1');
  const [showSubmit, setShowSubmit] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [itemStatus, setItemStatus] = useState<Record<string, 'PASS' | 'FAIL' | 'NA' | null>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const config = ZONE_CONFIG[FAMILY_KEY[zoneFamily(zone)]];

  const { data: records, isLoading } = useQuery<CheckRecord[]>({
    queryKey: ['daily-checks', zone],
    queryFn: () => api.get(`/daily-checks?zone=${zone}`).then(r => r.data.checks ?? []).catch(() => []),
  });

  const submitMut = useMutation({
    mutationFn: () => {
      const failNotes = config.items.filter(i => itemStatus[i] === 'FAIL' && itemNotes[i]).map(i => `${i}: ${itemNotes[i]}`).join(' · ');
      const combined = [notes.trim(), failNotes].filter(Boolean).join(' — ');
      return api.post('/daily-checks', { zone, items: itemStatus, itemNotes, notes: combined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-checks'] });
      addToast('success', `${config.label} daily check submitted`);
      setShowSubmit(false); setItemStatus({}); setItemNotes({}); setNotes('');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error ?? 'Failed to submit'),
  });

  const todaysCheck = useMemo(() => {
    const today = new Date().toDateString();
    return records?.find(r => new Date(r.date).toDateString() === today);
  }, [records]);

  const allItemsMarked = config.items.every(i => itemStatus[i]);
  const failsNeedNote = config.items.some(i => itemStatus[i] === 'FAIL' && !(itemNotes[i] || '').trim());
  const failures = Object.values(itemStatus).filter(v => v === 'FAIL').length;

  return (
    <div className="space-y-6">
      <SOPHeader
        sopNumber={config.sop}
        title={`${config.label} · Daily Check Sheet`}
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
            <ClipboardCheck className="text-amber-400" size={26} /> Daily Check Sheet
          </h1>
          <p className="text-sm text-white/40 mt-1">Walk the zone · tick each item · submit sign-off</p>
        </div>
        {canSubmit && !todaysCheck && (
          <button
            onClick={() => { setItemStatus({}); setShowSubmit(true); }}
            className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]"
          >
            <Plus size={16} /> Submit today's check
          </button>
        )}
        {todaysCheck && (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-green-500/15 border border-green-500/40 text-green-300 text-xs font-semibold">
            <CheckCircle2 size={14} /> Submitted today by {todaysCheck.doneBy}
          </span>
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

      {/* Records list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      ) : !records?.length ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <ClipboardCheck className="mx-auto text-white/30 mb-3" size={36} />
          <p className="text-white/60 text-sm">No {config.label.toLowerCase()} checks submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(r => {
            const fails = Object.values(r.items ?? {}).filter(v => v === 'FAIL').length;
            return (
              <div key={r.id} onClick={() => setDetailRecord(r)} className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-primary/40 transition cursor-pointer">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-semibold">{new Date(r.date).toLocaleDateString()}</span>
                      {fails === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/40 text-green-300 text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle2 size={10} /> All pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 text-[10px] font-bold uppercase tracking-wider">
                          <XCircle size={10} /> {fails} fail{fails === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50">Signed {r.doneBy} · {new Date(r.signedAt).toLocaleTimeString()}</p>
                    {r.notes && <p className="text-xs text-white/60 mt-1.5 italic">"{r.notes}"</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit modal */}
      {/* Record detail — drill into a past check's full item breakdown */}
      <Modal open={!!detailRecord} onClose={() => setDetailRecord(null)} title={detailRecord ? `${config.label} · ${new Date(detailRecord.date).toLocaleDateString()}` : ''}>
        {detailRecord && (
          <div className="space-y-1.5 text-sm">
            <p className="text-xs text-white/50 mb-2">Signed {detailRecord.doneBy || '—'} · {detailRecord.signedAt ? new Date(detailRecord.signedAt).toLocaleString() : ''}</p>
            {Object.entries(detailRecord.items || {}).map(([item, st]: any) => (
              <div key={item} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-white/80 text-xs flex-1">{item}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st === 'PASS' ? 'bg-green-500/20 text-green-300' : st === 'FAIL' ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white/50'}`}>{st === 'PASS' ? '✓ Done' : st === 'FAIL' ? '✗ Issue' : st === 'NA' ? 'N/A' : '—'}</span>
              </div>
            ))}
            {detailRecord.notes && <div className="mt-2 text-xs text-white/60 italic bg-white/5 rounded-lg p-2">"{detailRecord.notes}"</div>}
          </div>
        )}
      </Modal>

      <Modal open={showSubmit} onClose={() => setShowSubmit(false)} title={`${config.label} · Daily Check`}>
        <div className="space-y-2.5">
          <p className="text-xs text-white/50 mb-2">Walk the zone and mark each item.</p>
          {config.items.map(item => {
            const st = itemStatus[item];
            return (
              <div key={item} className={`rounded-lg border px-3.5 py-2.5 transition ${st === 'PASS' ? 'border-green-500/30 bg-green-500/5' : st === 'FAIL' ? 'border-red-500/40 bg-red-500/10' : st === 'NA' ? 'border-white/15 bg-white/[0.03]' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-white flex-1">{item}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => setItemStatus(s => ({ ...s, [item]: 'PASS' }))}
                      className={`px-2.5 h-9 rounded-lg text-[11px] font-bold transition ${st === 'PASS' ? 'bg-green-500/80 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>✓ Done</button>
                    <button onClick={() => setItemStatus(s => ({ ...s, [item]: 'FAIL' }))}
                      className={`px-2.5 h-9 rounded-lg text-[11px] font-bold transition ${st === 'FAIL' ? 'bg-red-500/80 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>✗ Issue</button>
                    <button onClick={() => setItemStatus(s => ({ ...s, [item]: 'NA' }))}
                      className={`px-2.5 h-9 rounded-lg text-[11px] font-bold transition ${st === 'NA' ? 'bg-white/30 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>N/A</button>
                  </div>
                </div>
                {st === 'FAIL' && (
                  <input autoFocus value={itemNotes[item] || ''} onChange={e => setItemNotes(n => ({ ...n, [item]: e.target.value }))}
                    placeholder="What's the issue? (required — raises a deviation)"
                    className="w-full mt-2 px-3 py-2 bg-dark border border-red-500/30 rounded-lg text-white text-xs focus:border-red-500 focus:outline-none" />
                )}
              </div>
            );
          })}
          <div className="pt-2">
            <label className="block text-sm text-white/50 mb-1.5">Notes</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any issues, remediation, follow-up…"
              className="w-full min-h-[80px] px-3.5 py-2.5 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {failures > 0 && (
            <p className="text-xs text-amber-300 pt-1">
              {failures} item{failures === 1 ? '' : 's'} failing — note remediation above.
            </p>
          )}

          <ModalButton
            onClick={() => submitMut.mutate()}
            disabled={submitMut.isPending || !allItemsMarked || failsNeedNote}
          >
            {submitMut.isPending ? 'Submitting…' : failsNeedNote ? 'Add a note on each Issue to submit' : allItemsMarked ? 'Submit & sign check' : `Mark all ${config.items.length} items to submit`}
          </ModalButton>
          <p className="text-[11px] text-white/30 text-center">
            Signed by <span className="text-white/50">{user?.name ?? 'you'}</span> · recorded in audit chain
          </p>
        </div>
      </Modal>
    </div>
  );
}
