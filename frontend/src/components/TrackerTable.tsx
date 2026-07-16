'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, UserPlus } from 'lucide-react';
import { Entry } from '@/types';
import { formatDate } from '@/lib/utils';
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

// Excel cell/header shared styles
const TD = 'px-1.5 border border-[#d0d0d0] whitespace-nowrap text-[10.5px] leading-[18px]';
const TH_BASE = 'px-1.5 border border-[#2a4a7f] text-[10.5px] font-bold uppercase tracking-wide whitespace-nowrap leading-[20px] bg-[#1f3864] text-white select-none';

export default function TrackerTable({ entries, isLoading, onEdit, onAllocate }: Props) {
  const queryClient = useQueryClient();
  const [sortKey, setSortKey] = useState<SortKey>('srNo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function sortedEntries() {
    return [...entries].sort((a, b) => {
      let aVal: any, bVal: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (sortKey === 'department') {
        aVal = a.allocations?.[0]?.employee.department ?? '';
        bVal = b.allocations?.[0]?.employee.department ?? '';
      } else if (sortKey === 'annualCost' || sortKey === 'purchasePrice') {
        aVal = (a[sortKey] as number) ?? 0;
        bVal = (b[sortKey] as number) ?? 0;
      } else if (sortKey === 'purchaseDate') {
        aVal = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 9e12;
        bVal = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 9e12;
      } else {
        aVal = String(a[sortKey as keyof Entry] ?? '');
        bVal = String(b[sortKey as keyof Entry] ?? '');
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
    if (sortKey !== k) return <ChevronsUpDown size={9} className="opacity-40 flex-shrink-0" />;
    return sortDir === 'asc' ? <ChevronUp size={9} className="flex-shrink-0" /> : <ChevronDown size={9} className="flex-shrink-0" />;
  }

  function Th({ children, k }: { children: React.ReactNode; k: SortKey }) {
    return (
      <th className={`${TH_BASE} cursor-pointer hover:bg-[#162a4a] transition-colors`} onClick={() => handleSort(k)}>
        <div className="flex items-center gap-0.5">{children}<SortIcon k={k} /></div>
      </th>
    );
  }

  function ThPlain({ children }: { children: React.ReactNode }) {
    return <th className={TH_BASE}>{children}</th>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <span className="animate-spin h-5 w-5 border-2 border-brand-500 border-t-transparent rounded-full mr-2" />
        Loading…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="font-medium">No entries found</p>
        <p className="text-sm mt-1">Try adjusting filters or add a new entry.</p>
      </div>
    );
  }

  const statusStyle: Record<string, string> = {
    InUse:     'text-[#375623] font-semibold',
    Available: 'text-[#1f497d] font-semibold',
    InRepair:  'text-[#974706] font-semibold',
    Retired:   'text-gray-400',
    RETURNED:  'text-[#c00000] font-semibold',
    SPARE:     'text-[#7030a0] font-semibold',
  };

  return (
    <>
      <div className="flex-1 min-h-0 overflow-auto" style={{ fontFamily: "'Calibri', 'Aptos', 'Arial', sans-serif" }}>
        <table className="border-collapse" style={{ tableLayout: 'auto', minWidth: '100%' }}>
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
              <Th k="assetTag">Tag Number</Th>
              <Th k="serialNumber">Serial Number</Th>
              <Th k="invoiceRef">Invoice</Th>
              <Th k="purchaseDate">Invoice Date</Th>
              <ThPlain>Actions</ThPlain>
            </tr>
          </thead>
          <tbody>
            {sortedEntries().map((entry, idx) => {
              const emp = entry.allocations?.[0]?.employee;
              const bg = idx % 2 === 0 ? '#ffffff' : '#f2f2f2';
              return (
                <tr
                  key={entry.id}
                  style={{ backgroundColor: bg }}
                  className="hover:bg-[#dce6f1] transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#dce6f1')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = bg)}
                >
                  <td className={`${TD} text-right text-gray-400 w-8`}>{entry.srNo ?? idx + 1}</td>
                  <td className={`${TD} text-gray-800`}>{entry.owner ?? '–'}</td>
                  <td className={`${TD} text-gray-800`}>{emp?.name ?? '–'}</td>
                  <td className={`${TD} text-gray-600 max-w-[200px] overflow-hidden text-ellipsis`} title={entry.serviceName}>{entry.serviceName}</td>
                  <td className={`${TD} text-gray-800 font-semibold`}>{entry.category ?? '–'}</td>
                  <td className={`${TD} text-gray-700`}>{entry.vendor ?? '–'}</td>
                  <td className={`${TD} text-gray-700`}>{emp?.department ?? '–'}</td>
                  <td className={`${TD} text-gray-700`}>{entry.billingCompany ?? '–'}</td>
                  <td className={`${TD}`}>
                    <span className={statusStyle[entry.assetStatus ?? ''] ?? 'text-gray-500'}>
                      {entry.assetStatus ?? '–'}
                    </span>
                  </td>
                  <td className={`${TD} text-gray-600`} style={{ fontFamily: 'Consolas, monospace', fontSize: '10px' }}>{entry.assetTag ?? '–'}</td>
                  <td className={`${TD} text-gray-600`} style={{ fontFamily: 'Consolas, monospace', fontSize: '10px' }}>{entry.serialNumber ?? '–'}</td>
                  <td className={`${TD} text-gray-600`} style={{ fontFamily: 'Consolas, monospace', fontSize: '10px' }}>{entry.invoiceRef ?? '–'}</td>
                  <td className={`${TD} text-gray-600`}>{formatDate(entry.purchaseDate)}</td>
                  <td className={`${TD}`}>
                    <div className="flex items-center justify-center gap-0.5">
                      <button onClick={() => onEdit(entry)} className="p-0.5 text-gray-400 hover:text-brand-500 transition-colors" title="Edit">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => setDeleteTarget(entry)} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 size={11} />
                      </button>
                      {onAllocate && entry.assetTag && entry.assetStatus !== 'InUse' && (
                        <button onClick={() => onAllocate(entry)} className="p-0.5 text-gray-400 hover:text-green-600 transition-colors" title="Allocate">
                          <UserPlus size={11} />
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

      <div className="px-2 py-1 border-t border-[#d0d0d0] bg-[#f2f2f2]" style={{ fontFamily: "'Calibri','Arial',sans-serif", fontSize: '10.5px', color: '#595959' }}>
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
