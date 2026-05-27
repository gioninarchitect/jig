/**
 * PureGro Premium Cannabis Care - Invoice Page
 *
 * Print-optimized branded invoice with company details, line items,
 * VAT breakdown, and EFT banking details.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orders as ordersApi, type InvoiceData } from '../api';

function formatDate(d: string | number | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatRand(n: number | undefined | null): string {
  const v = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
  return `R ${v.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    ordersApi
      .invoiceData(id)
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-pg-gray-700 border-t-pg-green" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-sm text-pg-gray-500">Invoice not found.</p>
      </div>
    );
  }

  const { order, client, company, banking } = data;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page {
            background: white !important;
            color: #1a1a1a !important;
            padding: 20px !important;
            margin: 0 !important;
            max-width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .print-page * {
            color: #1a1a1a !important;
            border-color: #ddd !important;
          }
          .invoice-header {
            background: #f8f9fa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-accent { color: #6b21a8 !important; }
          .invoice-total {
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-logo {
            filter: brightness(0) !important;
          }
          .print-wrapper {
            padding: 0 !important;
          }
        }
      `}</style>

      <div className="print-wrapper p-6">
        {/* Action bar (hidden in print) */}
        <div className="no-print mb-4 flex items-center gap-3">
          <Link to={`/orders/${order.id}`} className="text-xs text-pg-green hover:underline">
            &larr; Back to Order
          </Link>
          <button
            onClick={() => window.print()}
            className="rounded border border-pg-green/25 bg-pg-green/15 px-4 py-2 font-heading text-[11px] font-medium uppercase tracking-wider text-pg-green-light transition-all hover:bg-pg-green/25"
          >
            Print / Download PDF
          </button>
        </div>

        {/* Invoice */}
        <div className="print-page mx-auto max-w-3xl rounded-lg border border-white/[0.06] bg-pg-dark p-8">
          {/* Header */}
          <div className="invoice-header mb-8 flex items-start justify-between rounded-lg bg-white/[0.04] p-6">
            <div>
              <img src="/logo.png" alt="PureGro Premium Cannabis Care" className="invoice-logo h-14 w-auto" />
              <p className="mt-2 text-sm text-puregro-gray-400">{company.name}</p>
              {company.registration && (
                <p className="text-xs text-pg-gray-500">Reg: {company.registration}</p>
              )}
              {company.vat && (
                <p className="text-xs text-pg-gray-500">VAT: {company.vat}</p>
              )}
              <p className="text-xs text-pg-gray-500">{company.address}</p>
              {company.email && <p className="text-xs text-pg-gray-500">{company.email}</p>}
              {company.phone && <p className="text-xs text-pg-gray-500">{company.phone}</p>}
            </div>
            <div className="text-right">
              <h2 className="invoice-accent font-heading text-xl font-bold uppercase tracking-wider text-pg-green-light">
                Tax Invoice
              </h2>
              <p className="mt-2 text-sm text-pg-gray-300">
                {order.invoiceNumber || 'Pending'}
              </p>
              <p className="text-xs text-pg-gray-500">
                Date: {formatDate(order.confirmedAt || order.createdAt)}
              </p>
              {order.poNumber && (
                <p className="text-xs text-pg-gray-500">PO: {order.poNumber}</p>
              )}
              <p className="text-xs text-pg-gray-500">Order: {order.id}</p>
            </div>
          </div>

          {/* Bill To */}
          {client && (
            <div className="mb-8">
              <h3 className="mb-2 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                Bill To
              </h3>
              <div className="rounded border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-sm font-medium text-pg-white">{client.companyName}</p>
                {client.tradingName && client.tradingName !== client.companyName && (
                  <p className="text-xs text-puregro-gray-400">t/a {client.tradingName}</p>
                )}
                {client.vatNumber && <p className="text-xs text-pg-gray-500">VAT: {client.vatNumber}</p>}
                <p className="mt-1 text-xs text-puregro-gray-400">{client.contactPerson}</p>
                <p className="text-xs text-puregro-gray-400">{client.email}</p>
                <p className="text-xs text-puregro-gray-400">{client.phone}</p>
                <p className="mt-1 text-xs text-pg-gray-500">
                  {client.address.street}, {client.address.city}
                </p>
                <p className="text-xs text-pg-gray-500">
                  {client.address.province}, {client.address.postalCode}
                </p>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-white/[0.12]">
                  <th className="pb-2 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">#</th>
                  <th className="pb-2 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Description</th>
                  <th className="pb-2 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">SKU</th>
                  <th className="pb-2 text-right font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Qty</th>
                  <th className="pb-2 text-right font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Unit Price</th>
                  <th className="pb-2 text-right font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2 text-pg-gray-500">{i + 1}</td>
                    <td className="py-2 text-pg-gray-300">{item.name || item.productName}</td>
                    <td className="py-2 text-xs text-pg-gray-500">{item.sku}</td>
                    <td className="py-2 text-right text-pg-gray-300">{item.quantity}</td>
                    <td className="py-2 text-right text-pg-gray-300">{formatRand(item.unitPrice)}</td>
                    <td className="py-2 text-right font-medium text-pg-white">{formatRand(item.totalPrice || item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mb-8 flex justify-end">
            <div className="w-64">
              <div className="flex justify-between border-b border-white/[0.06] py-2">
                <span className="text-sm text-pg-gray-500">Subtotal</span>
                <span className="text-sm text-pg-gray-300">{formatRand(order.subtotal)}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] py-2">
                <span className="text-sm text-pg-gray-500">VAT (15%)</span>
                <span className="text-sm text-pg-gray-300">{formatRand(order.vatAmount)}</span>
              </div>
              <div className="invoice-total flex justify-between rounded bg-white/[0.04] px-3 py-3">
                <span className="text-sm font-bold text-pg-white">Total Due</span>
                <span className="text-sm font-bold text-pg-gold">{formatRand(order.total || order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Banking Details */}
          <div className="rounded border border-white/[0.06] bg-white/[0.02] p-4">
            <h3 className="mb-3 font-heading text-[11px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
              Banking Details for EFT Payment
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-pg-gray-500">Bank</p>
                <p className="font-medium text-pg-gray-300">{banking.bankName}</p>
              </div>
              <div>
                <p className="text-xs text-pg-gray-500">Account Name</p>
                <p className="font-medium text-pg-gray-300">{banking.accountName}</p>
              </div>
              <div>
                <p className="text-xs text-pg-gray-500">Account Number</p>
                <p className="font-medium text-pg-gray-300">{banking.accountNumber || 'On request'}</p>
              </div>
              <div>
                <p className="text-xs text-pg-gray-500">Branch Code</p>
                <p className="font-medium text-pg-gray-300">{banking.branchCode || 'On request'}</p>
              </div>
            </div>
            <div className="mt-3 rounded bg-pg-gold/10 px-3 py-2">
              <p className="text-xs font-medium text-amber-400">
                Reference: {banking.reference}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 border-t border-white/[0.06] pt-4 text-center">
            <p className="text-xs text-puregro-gray-600">
              Thank you for your business. Payment is due within the agreed terms.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
