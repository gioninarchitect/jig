import { ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#0D0D0D] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto z-10 pb-[env(safe-area-inset-bottom)]">
        <div className="sticky top-0 bg-[#0D0D0D] flex items-center justify-between p-4 border-b border-white/10 z-10">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-white/40 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={20} /></button>
        </div>
        <div className="p-4 pb-8">{children}</div>
      </div>
    </div>
  );
}

export function ModalInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-4">
      <label className="block text-sm text-white/50 mb-1.5">{label}</label>
      <input {...props} className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white text-base focus:border-primary focus:outline-none" />
    </div>
  );
}

export function ModalSelect({ label, children, ...props }: { label: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="mb-4">
      <label className="block text-sm text-white/50 mb-1.5">{label}</label>
      <select {...props} className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white text-base focus:border-primary focus:outline-none">
        {children}
      </select>
    </div>
  );
}

export function ModalButton({ children, loading, ...props }: { loading?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} disabled={loading || props.disabled}
      className="w-full py-3.5 bg-primary hover:bg-primary-light text-white rounded-xl font-semibold transition disabled:opacity-40 mt-4 min-h-[48px] text-base">
      {loading ? 'Processing...' : children}
    </button>
  );
}
