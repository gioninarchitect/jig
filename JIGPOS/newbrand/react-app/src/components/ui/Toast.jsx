import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const icons = {
  success: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const bgColors = {
  success: 'bg-jig-purple',
  error: 'bg-jig-red-dark',
  warning: 'bg-[#7A6520]',
  info: 'bg-jig-slate',
};

const borderColors = {
  success: 'border-l-jig-amber',
  error: 'border-l-jig-red',
  warning: 'border-l-jig-amber',
  info: 'border-l-jig-purple',
};

// Single toast item
function ToastItem({ id, title, message, type = 'info', onDismiss }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div
      className={`
        ${bgColors[type]} text-gray-100 border-l-4 ${borderColors[type]}
        px-4 py-3 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.3)]
        min-w-[280px] max-w-[420px] font-body
        ${exiting ? 'animate-[toastOut_0.3s_ease-in_forwards]' : 'animate-[toastIn_0.3s_ease-out]'}
      `}
    >
      <div className="flex items-start gap-3">
        {icons[type]}
        <div className="flex-1 min-w-0">
          {title && <div className="font-bold text-sm mb-0.5">{title}</div>}
          <div className="text-sm whitespace-pre-line">{message}</div>
        </div>
        <button
          onClick={() => {
            setExiting(true);
            setTimeout(() => onDismiss(id), 300);
          }}
          className="shrink-0 text-lg leading-none opacity-80 hover:opacity-100"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

// Toast context + provider
const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', title = '') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, title }]);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* Toast container — fixed top-right */}
      <div className="fixed top-5 right-5 z-[200000] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem {...t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
