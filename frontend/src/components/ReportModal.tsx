'use client';

import { useState, useMemo } from 'react';
import { X, Download, FileSpreadsheet } from 'lucide-react';
import { Entry } from '@/types';
import { getDaysRemaining, formatDate, formatCurrency } from '@/lib/utils';

interface Props {
  entries: Entry[];
  onClose: () => void;
}

const CATEGORIES = ['All', 'Laptop', 'Desktop', 'Phone/Mobile', 'Tablet', 'Monitor', 'Printer', 'Scanner', 'Server', 'Networking', 'UPS', 'Projector', 'Camera', 'Other Hardware'];
const STATUSES = ['All', 'Available', 'InUse', 'InRepair', 'Retired'];
const CRITICALITIES = ['All', 'High', 'Medium', 'Low'];
const ALLOCATION = ['All', 'Allocated', 'Unallocated'];

export default function ReportModal({ entries, onClose }: Props) {
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCriticality, setFilterCriticality] = useState('All');
  const [filterAllocation, setFilterAllocation] = useState('All');
  const [filterCompany, setFilterCompany] = useState('All');

  const companies = useMemo(() => {
    const set = new Set(entries.map(e => e.billingCompany).filter(Boolean) as string[]);
    return ['All', ...Array.from(set).sort()];
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filterCategory !== 'All' && e.category !== filterCategory) return false;
      if (filterStatus !== 'All' && e.assetStatus !== filterStatus) return false;
      if (filterCriticality !== 'All' && e.criticality !== filterCriticality) return false;
      if (filterAllocation === 'Allocated' && !e.allocations?.[0]) return false;
      if (filterAllocation === 'Unallocated' && e.allocations?.[0]) return false;
      if (filterCompany !== 'All' && e.billingCompany !== filterCompany) return false;
      return true;
    });
  }, [entries, filterCategory, filterStatus, filterCriticality, filterAllocation, filterCompany]);

  function downloadCSV() {
    const headers = ['#', 'Allocated To', 'Company', 'Service/Domain', 'Category', 'Vendor', 'Expiry Date', 'Days Left', 'Auto-Renew', 'Owner', 'Criticality', 'Annual Cost', 'Payment', 'Invoice Ref', 'Asset Tag', 'Serial No', 'Location', 'Condition', 'Status', 'Purchase Date', 'Purchase Price', 'Warranty (yrs)', 'Remarks'];
    const rows = filtered.map((e, i) => {
      const days = getDaysRemaining(e.expiryDate);
      return [
        e.srNo ?? i + 1,
        e.allocations?.[0]?.employee.name ?? '',
        e.billingCompany ?? '',
        e.serviceName,
        e.category ?? '',
        e.vendor ?? '',
        formatDate(e.expiryDate),
        days !== null ? days : '',
        e.autoRenewal ? 'Yes' : 'No',
        e.owner ?? '',
        e.criticality ?? '',
        e.annualCost ?? '',
        e.paymentMethod ?? '',
        e.invoiceRef ?? '',
        e.assetTag ?? '',
        e.serialNumber ?? '',
        e.location ?? '',
        e.condition ?? '',
        e.assetStatus ?? '',
        formatDate(e.purchaseDate),
        e.purchasePrice ?? '',
        e.warrantyYears ?? '',
        e.remarks ?? '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hardware-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const days = (e: Entry) => getDaysRemaining(e.expiryDate);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-800">Hardware Report</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filtered.length} records</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Category</label>
            <select className="input py-1 text-xs min-w-[120px]" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Company</label>
            <select className="input py-1 text-xs min-w-[120px]" value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
              {companies.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Status</label>
            <select className="input py-1 text-xs min-w-[110px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Criticality</label>
            <select className="input py-1 text-xs min-w-[100px]" value={filterCriticality} onChange={e => setFilterCriticality(e.target.value)}>
              {CRITICALITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Allocation</label>
            <select className="input py-1 text-xs min-w-[110px]" value={filterAllocation} onChange={e => setFilterAllocation(e.target.value)}>
              {ALLOCATION.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <button
            onClick={downloadCSV}
            className="ml-auto btn-primary py-1 px-3 text-xs flex items-center gap-1.5"
          >
            <Download size={13} />
            Download CSV
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#217346] text-white">
                {['#', 'Allocated To', 'Company', 'Service / Domain', 'Category', 'Vendor', 'Expiry Date', 'Days Left', 'Auto-Renew', 'Owner', 'Criticality', 'Annual Cost', 'Payment', 'Invoice Ref', 'Asset Tag', 'Serial No', 'Location', 'Condition', 'Status', 'Purchase Date', 'Purchase Price', 'Warranty', 'Remarks'].map(h => (
                  <th key={h} className="px-2 py-1 text-left font-semibold whitespace-nowrap border border-[#1a5c38] text-xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={23} className="text-center py-8 text-gray-400">No records match the selected filters</td>
                </tr>
              ) : filtered.map((e, idx) => {
                const d = days(e);
                const daysLabel = d === null ? '—' : d < 0 ? `Expired` : `${d}d`;
                const daysColor = d === null ? '' : d < 0 ? 'text-red-600 font-semibold' : d <= 30 ? 'text-orange-600 font-semibold' : 'text-gray-700';
                return (
                  <tr key={e.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f2f2f2]'}>
                    <td className="px-2 py-0.5 border border-gray-200 text-gray-500 whitespace-nowrap">{e.srNo ?? idx + 1}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap">{e.allocations?.[0]?.employee.name ?? '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-gray-600">{e.billingCompany ?? '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 font-medium whitespace-nowrap max-w-[160px] truncate" title={e.serviceName}>{e.serviceName}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-gray-600">{e.category ?? '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-gray-600">{e.vendor ?? '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-gray-600">{formatDate(e.expiryDate)}</td>
                    <td className={`px-2 py-0.5 border border-gray-200 whitespace-nowrap ${daysColor}`}>{daysLabel}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap">{e.autoRenewal ? 'Yes' : 'No'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-gray-600">{e.owner ?? '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap">{e.criticality ?? '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-right">{formatCurrency(e.annualCost)}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-gray-600">{e.paymentMethod ?? '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-gray-600">{e.invoiceRef ?? '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 font-mono whitespace-nowrap text-gray-600">{e.assetTag ?? '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-gray-600">{e.serialNumber ?? '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-gray-600">{e.location ?? '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-gray-600">{e.condition ?? '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-gray-600">{e.assetStatus ?? '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-gray-600">{formatDate(e.purchaseDate)}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-right">{e.purchasePrice ? formatCurrency(e.purchasePrice) : '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap text-center">{e.warrantyYears != null ? `${e.warrantyYears}y` : '—'}</td>
                    <td className="px-2 py-0.5 border border-gray-200 max-w-[150px] truncate text-gray-500" title={e.remarks ?? ''}>{e.remarks ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-400 flex-shrink-0">
          {filtered.length} of {entries.length} records
        </div>
      </div>
    </div>
  );
}
