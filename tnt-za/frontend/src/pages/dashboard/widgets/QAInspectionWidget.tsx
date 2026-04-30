import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardCheck, ArrowRight, CheckCircle, XCircle, FileText, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';

export default function QAInspectionWidget() {
  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/batches').then(r => r.data.batches),
  });

  const { data: deviations } = useQuery({
    queryKey: ['deviations'],
    queryFn: () => api.get('/qms/deviations?open=true').then(r => r.data.deviations),
  });

  const { data: sops } = useQuery({
    queryKey: ['sops'],
    queryFn: () => api.get('/qms/sops').then(r => r.data.sops),
  });

  const quarantined = batches?.filter((b: any) => b.status === 'QUARANTINED') || [];
  const pendingCOA = batches?.filter((b: any) => {
    const tested = b._count?.labResults || 0;
    return tested >= 8 && !b.coas?.length;
  }) || [];
  const openDevCount = deviations?.length || 0;
  const sopCount = sops?.length || 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white/60">QA Overview</h2>
        </div>
        <Link to="/qms" className="text-xs text-primary flex items-center gap-1 hover:text-primary-light">
          QMS <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className={`rounded-lg p-3 border ${quarantined.length > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.03] border-white/5'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <XCircle size={12} className={quarantined.length > 0 ? 'text-red-400' : 'text-white/30'} />
            <span className="text-[11px] text-white/40">Quarantined</span>
          </div>
          <div className={`text-xl font-bold font-mono ${quarantined.length > 0 ? 'text-red-400' : 'text-white'}`}>{quarantined.length}</div>
        </div>
        <div className={`rounded-lg p-3 border ${pendingCOA.length > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/[0.03] border-white/5'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <FileText size={12} className={pendingCOA.length > 0 ? 'text-amber-400' : 'text-white/30'} />
            <span className="text-[11px] text-white/40">COA Pending</span>
          </div>
          <div className={`text-xl font-bold font-mono ${pendingCOA.length > 0 ? 'text-amber-400' : 'text-white'}`}>{pendingCOA.length}</div>
        </div>
        <div className={`rounded-lg p-3 border ${openDevCount > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/[0.03] border-white/5'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} className={openDevCount > 0 ? 'text-amber-400' : 'text-white/30'} />
            <span className="text-[11px] text-white/40">Open Deviations</span>
          </div>
          <div className={`text-xl font-bold font-mono ${openDevCount > 0 ? 'text-amber-400' : 'text-white'}`}>{openDevCount}</div>
        </div>
        <div className="rounded-lg p-3 border bg-white/[0.03] border-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle size={12} className="text-white/30" />
            <span className="text-[11px] text-white/40">Active SOPs</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">{sopCount}</div>
        </div>
      </div>

      {/* Quarantined batches list */}
      {quarantined.length > 0 && (
        <div className="pt-3 border-t border-white/5">
          <h3 className="text-xs font-semibold text-red-400 mb-1.5">Quarantined — Requires Action</h3>
          {quarantined.map((b: any) => (
            <Link key={b.id} to="/batches" className="flex items-center justify-between py-1.5 hover:bg-white/5 -mx-1 px-1 rounded transition">
              <span className="font-mono text-sm text-red-300">{b.batchNumber}</span>
              <span className="text-xs text-white/30">{b.strain}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
