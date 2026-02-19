import { useEffect, useCallback } from 'react';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', full: 'max-w-4xl' };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Panel — centered on desktop, slide-up on mobile */}
      <div
        className={`
          relative bg-jig-slate rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.3)] w-[90%]
          ${widths[size]} animate-[modalSlide_0.25s_ease-out]
          max-h-[90vh] flex flex-col
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
            <h3 className="font-heading text-2xl text-white uppercase">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-jig-purple-dark hover:bg-jig-purple/10 transition-colors text-xl leading-none"
            >
              &times;
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-8 py-4 border-t border-gray-200">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
