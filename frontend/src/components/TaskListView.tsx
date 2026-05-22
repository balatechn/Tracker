'use client';
import { useState } from 'react';
import { Task } from '@/types';
import { Pencil, Trash2, Eye, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  tasks: Task[];
  onTaskClick: (t: Task) => void;
  onTaskEdit: (t: Task) => void;
  onTaskDelete: (id: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Planned':          'bg-orange-100 text-orange-700',
  'In Progress':      'bg-blue-100 text-blue-700',
  'Completed':        'bg-green-100 text-green-700',
  'Delayed':          'bg-red-100 text-red-700',
  'On Hold':          'bg-gray-100 text-gray-600',
  'Waiting Approval': 'bg-purple-100 text-purple-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'text-red-600 font-semibold',
  High:     'text-orange-500 font-semibold',
  Medium:   'text-yellow-600',
  Low:      'text-gray-400',
};

type SortKey = 'id' | 'taskName' | 'location' | 'status' | 'priority' | 'startDate' | 'endDate' | 'completionPct';

export default function TaskListView({ tasks, onTaskClick, onTaskEdit, onTaskDelete }: Props) {
  const [sortKey, setSortKey]   = useState<SortKey>('startDate');
  const [sortAsc, setSortAsc]   = useState(true);
  const [search, setSearch]     = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = tasks
    .filter(t =>
      !search ||
      t.taskName.toLowerCase().includes(search.toLowerCase()) ||
      (t.assignedTo || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.location || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const va = a[sortKey] ?? '', vb = b[sortKey] ?? '';
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return null;
    return sortAsc ? <ChevronUp size={11} className="inline" /> : <ChevronDown size={11} className="inline" />;
  }

  const th = (label: string, key: SortKey) => (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap cursor-pointer hover:text-brand-600 select-none"
      onClick={() => toggleSort(key)}
    >
      {label} <SortIcon k={key} />
    </th>
  );

  // Check if a task is overdue
  function isOverdue(t: Task) {
    return t.status !== 'Completed' && t.status !== 'On Hold' && new Date(t.endDate) < new Date();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
        <input
          className="input w-72 text-sm"
          placeholder="Search tasks, assignee, location…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="ml-3 text-xs text-gray-400">{filtered.length} tasks</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {th('#',          'id')}
              {th('Task Name',  'taskName')}
              {th('Location',   'location')}
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Project</th>
              {th('Status',     'status')}
              {th('Priority',   'priority')}
              {th('Start',      'startDate')}
              {th('End',        'endDate')}
              {th('Progress',   'completionPct')}
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Assigned To</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr
                key={t.id}
                className={`border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer ${
                  isOverdue(t) ? 'bg-red-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
                onClick={() => onTaskClick(t)}
              >
                <td className="px-3 py-2 text-gray-400 text-xs">{t.id}</td>
                <td className="px-3 py-2 font-medium text-gray-800 max-w-[220px]">
                  <div className="truncate">{t.taskName}</div>
                  {t.dependencyIds && (
                    <div className="text-[10px] text-gray-400">Depends: {t.dependencyIds}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-xs">{t.location || '—'}</td>
                <td className="px-3 py-2 text-gray-500 text-xs max-w-[160px] truncate">{t.projectName || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                    {t.status}
                  </span>
                </td>
                <td className={`px-3 py-2 text-xs ${PRIORITY_COLORS[t.priority] || ''}`}>{t.priority}</td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-xs">
                  {new Date(t.startDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                </td>
                <td className={`px-3 py-2 whitespace-nowrap text-xs ${isOverdue(t) ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                  {new Date(t.endDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-20 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-brand-500"
                        style={{ width: `${t.completionPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8">{t.completionPct}%</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-xs">{t.assignedTo || '—'}</td>
                <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <button onClick={() => onTaskClick(t)} className="p-1 hover:bg-blue-100 rounded text-blue-500" title="View"><Eye size={13} /></button>
                    <button onClick={() => onTaskEdit(t)} className="p-1 hover:bg-gray-100 rounded text-gray-500" title="Edit"><Pencil size={13} /></button>
                    <button
                      onClick={() => setDeleteId(t.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 shadow-2xl w-80">
            <h3 className="font-semibold text-gray-800 mb-2">Delete Task?</h3>
            <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={() => { onTaskDelete(deleteId); setDeleteId(null); }} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
