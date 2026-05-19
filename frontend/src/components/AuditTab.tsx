'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api';
import { AuditLog } from '@/types';
import { ScrollText, RefreshCw } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  CREATED:        'bg-blue-100 text-blue-700',
  UPDATED:        'bg-gray-100 text-gray-600',
  DELETED:        'bg-red-100 text-red-700',
  ALLOCATED:      'bg-green-100 text-green-700',
  RETURNED:       'bg-orange-100 text-orange-700',
  APPROVED:       'bg-emerald-100 text-emerald-700',
  REJECTED:       'bg-red-100 text-red-700',
  STAGE_ADVANCED: 'bg-purple-100 text-purple-700',
};

const ENTITY_TYPES = ['All', 'Entry', 'Employee', 'Allocation', 'Request'];

export default function AuditTab() {
  const [entityType, setEntityType] = useState('All');

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit', entityType],
    queryFn: () => auditApi.list({ entityType: entityType !== 'All' ? entityType : undefined, limit: 200 }).then(r => r.data),
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header stats */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 shrink-0">
        <div className="card p-3 flex items-center gap-3">
          <ScrollText className="w-8 h-8 text-blue-600" />
          <div>
            <p className="text-xs text-gray-500">Total Log Entries</p>
            <p className="text-xl font-bold text-gray-800">{logs.length}</p>
          </div>
        </div>
        <p className="text-sm text-gray-400 ml-2">Showing last 200 records</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center p-3 border-b border-gray-200 shrink-0">
        <select className="input w-44 text-sm" value={entityType} onChange={e => setEntityType(e.target.value)}>
          {ENTITY_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <button
          className="btn-secondary flex items-center gap-1.5 text-sm ml-auto"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
            <ScrollText className="w-12 h-12 opacity-30" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {['Date / Time','Action','Entity Type','Entity Name','User','Details'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log: AuditLog, i: number) => (
                <tr key={log.id} className={`border-b border-gray-100 hover:bg-blue-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                    <div>{new Date(log.createdAt).toLocaleDateString('en-IN')}</div>
                    <div className="text-gray-400">{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{log.entityType}</td>
                  <td className="px-3 py-2 text-gray-800 max-w-[200px] truncate" title={log.entityName || ''}>{log.entityName || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{log.userId}</td>
                  <td className="px-3 py-2 text-gray-500 max-w-[280px] truncate" title={log.details || ''}>{log.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
