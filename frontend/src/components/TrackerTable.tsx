'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, UserPlus } from 'lucide-react';
import { Entry } from '@/types';
import { getDaysRemaining, getStatusInfo, formatDate, formatCurrency } from '@/lib/utils';
import { entriesApi } from '@/lib/api';
import DeleteModal from './DeleteModal';

interface Props {
  entries: Entry[];
  isLoading: boolean;
  onEdit: (entry: Entry) => void;
  onAllocate?: (entry: Entry) => void;
}

type SortKey = keyof Entry | 'daysRemaining';
type SortDir = 'asc' | 'desc';

const CRITICALITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export default function TrackerTable({ entries, isLoading, onEdit, onAllocate }: Props) {
  const queryClient = useQueryClient();
  const [sortKey, setSortKey] = useState<SortKey>('srNo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  function sortedEntries() {
    return [...entries].sort((a, b) => {
      let aVal: any, bVal: any; // eslint-disable-line @typescript-eslint/no-explicit-any

      if (sortKey === 'daysRemaining') {
        aVal = getDaysRemaining(a.expiryDate) ?? 99999;
        bVal = getDaysRemaining(b.expiryDate) ?? 99999;
      } else if (sortKey === 'criticality') {
        aVal = CRITICALITY_ORDER[a.criticality ?? ''] ?? 3;
        bVal = CRITICALITY_ORDER[b.criticality ?? ''] ?? 3;
      } else if (sortKey === 'annualCost') {
        aVal = a.annualCost ?? 0;
        bVal = b.annualCost ?? 0;
      } else if (sortKey === 'expiryDate') {
        aVal = a.expiryDate ? new Date(a.expiryDate).getTime() : 99999999999;
        bVal = b.expiryDate ? new Date(b.expiryDate).getTime() : 99999999999;
      } else {
        aVal = (a[sortKey as keyof Entry] ?? '') as string;
        bVal = (b[sortKey as keyof Entry] ?? '') as string;
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  async function handleDelete(entry: Entry) {
    try {
      await entriesApi.delete(entry.id);
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      toast.success(`"${entry.serviceName}" deleted`);
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleteTarget(null);
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronsUpDown size={12} className="opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  function Th({ children, k, className = '' }: { children: React.ReactNode; k: SortKey; className?: string }) {
    return (
      <th
        className={`px-3 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:bg-brand-600 transition-colors ${className}`}
        onClick={() => handleSort(k)}
      >
        <div className="flex items-center gap-1">
          {children}
          <SortIcon k={k} />
        </div>
      </th>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <span className="animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full mr-3" />
        Loading entries…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-lg font-medium">No entries found</p>
        <p className="text-sm">Try adjusting your search or filters, or add a new entry.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-brand-500 sticky top-0 z-10">
            <tr>
              <Th k="srNo" className="pl-4 w-12">#</Th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide whitespace-nowrap">Allocated To</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-white uppercase tracking-wide w-20">Actions</th>
              <Th k="serviceName">Service / Domain</Th>
              <Th k="category">Category</Th>
              <Th k="vendor">Vendor</Th>
              <Th k="expiryDate">Expiry Date</Th>
              <Th k="daysRemaining">Days Left</Th>
              <Th k="autoRenewal">Auto-Renew</Th>
              <Th k="owner">Owner</Th>
              <Th k="criticality">Criticality</Th>
              <Th k="annualCost">Annual Cost</Th>
              <Th k="paymentMethod">Payment</Th>
              <Th k="invoiceRef">Invoice Ref</Th>
              <Th k="remarks">Remarks</Th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide whitespace-nowrap">Asset Tag</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries().map((entry, idx) => {
              const days = getDaysRemaining(entry.expiryDate);
              const status = getStatusInfo(days);
              return (
                <tr
                  key={entry.id}
                  className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className="px-2 py-1.5 pl-3 text-gray-400">{entry.srNo ?? idx + 1}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-gray-700">
                    {entry.allocations?.[0]?.employee.name ?? '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(entry)}
                        className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(entry)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                      {onAllocate && entry.assetTag && entry.assetStatus !== 'InUse' && (
                        <button
                          onClick={() => onAllocate(entry)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Allocate Asset"
                        >
                          <UserPlus size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 font-medium text-gray-800 whitespace-nowrap max-w-[180px] truncate" title={entry.serviceName}>
                    {entry.serviceName}
                    {entry.billingCompany && (
                      <span className="text-gray-400 ml-1">({entry.billingCompany})</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {entry.category && (
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {entry.category}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">{entry.vendor ?? '—'}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-gray-600">{formatDate(entry.expiryDate)}</td>
                  <td className="px-2 py-1.5">
                    <span className={`inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded-full ${status.bg} ${status.color} whitespace-nowrap`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${entry.autoRenewal ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {entry.autoRenewal ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">{entry.owner ?? '—'}</td>
                  <td className="px-2 py-1.5">
                    {entry.criticality && (
                      <span className={`px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
                        entry.criticality === 'High' ? 'bg-red-100 text-red-700' :
                        entry.criticality === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {entry.criticality}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap text-gray-700 font-medium">
                    {formatCurrency(entry.annualCost)}
                  </td>
                  <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{entry.paymentMethod ?? '—'}</td>
                  <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{entry.invoiceRef ?? '—'}</td>
                  <td className="px-2 py-1.5 text-gray-500 max-w-[150px] truncate" title={entry.remarks ?? ''}>
                    {entry.remarks ?? '—'}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-xs text-gray-600 whitespace-nowrap">
                    {entry.assetTag ?? '—'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {entry.assetStatus ? (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.assetStatus === 'InUse' ? 'bg-green-100 text-green-700' :
                        entry.assetStatus === 'Available' ? 'bg-blue-100 text-blue-700' :
                        entry.assetStatus === 'InRepair' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{entry.assetStatus}</span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
        {entries.length} record{entries.length !== 1 ? 's' : ''}
      </div>

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.serviceName}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
