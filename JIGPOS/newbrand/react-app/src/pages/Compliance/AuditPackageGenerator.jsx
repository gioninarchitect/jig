// P26 — Audit Package Generator (one-click audit report for any date range)

import { useState } from 'react';
import api from '../../services/api';

export default function AuditPackageGenerator() {
  const [dateFrom, setDateFrom] = useState(getDefaultFrom());
  const [dateTo, setDateTo] = useState(getDefaultTo());
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/compliance/audit-package', {
        dateFrom,
        dateTo,
        includeTransactions: true,
        includeStocktakes: true,
        includeSection21: true,
        includeBatchTrace: true,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate audit package');
    }
    setGenerating(false);
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-500 font-bold uppercase">Generate Audit Report</div>

      {/* Date range picker */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jig-purple/30"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jig-purple/30"
          />
        </div>
      </div>

      {/* Quick range buttons */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'Last 7 days', days: 7 },
          { label: 'Last 30 days', days: 30 },
          { label: 'Last 90 days', days: 90 },
          { label: 'This month', days: 'month' },
          { label: 'Last quarter', days: 'quarter' },
        ].map(range => (
          <button
            key={range.label}
            onClick={() => {
              const to = new Date();
              const from = new Date();
              if (range.days === 'month') {
                from.setDate(1);
              } else if (range.days === 'quarter') {
                from.setMonth(from.getMonth() - 3);
              } else {
                from.setDate(from.getDate() - range.days);
              }
              setDateFrom(formatDateInput(from));
              setDateTo(formatDateInput(to));
            }}
            className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Included sections */}
      <div className="p-3 rounded-lg bg-jig-slate border border-jig-purple/10">
        <div className="text-[10px] text-gray-400 uppercase mb-2">Report Includes</div>
        <div className="grid grid-cols-2 gap-1 text-xs text-white">
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-jig-purple" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            All POS transactions
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-jig-purple" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Stocktake reports
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-jig-purple" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Section 21 records
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-jig-purple" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Batch traceability
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-jig-purple" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Compliance blocks/passes
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-jig-purple" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Purchase limit records
          </div>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full py-3 rounded-lg bg-jig-purple text-white font-bold text-sm hover:bg-jig-purple-dark transition-colors disabled:opacity-50"
      >
        {generating ? 'Generating Audit Package...' : 'Generate Audit Package'}
      </button>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-jig-red/5 border border-jig-red/20 text-xs text-jig-red">{error}</div>
      )}

      {/* Result */}
      {result && (
        <div className="p-4 rounded-lg bg-jig-purple/5 border border-jig-purple/20">
          <div className="text-xs text-jig-purple font-bold mb-2">Audit Package Ready</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {result.transactionCount != null && (
              <div><span className="text-gray-400">Transactions: </span><span className="font-bold text-white">{result.transactionCount}</span></div>
            )}
            {result.stocktakeCount != null && (
              <div><span className="text-gray-400">Stocktakes: </span><span className="font-bold text-white">{result.stocktakeCount}</span></div>
            )}
            {result.section21Count != null && (
              <div><span className="text-gray-400">Section 21 Records: </span><span className="font-bold text-white">{result.section21Count}</span></div>
            )}
            {result.batchCount != null && (
              <div><span className="text-gray-400">Batches Traced: </span><span className="font-bold text-white">{result.batchCount}</span></div>
            )}
          </div>
          {result.downloadUrl && (
            <a
              href={result.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 py-2 rounded-lg bg-jig-purple text-white text-xs font-bold text-center hover:bg-jig-purple-dark transition-colors"
            >
              Download PDF
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function getDefaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return formatDateInput(d);
}

function getDefaultTo() {
  return formatDateInput(new Date());
}

function formatDateInput(date) {
  return date.toISOString().split('T')[0];
}
