// P26 — Compliance Dashboard (audit readiness score, status overview)
// Feature-gated: config.features.complianceCascade.enabled

import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useWorldModelConfig } from '../../world-model/WorldModelContext';
import Badge from '../../components/ui/Badge';
import { categorizeDocuments, calculateAuditReadiness } from '../../world-model/engines/compliance-cascade';
import DocumentTracker from './DocumentTracker';
import AuditPackageGenerator from './AuditPackageGenerator';
import ComplianceTimeline from './ComplianceTimeline';

export default function ComplianceDashboard() {
  const config = useWorldModelConfig();
  const [documents, setDocuments] = useState([]);
  const [section21Status, setSection21Status] = useState(null);
  const [approachingLimits, setApproachingLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const enabled = config?.features?.complianceCascade?.enabled;

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    async function load() {
      try {
        const [docsRes, s21Res, limitsRes] = await Promise.allSettled([
          api.get('/section21/admin/expiring'),
          api.get('/compliance/section21/status').catch(() => api.get('/section21/status')),
          api.get('/purchase-limits/approaching-limits'),
        ]);
        setDocuments(docsRes.status === 'fulfilled' ? (docsRes.value.data?.documents || docsRes.value.data?.data || []) : []);
        setSection21Status(s21Res.status === 'fulfilled' ? (s21Res.value.data || null) : null);
        setApproachingLimits(limitsRes.status === 'fulfilled' ? (limitsRes.value.data?.patients || limitsRes.value.data?.data || []) : []);
      } catch {
        // Silent — empty state
      }
      setLoading(false);
    }
    load();
  }, [enabled]);

  const docCategories = useMemo(() => categorizeDocuments(documents), [documents]);

  const auditScore = useMemo(() => calculateAuditReadiness({
    expiredDocuments: docCategories.expired,
    pendingReviews: documents.filter(d => d.status === 'pending'),
    missingRequired: [],
    recentBlockedSales: 0,
  }), [documents, docCategories]);

  if (!enabled) {
    return (
      <div className="text-center py-12">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div className="text-sm text-gray-400">Compliance Cascade is disabled</div>
        <div className="text-xs text-gray-300 mt-1">Enable in Super Admin Config</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-jig-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'documents', label: 'Documents', count: docCategories.expired.length + docCategories.critical.length },
    { key: 'audit', label: 'Audit Package' },
    { key: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="space-y-4">
      {/* Audit readiness score */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-lg bg-jig-slate border border-jig-purple/20 text-center col-span-2 sm:col-span-1">
          <div className="text-xs text-gray-400">Audit Readiness</div>
          <div className={`font-heading text-3xl ${
            auditScore >= 80 ? 'text-jig-purple' :
            auditScore >= 60 ? 'text-jig-amber-dark' :
            'text-jig-red'
          }`}>
            {auditScore}%
          </div>
          <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                auditScore >= 80 ? 'bg-jig-purple' :
                auditScore >= 60 ? 'bg-jig-amber' :
                'bg-jig-red'
              }`}
              style={{ width: `${auditScore}%` }}
            />
          </div>
        </div>
        <div className="p-3 rounded-lg bg-jig-red/5 border border-jig-red/20 text-center">
          <div className="text-xs text-jig-red">Expired</div>
          <div className="font-heading text-xl text-jig-red">{docCategories.expired.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-jig-amber/5 border border-jig-amber/20 text-center">
          <div className="text-xs text-jig-amber-dark">Critical</div>
          <div className="font-heading text-xl text-jig-amber-dark">{docCategories.critical.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-jig-amber/5 border border-jig-amber/20 text-center">
          <div className="text-xs text-jig-amber-dark">Near Limit</div>
          <div className="font-heading text-xl text-jig-amber-dark">{approachingLimits.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-jig-purple/5 border border-jig-purple/20 text-center">
          <div className="text-xs text-jig-purple">Valid</div>
          <div className="font-heading text-xl text-jig-purple">{docCategories.ok.length}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded text-xs font-bold uppercase transition-colors ${
              tab === t.key ? 'bg-white text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-jig-red/10 text-jig-red text-[10px]">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'overview' && (
        <OverviewPanel
          docCategories={docCategories}
          section21Status={section21Status}
          approachingLimits={approachingLimits}
        />
      )}

      {tab === 'documents' && (
        <DocumentTracker documents={documents} categories={docCategories} />
      )}

      {tab === 'audit' && (
        <AuditPackageGenerator />
      )}

      {tab === 'timeline' && (
        <ComplianceTimeline />
      )}
    </div>
  );
}

// ─── Overview Panel ─────────────────────────────────────────────

function OverviewPanel({ docCategories, section21Status, approachingLimits }) {
  return (
    <div className="space-y-4">
      {/* Section 21 status */}
      {section21Status && (
        <div className="p-4 rounded-lg border border-jig-purple/20 bg-jig-slate">
          <div className="text-xs text-gray-500 font-bold uppercase mb-2">Section 21 Status</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-gray-400">Compliant</div>
              <div className="font-heading text-lg text-jig-purple">{section21Status.compliant || 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Pending</div>
              <div className="font-heading text-lg text-jig-amber-dark">{section21Status.pending || 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Expired</div>
              <div className="font-heading text-lg text-jig-red">{section21Status.expired || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Expired documents */}
      {docCategories.expired.length > 0 && (
        <div>
          <div className="text-xs text-jig-red font-bold uppercase mb-2">Expired Documents</div>
          {docCategories.expired.slice(0, 5).map((doc, i) => (
            <div key={i} className="p-3 rounded-lg border border-jig-red/20 bg-jig-red/5 mb-1">
              <div className="flex items-center justify-between">
                <div>
                  <Badge status="error">Expired</Badge>
                  <span className="text-xs text-white ml-2">{doc.name || doc.documentType || 'Document'}</span>
                </div>
                <span className="text-xs text-jig-red font-bold">{doc.daysExpired}d ago</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approaching limits */}
      {approachingLimits.length > 0 && (
        <div>
          <div className="text-xs text-jig-amber-dark font-bold uppercase mb-2">Patients Approaching Limits</div>
          {approachingLimits.slice(0, 5).map((patient, i) => (
            <div key={i} className="p-3 rounded-lg border border-jig-amber/20 bg-jig-amber/5 mb-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white">{patient.name || patient.firstName || `Patient #${(patient._id || '').slice(-6)}`}</span>
                <span className="text-xs text-jig-amber-dark font-bold">
                  {patient.usedPercent || Math.round((patient.dailyUsed / patient.dailyLimit) * 100)}% of limit
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {docCategories.expired.length === 0 && approachingLimits.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">All compliance checks passing</div>
      )}
    </div>
  );
}
