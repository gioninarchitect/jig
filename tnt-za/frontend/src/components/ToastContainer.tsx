import { useToastStore } from '../stores/toastStore';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: 'border-green-500/40 bg-green-500/10 text-green-300',
  error: 'border-red-500/40 bg-red-500/10 text-red-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  info: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-20 lg:bottom-4 right-4 left-4 sm:left-auto z-[100] space-y-2 max-w-sm">
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div key={t.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${COLORS[t.type]} animate-[fadeUp_0.3s_ease]`}>
            <Icon size={18} className="mt-0.5 flex-shrink-0" />
            <span className="text-sm flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="opacity-50 hover:opacity-100"><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}
