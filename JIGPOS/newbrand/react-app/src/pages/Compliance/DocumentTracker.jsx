// P26 — Document Tracker (expiry tracking: CoAs, prescriptions, licenses)

import { useState } from 'react';
import Badge from '../../components/ui/Badge';

const DOC_TYPE_LABELS = {
  authorization_letter: 'Authorization Letter',
  prescription: 'Prescription',
  coa: 'Certificate of Analysis',
  license: 'License',
  permit: 'Permit',
};

export default function DocumentTracker({ documents, categories }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? documents :
    filter === 'expired' ? categories.expired :
    filter === 'critical' ? categories.critical :
    filter === 'warning' ? categories.warning :
    categories.ok;

  const counts = {
    all: documents?.length || 0,
    expired: categories?.expired?.length || 0,
    critical: categories?.critical?.length || 0,
    warning: categories?.warning?.length || 0,
    ok: categories?.ok?.length || 0,
  };

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex gap-1 flex-wrap">
        {[
          { key: 'all', label: 'All' },
          { key: 'expired', label: 'Expired' },
          { key: 'critical', label: 'Critical (<7d)' },
          { key: 'warning', label: 'Warning (<30d)' },
          { key: 'ok', label: 'Valid' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              filter === f.key ? 'bg-jig-purple text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {/* Document list */}
      {(filtered || []).length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No documents in this category</div>
      ) : (
        <div className="space-y-2">
          {(filtered || []).map((doc, i) => {
            const isExpired = doc.daysExpired > 0;
            const isCritical = doc.daysUntilExpiry != null && doc.daysUntilExpiry <= 7;
            const isWarning = doc.daysUntilExpiry != null && doc.daysUntilExpiry <= 30;
            const typeName = DOC_TYPE_LABELS[doc.documentType] || doc.documentType || 'Document';

            return (
              <div key={doc._id || i} className={`p-3 rounded-lg border ${
                isExpired ? 'border-jig-red/20 bg-jig-red/5' :
                isCritical ? 'border-jig-red/20 bg-jig-red/5' :
                isWarning ? 'border-jig-amber/20 bg-jig-amber/5' :
                'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge status={
                      isExpired ? 'error' :
                      isCritical ? 'error' :
                      isWarning ? 'warning' :
                      'active'
                    }>
                      {isExpired ? 'Expired' : isCritical ? 'Critical' : isWarning ? 'Expiring' : 'Valid'}
                    </Badge>
                    <div>
                      <div className="text-xs font-semibold text-white">{typeName}</div>
                      {doc.name && <div className="text-[10px] text-gray-400">{doc.name}</div>}
                      {doc.prescriptionNumber && <div className="text-[10px] text-gray-400">Rx: {doc.prescriptionNumber}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    {isExpired ? (
                      <div className="text-xs text-jig-red font-bold">{doc.daysExpired}d expired</div>
                    ) : doc.daysUntilExpiry != null ? (
                      <div className={`text-xs font-bold ${
                        doc.daysUntilExpiry <= 7 ? 'text-jig-red' :
                        doc.daysUntilExpiry <= 30 ? 'text-jig-amber-dark' :
                        'text-jig-purple'
                      }`}>{doc.daysUntilExpiry}d left</div>
                    ) : null}
                    {doc.expiryDate && (
                      <div className="text-[10px] text-gray-400">
                        {new Date(doc.expiryDate).toLocaleDateString('en-ZA')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Patient/owner info */}
                {(doc.patientName || doc.prescribedBy) && (
                  <div className="mt-1 text-[10px] text-gray-400">
                    {doc.patientName && <span>Patient: {doc.patientName}</span>}
                    {doc.prescribedBy && <span className="ml-2">Prescribed by: {doc.prescribedBy}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
