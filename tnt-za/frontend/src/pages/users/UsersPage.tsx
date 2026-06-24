import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonTable } from '../../components/Skeleton';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { Plus, Shield, UserX } from 'lucide-react';
import { roleLabel } from '../../utils/roleLabel';
import api from '../../services/api';

const ROLES = [
  'RESPONSIBLE_PHARMACIST',
  'FACILITY_MANAGER', 'PROCESSING_MANAGER', 'FACILITY_SUPERVISOR', 'QA_INSPECTOR',
  'MAINTENANCE_MANAGER', 'HEAD_OF_CULTIVATION', 'NURSERY_MANAGER',
  'CULTIVATOR', 'LAB_TECH', 'IRRIGATION_TECH',
  'SECURITY_OFFICER', 'TRIMMER', 'GENERAL_WORKER', 'HOUSEKEEPING', 'LAUNDRY',
  'TENANT_ADMIN', 'VIEWER',
];
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-500/20 text-purple-400', TENANT_ADMIN: 'bg-blue-500/20 text-blue-400',
  FACILITY_MANAGER: 'bg-primary/20 text-primary', PROCESSING_MANAGER: 'bg-primary/20 text-primary',
  FACILITY_SUPERVISOR: 'bg-primary/20 text-primary', QA_INSPECTOR: 'bg-cyan-500/20 text-cyan-400',
  CULTIVATOR: 'bg-[#22C55E]/20 text-[#22C55E]', LAB_TECH: 'bg-amber-500/20 text-amber-400',
  IRRIGATION_TECH: 'bg-blue-500/20 text-blue-400',
  SECURITY_OFFICER: 'bg-red-500/20 text-red-400', TRIMMER: 'bg-[#22C55E]/20 text-[#22C55E]',
  RESPONSIBLE_PHARMACIST: 'bg-rose-500/20 text-rose-400',
  MAINTENANCE_MANAGER: 'bg-orange-500/20 text-orange-400',
  HEAD_OF_CULTIVATION: 'bg-lime-500/20 text-lime-400',
  NURSERY_MANAGER: 'bg-teal-500/20 text-teal-400',
  GENERAL_WORKER: 'bg-white/10 text-white/50',
  HOUSEKEEPING: 'bg-pink-500/20 text-pink-400', LAUNDRY: 'bg-violet-500/20 text-violet-400',
  VIEWER: 'bg-white/10 text-white/50',
};

export default function UsersPage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'CULTIVATOR' });
  const [createdPin, setCreatedPin] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data.users) });

  const createMut = useMutation({
    mutationFn: () => api.post('/users', newUser),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['users'] }); setCreatedPin(res.data.pin); addToast('success', `${newUser.name} invited`); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); addToast('success', 'User deactivated'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        {hasMinLevel(4) && (
          <button onClick={() => { setShowCreate(true); setCreatedPin(null); setNewUser({ name: '', email: '', role: 'CULTIVATOR' }); }}
            className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition">
            <Plus size={16} /> Invite User
          </button>
        )}
      </div>
      {isLoading ? <SkeletonTable rows={5} /> : !data?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center text-white/40">No users found</div>
      ) : (
        <div className="space-y-2">
          {data.map((u: any) => (
            <div key={u.id} className={`bg-white/5 border rounded-xl p-4 flex items-center gap-4 flex-wrap ${u.active ? 'border-white/10' : 'border-red-500/20 opacity-50'}`}>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">{u.name?.charAt(0) || '?'}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{u.name}</div>
                <div className="text-xs text-white/40 font-mono">{u.email}</div>
              </div>
              {hasMinLevel(3) && u.active && u.role !== 'SUPER_ADMIN' && u.role !== 'TENANT_ADMIN' ? (
                <select value={u.role} onChange={e => {
                  const newRole = e.target.value;
                  api.patch(`/users/${u.id}`, { role: newRole }).then(() => {
                    qc.invalidateQueries({ queryKey: ['users'] });
                    addToast('success', `${u.name} → ${newRole.replace(/_/g, ' ')}`);
                  });
                }}
                  className="text-xs px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 min-h-[32px]">
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              ) : (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-white/10 text-white/50'}`}>{roleLabel(u.role)}</span>
              )}
              {!u.active && <span className="text-xs text-red-400">Deactivated</span>}
              {hasMinLevel(5) && u.active && u.role !== 'SUPER_ADMIN' && (
                <button onClick={() => deactivateMut.mutate(u.id)} className="p-2 text-white/20 hover:text-red-400 transition" title="Deactivate"><UserX size={16} /></button>
              )}
            </div>
          ))}
        </div>
      )}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Invite Team Member">
        {createdPin ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3"><Shield size={24} className="text-primary" /></div>
            <p className="text-white font-semibold mb-1">{newUser.name} invited!</p>
            <p className="text-white/40 text-sm mb-4">Their login PIN:</p>
            <div className="text-3xl font-bold font-mono text-primary tracking-[0.3em] mb-4">{createdPin}</div>
            <p className="text-xs text-white/30">Share this PIN securely. They log in with their email + this PIN.</p>
            <ModalButton onClick={() => setShowCreate(false)}>Done</ModalButton>
          </div>
        ) : (
          <>
            <ModalInput label="Name" placeholder="e.g. Johan" value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: (e.target as HTMLInputElement).value }))} />
            <ModalInput label="Email" type="email" placeholder="e.g. johan@cleva-ai.co.za" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: (e.target as HTMLInputElement).value }))} />
            <ModalSelect label="Role" value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: (e.target as HTMLSelectElement).value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </ModalSelect>
            <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!newUser.name || !newUser.email}>Invite & Generate PIN</ModalButton>
          </>
        )}
      </Modal>
    </div>
  );
}
