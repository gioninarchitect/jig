/**
 * PureGro Premium Cannabis Care - Admin Verifications Page
 *
 * Review queue for client compliance documents.
 * Approve or reject with notes. Auto-activates clients when all required docs approved.
 */

import { useState, useEffect } from 'react';
import { verification as verificationApi, type ClientDocumentData } from '../../api';

const DOC_TYPE_LABELS: Record<string, string> = {
  cipc_registration: 'CIPC Registration',
  tax_clearance: 'Tax Clearance / VAT',
  cannabis_license: 'Cannabis License',
  id_document: 'Director ID',
  proof_of_address: 'Proof of Address',
  bank_confirmation: 'Bank Confirmation',
  bee_certificate: 'BEE Certificate',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-pg-gold/15 text-amber-400 border border-pg-gold/25',
  approved: 'bg-puregro-green/15 text-green-400 border border-puregro-green/25',
  rejected: 'bg-red-500/15 text-red-400 border border-red-500/25',
};

function formatDate(ts: number | string | undefined): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminVerificationsPage() {
  const [pendingDocs, setPendingDocs] = useState<ClientDocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<ClientDocumentData | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { documents } = await verificationApi.pending();
      setPendingDocs(documents);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!reviewModal) return;
    setActionLoading(reviewModal.id);
    try {
      await verificationApi.review(reviewModal.id, status, adminNotes || undefined);
      setReviewModal(null);
      setAdminNotes('');
      fetchPending();
    } catch {
      // Silent fail
    }
    setActionLoading(null);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-pg-white">
          Verifications
        </h1>
        {pendingDocs.length > 0 && (
          <span className="rounded bg-pg-gold/15 px-3 py-1 text-xs font-semibold text-amber-400 border border-pg-gold/25">
            {pendingDocs.length} pending review
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-pg-gray-700 border-t-pg-green" />
        </div>
      ) : pendingDocs.length === 0 ? (
        <div className="rounded-lg border border-white/[0.06] bg-pg-dark p-8 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-puregro-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-sm text-pg-gray-500">No documents pending review.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/[0.06] bg-pg-dark">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-3 py-3 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Client</th>
                <th className="px-3 py-3 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Document</th>
                <th className="px-3 py-3 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">File</th>
                <th className="px-3 py-3 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Uploaded</th>
                <th className="px-3 py-3 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Status</th>
                <th className="px-3 py-3 text-right font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {pendingDocs.map((doc) => (
                <tr key={doc.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-3 py-3">
                    <p className="font-medium text-pg-white">{doc.clientName}</p>
                    <p className="text-[10px] text-puregro-gray-600">{doc.clientEmail}</p>
                  </td>
                  <td className="px-3 py-3 text-pg-gray-300">
                    {DOC_TYPE_LABELS[doc.docType] || doc.docType}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs text-puregro-gray-400">{doc.fileName}</p>
                    <p className="text-[10px] text-puregro-gray-600">{formatFileSize(doc.fileSize)}</p>
                  </td>
                  <td className="px-3 py-3 text-puregro-gray-400">
                    {formatDate(doc.uploadedAt)}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[doc.status]}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={doc.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-1 font-heading text-[9px] font-semibold uppercase tracking-wider text-puregro-gray-400 transition-all hover:bg-white/[0.08]"
                      >
                        View
                      </a>
                      <button
                        onClick={() => { setReviewModal(doc); setAdminNotes(''); }}
                        className="rounded border border-pg-green/25 bg-pg-green/15 px-2 py-1 font-heading text-[9px] font-semibold uppercase tracking-wider text-pg-green-light transition-all hover:bg-pg-green/25"
                      >
                        Review
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-lg border border-white/[0.1] bg-pg-dark p-6">
            <h3 className="mb-4 font-heading text-lg font-bold uppercase tracking-wide text-pg-white">
              Review Document
            </h3>

            <div className="mb-4 rounded border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-sm text-pg-gray-300">
                Client: <span className="font-medium text-pg-white">{reviewModal.clientName}</span>
              </p>
              <p className="text-sm text-pg-gray-300">
                Document: <span className="font-medium text-pg-white">{DOC_TYPE_LABELS[reviewModal.docType] || reviewModal.docType}</span>
              </p>
              <p className="mt-1 text-xs text-pg-gray-500">
                {reviewModal.fileName} ({formatFileSize(reviewModal.fileSize)}) - Uploaded {formatDate(reviewModal.uploadedAt)}
              </p>
            </div>

            {/* File preview */}
            <div className="mb-4">
              {reviewModal.mimeType.startsWith('image/') ? (
                <img
                  src={reviewModal.filePath}
                  alt="Document"
                  className="max-h-64 w-full rounded border border-white/[0.06] object-contain"
                />
              ) : (
                <a
                  href={reviewModal.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded border border-white/[0.06] bg-white/[0.02] p-4 text-center text-sm text-pg-green-light hover:underline"
                >
                  Open PDF in new tab
                </a>
              )}
            </div>

            <div className="mb-4">
              <label className="mb-1 block font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                Admin Notes (optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                className="w-full rounded border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-pg-gray-300 outline-none placeholder:text-puregro-gray-600 focus:border-pg-green/50"
                placeholder="e.g. Document verified, details match"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReviewModal(null)}
                className="rounded border border-white/[0.12] bg-white/[0.04] px-4 py-2 font-heading text-[11px] font-medium uppercase tracking-wider text-puregro-gray-400 hover:bg-white/[0.08]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview('rejected')}
                disabled={actionLoading === reviewModal.id}
                className="rounded border border-red-500/25 bg-red-500/15 px-4 py-2 font-heading text-[11px] font-medium uppercase tracking-wider text-red-400 hover:bg-red-500/25 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleReview('approved')}
                disabled={actionLoading === reviewModal.id}
                className="rounded border border-puregro-green/25 bg-puregro-green/15 px-4 py-2 font-heading text-[11px] font-medium uppercase tracking-wider text-green-400 hover:bg-puregro-green/25 disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
