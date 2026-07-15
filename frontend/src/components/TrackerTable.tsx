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
    if (sortKey !== k) return <ChevronsUpDown size={11} className="opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  }

  function Th({ children, k }: { children: React.ReactNode; k: SortKey }) {
    return (
      <th
        className="px-2 py-1 text-left text-[11px] font-semibold whitespace-nowrap cursor-pointer select-none border border-[#bfbfbf] bg-[#d9d9d9] hover:bg-[#c8c8c8] transition-colors text-gray-800"
        onClick={() => handleSort(k)}
      >
        <div className="flex items-center gap-0.5">
          {children}
          <SortIcon k={k} />
        </div>
      </th>
    );
  }

  function ThPlain({ children }: { children: React.ReactNode }) {
    return (
      <th className="px-2 py-1 text-left text-[11px] font-semibold whitespace-nowrap border border-[#bfbfbf] bg-[#d9d9d9] text-gray-800">
        {children}
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
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <Th k="srNo">#</Th>
              <ThPlain>Allocated To</ThPlain>
              <Th k="billingCompany">Company</Th>
              <ThPlain>Actions</ThPlain>
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
              <ThPlain>Asset Tag</ThPlain>
              <ThPlain>Status</ThPlain>
            </tr>
          </thead>
          <tbody>
            {sortedEntries().map((entry, idx) => {
              const days = getDaysRemaining(entry.expiryDate);
              const status = getStatusInfo(days);
              const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-[#f2f2f2]';
              return (
                <tr key={entry.id} className={`${rowBg} hover:bg-[#e8f0fe] transition-colors`}>
                  <td className="px-2 py-[2px] border border-gray-200 text-gray-500 text-right w-8">{entry.srNo ?? idx + 1}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap">{entry.allocations?.[0]?.employee.name ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap text-gray-600">{entry.billingCompany ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200">
                    <div className="flex items-center justify-center gap-0.5">
                      <button onClick={() => onEdit(entry)} className="p-1 text-gray-400 hover:text-brand-500 rounded transition-colors" title="Edit">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => setDeleteTarget(entry)} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors" title="Delete">
                        <Trash2 size={12} />
                      </button>
                      {onAllocate && entry.assetTag && entry.assetStatus !== 'InUse' && (
                        <button onClick={() => onAllocate(entry)} className="p-1 text-gray-400 hover:text-green-600 rounded transition-colors" title="Allocate">
                          <UserPlus size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-[2px] border border-gray-200 font-medium whitespace-nowrap max-w-[180px] truncate" title={entry.serviceName}>
                    {entry.serviceName}
                  </td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap">
                    {entry.category ? (
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0 rounded-sm text-[10px]">{entry.category}</span>
                    ) : '—'}
                  </td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap text-gray-600">{entry.vendor ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap text-gray-600">{formatDate(entry.expiryDate)}</td>
                  <td className="px-2 py-[2px] border border-gray-200">
                    <span className={`font-medium ${status.color} whitespace-nowrap`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-2 py-[2px] border border-gray-200 text-center">
                    <span className={entry.autoRenewal ? 'text-green-700 font-medium' : 'text-gray-400'}>
                      {entry.autoRenewal ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap text-gray-600">{entry.owner ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap">
                    <span className={
                      entry.criticality === 'High' ? 'text-red-600 font-semibold' :
                      entry.criticality === 'Medium' ? 'text-yellow-600 font-medium' :
                      entry.criticality === 'Low' ? 'text-gray-500' : 'text-gray-400'
                    }>{entry.criticality ?? '—'}</span>
                  </td>
                  <td className="px-2 py-[2px] border border-gray-200 text-right whitespace-nowrap font-medium text-gray-700">{formatCurrency(entry.annualCost)}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap text-gray-500">{entry.paymentMethod ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap text-gray-500">{entry.invoiceRef ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 max-w-[150px] truncate text-gray-500" title={entry.remarks ?? ''}>{entry.remarks ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 font-mono text-[10px] whitespace-nowrap text-gray-600">{entry.assetTag ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap">
                    {entry.assetStatus ? (
                      <span className={
                        entry.assetStatus === 'InUse' ? 'text-green-700 font-medium' :
                        entry.assetStatus === 'Available' ? 'text-blue-600 font-medium' :
                        entry.assetStatus === 'InRepair' ? 'text-orange-600 font-medium' :
                        'text-gray-400'
                      }>{entry.assetStatus}</span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-3 py-1.5 border-t border-gray-200 text-[11px] text-gray-400 bg-[#f2f2f2]">
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
