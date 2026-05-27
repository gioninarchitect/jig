import { useState } from 'react';
import Button from './Button';

export default function ApprovalCard({ title, subtitle, meta, children, onApprove, onReject }) {
  const [reason, setReason] = useState('');
  const [showReason, setShowReason] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h4 className="font-heading text-lg text-white uppercase">{title}</h4>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        {children}
        {meta && (
          <div className="flex flex-wrap gap-3 mt-3">
            {meta.map((m, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Rejection reason input */}
      {showReason && (
        <div className="px-6 pb-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection..."
            rows={2}
            className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-origin-red resize-none font-body"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onApprove?.()}
        >
          Approve
        </Button>
        {showReason ? (
          <Button
            variant="danger"
            size="sm"
            onClick={() => onReject?.(reason)}
            disabled={!reason.trim()}
          >
            Confirm Reject
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReason(true)}
          >
            Reject
          </Button>
        )}
      </div>
    </div>
  );
}
