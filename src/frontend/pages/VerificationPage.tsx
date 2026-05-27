/**
 * PureGro Premium Cannabis Care - Client Verification Page
 *
 * Checklist of required B2B compliance documents.
 * Clients upload docs here; status updates after admin review.
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth';
import { verification as verificationApi, type ClientDocumentData } from '../api';

const DOC_TYPES: {
  key: string;
  label: string;
  description: string;
  required: boolean;
  icon: string;
}[] = [
  {
    key: 'cipc_registration',
    label: 'CIPC Registration Certificate',
    description: 'Companies and Intellectual Property Commission registration',
    required: true,
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    key: 'tax_clearance',
    label: 'Tax Clearance / VAT Certificate',
    description: 'Valid SARS tax clearance or VAT registration certificate',
    required: true,
    icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z',
  },
  {
    key: 'id_document',
    label: 'Director / Owner ID Copy',
    description: 'Certified copy of the director or business owner ID',
    required: true,
    icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
  },
  {
    key: 'proof_of_address',
    label: 'Proof of Business Address',
    description: 'Utility bill, lease agreement, or municipal account (not older than 3 months)',
    required: true,
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    key: 'bank_confirmation',
    label: 'Bank Confirmation Letter',
    description: 'Official letter from your bank confirming account details',
    required: true,
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  },
  {
    key: 'cannabis_license',
    label: 'Cannabis License / SAHPRA Permit',
    description: 'Cannabis cultivation, manufacturing, or distribution license',
    required: false,
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
  {
    key: 'bee_certificate',
    label: 'BEE Certificate',
    description: 'Broad-Based Black Economic Empowerment certificate',
    required: false,
    icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-pg-gold/15 text-amber-400 border border-pg-gold/25',
  approved: 'bg-puregro-green/15 text-green-400 border border-puregro-green/25',
  rejected: 'bg-red-500/15 text-red-400 border border-red-500/25',
};

function formatDate(ts: number | undefined): string {
  if (!ts) return '';
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

export default function VerificationPage() {
  const { client } = useAuth();
  const [documents, setDocuments] = useState<ClientDocumentData[]>([]);
  const [allRequiredUploaded, setAllRequiredUploaded] = useState(false);
  const [allApproved, setAllApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadStatus = async () => {
    try {
      const result = await verificationApi.status();
      setDocuments(result.documents);
      setAllRequiredUploaded(result.allRequiredUploaded);
      setAllApproved(result.allApproved);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const getDocForType = (docType: string): ClientDocumentData | undefined =>
    documents.find((d) => d.docType === docType);

  const approvedCount = DOC_TYPES.filter((dt) => dt.required)
    .filter((dt) => getDocForType(dt.key)?.status === 'approved').length;

  const handleUpload = async (docType: string, file: File) => {
    setUploading(docType);
    try {
      await verificationApi.upload(file, docType);
      await loadStatus();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const triggerFileInput = (docType: string) => {
    fileInputRefs.current[docType]?.click();
  };

  const isVerified = client?.status === 'active' || allApproved;

  return (
    <div className="p-6">
      <h1 className="mb-2 font-heading text-2xl font-bold uppercase tracking-wide text-pg-white">
        Verification
      </h1>
      <p className="mb-6 text-sm text-pg-gray-500">
        Upload your compliance documents to verify your account and start placing orders.
      </p>

      {/* Status banner */}
      {isVerified ? (
        <div className="mb-6 rounded-lg border border-puregro-green/30 bg-puregro-green/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="font-heading text-sm font-semibold uppercase tracking-wide text-green-400">
                Account Verified
              </p>
              <p className="text-xs text-green-400/70">
                Your account is active. You can place orders from the catalog.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-pg-gold/30 bg-pg-gold/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-heading text-sm font-semibold uppercase tracking-wide text-amber-400">
                Verification Required
              </p>
              <p className="text-xs text-amber-400/70">
                Complete your verification to start placing orders. Upload all 5 required documents below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.12em] text-puregro-gray-400">
            Progress
          </span>
          <span className="text-sm font-medium text-pg-gray-300">
            {approvedCount} of 5 required documents verified
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-pg-gradient transition-all duration-500"
            style={{ width: `${(approvedCount / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Document checklist */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-pg-gray-700 border-t-pg-green" />
        </div>
      ) : (
        <div className="space-y-3">
          {DOC_TYPES.map((dt) => {
            const doc = getDocForType(dt.key);
            const isUploading = uploading === dt.key;

            return (
              <div
                key={dt.key}
                className="rounded-lg border border-white/[0.06] bg-pg-dark p-4 transition-all hover:border-white/[0.1]"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    doc?.status === 'approved'
                      ? 'bg-puregro-green/15 text-green-400'
                      : doc?.status === 'rejected'
                        ? 'bg-red-500/15 text-red-400'
                        : doc?.status === 'pending'
                          ? 'bg-pg-gold/15 text-amber-400'
                          : 'bg-white/[0.04] text-pg-gray-500'
                  }`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={dt.icon} />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-pg-white">{dt.label}</h3>
                      {!dt.required && (
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-heading text-[9px] font-medium uppercase tracking-wider text-pg-gray-500">
                          Optional
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-pg-gray-500">{dt.description}</p>

                    {/* Uploaded file info */}
                    {doc && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[doc.status]}`}>
                            {doc.status === 'pending' ? 'Pending Review' : doc.status}
                          </span>
                          <span className="text-xs text-puregro-gray-600">
                            {doc.fileName} ({formatFileSize(doc.fileSize)})
                          </span>
                          <span className="text-xs text-puregro-gray-600">
                            {formatDate(doc.uploadedAt)}
                          </span>
                        </div>

                        {/* Admin notes for rejected docs */}
                        {doc.status === 'rejected' && doc.adminNotes && (
                          <div className="mt-2 rounded border border-red-500/20 bg-red-500/5 px-3 py-2">
                            <p className="text-xs text-red-400">
                              <span className="font-semibold">Reason:</span> {doc.adminNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Upload button */}
                  <div className="shrink-0">
                    <input
                      ref={(el) => { fileInputRefs.current[dt.key] = el; }}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(dt.key, file);
                        e.target.value = '';
                      }}
                    />
                    {doc?.status === 'approved' ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-puregro-green/15">
                        <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <button
                        onClick={() => triggerFileInput(dt.key)}
                        disabled={isUploading}
                        className={`rounded px-3 py-1.5 font-heading text-[11px] font-semibold uppercase tracking-wider transition-all disabled:opacity-50 ${
                          doc?.status === 'rejected'
                            ? 'border border-red-500/25 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : doc?.status === 'pending'
                              ? 'border border-white/[0.12] bg-white/[0.04] text-puregro-gray-400 hover:bg-white/[0.08]'
                              : 'bg-pg-green text-pg-white hover:bg-pg-green-light'
                        }`}
                      >
                        {isUploading
                          ? 'Uploading...'
                          : doc?.status === 'rejected'
                            ? 'Re-upload'
                            : doc?.status === 'pending'
                              ? 'Replace'
                              : 'Upload'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* File requirements note */}
      <div className="mt-6 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.12em] text-pg-gray-500">
          File Requirements
        </p>
        <p className="mt-1 text-xs text-pg-gray-500">
          Accepted formats: JPEG, PNG, WebP, PDF. Maximum file size: 10MB per document.
        </p>
      </div>
    </div>
  );
}
