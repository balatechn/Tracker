'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, UserPlus } from 'lucide-react';
import { Entry } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { entriesApi } from '@/lib/api';
import DeleteModal from './DeleteModal';

interface Props {
  entries: Entry[];
  isLoading: boolean;
  onEdit: (entry: Entry) => void;
  onAllocate?: (entry: Entry) => void;
}

type SortKey = keyof Entry | 'department';
type SortDir = 'asc' | 'desc';

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
      if (sortKey === 'department') {
        aVal = a.allocations?.[0]?.employee.department ?? '';
        bVal = b.allocations?.[0]?.employee.department ?? '';
      } else if (sortKey === 'annualCost') {
        aVal = a.annualCost ?? 0;
        bVal = b.annualCost ?? 0;
      } else if (sortKey === 'purchaseDate') {
        aVal = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 99999999999;
        bVal = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 99999999999;
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
        className="px-2 py-1 text-left text-[11px] font-bold whitespace-nowrap cursor-pointer select-none border border-[#bfbfbf] bg-[#1f3864] hover:bg-[#162a4a] transition-colors text-white uppercase tracking-wide"
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
      <th className="px-2 py-1 text-left text-[11px] font-bold whitespace-nowrap border border-[#bfbfbf] bg-[#1f3864] text-white uppercase tracking-wide">
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

  const statusColor: Record<string, string> = {
    'InUse':     'text-green-700 font-semibold',
    'IN USE':    'text-green-700 font-semibold',
    'Available': 'text-blue-600 font-semibold',
    'InRepair':  'text-orange-600 font-semibold',
    'Retired':   'text-gray-400',
    'RETURNED':  'text-red-600 font-semibold',
    'SPARE':     'text-purple-600 font-semibold',
  };

  return (
    <>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <ThPlain>#</ThPlain>
              <Th k="owner">Previous User</Th>
              <ThPlain>User ID</ThPlain>
              <Th k="serviceName">Re Issued To</Th>
              <Th k="category">Product</Th>
              <Th k="vendor">Make</Th>
              <Th k="department">Department</Th>
              <Th k="billingCompany">Company</Th>
              <Th k="assetStatus">Status</Th>
              <Th k="invoiceRef">Invoice</Th>
              <Th k="purchaseDate">Invoice Date</Th>
              <ThPlain>Actions</ThPlain>
            </tr>
          </thead>
          <tbody>
            {sortedEntries().map((entry, idx) => {
              const emp = entry.allocations?.[0]?.employee;
              const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-[#f2f2f2]';
              return (
                <tr key={entry.id} className={`${rowBg} hover:bg-[#dce6f1] transition-colors`}>
                  <td className="px-2 py-[2px] border border-gray-200 text-gray-500 text-right w-8 font-mono">{entry.srNo ?? idx + 1}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap font-medium text-gray-800">{entry.owner ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap text-gray-700">{emp?.name ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap max-w-[180px] truncate text-gray-600" title={entry.serviceName}>{entry.serviceName}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap font-medium text-gray-800">{entry.category ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap text-gray-700">{entry.vendor ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap text-gray-600">{emp?.department ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap text-gray-600">{entry.billingCompany ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap">
                    <span className={statusColor[entry.assetStatus ?? ''] ?? 'text-gray-500'}>
                      {entry.assetStatus ?? '—'}
                    </span>
                  </td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap text-gray-600 font-mono text-[10px]">{entry.invoiceRef ?? '—'}</td>
                  <td className="px-2 py-[2px] border border-gray-200 whitespace-nowrap text-gray-600">{formatDate(entry.purchaseDate)}</td>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-3 py-1 border-t border-[#bfbfbf] text-[11px] text-gray-500 bg-[#f2f2f2]">
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
