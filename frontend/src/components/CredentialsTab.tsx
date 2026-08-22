'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink, X, Save, Search, Download } from 'lucide-react';
import { credentialsApi } from '@/lib/api';
import { Credential } from '@/types';
import * as XLSX from 'xlsx';

const EMPTY: Partial<Credential> = {
  srNo: undefined, entity: '', portalName: '', url: '', email: '',
  mobile: '', username: '', password: '', remarks: '',
  lastUpdated: new Date().toISOString().slice(0, 10),
};

function CredentialModal({ cred, onClose, isAdmin }: { cred: Partial<Credential> | null; onClose: () => void; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Credential>>(cred ?? EMPTY);
  const [showPw, setShowPw] = useState(false);
  const isNew = !cred?.id;

  const save = useMutation({
    mutationFn: () => isNew
      ? credentialsApi.create(form)
      : credentialsApi.update(cred!.id!, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credentials'] }); toast.success(isNew ? 'Credential added' : 'Updated'); onClose(); },
    onError: () => toast.error('Save failed'),
  });

  const f = (k: keyof Credential) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(v => ({ ...v, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{isNew ? 'Add Credential' : 'Edit Credential'}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div>
            <label className="label">S.No.</label>
            <input className="input" type="number" value={form.srNo ?? ''} onChange={f('srNo')} />
          </div>
          <div>
            <label className="label">Entity</label>
            <input className="input" value={form.entity ?? ''} onChange={f('entity')} placeholder="e.g. Hotels" />
          </div>
          <div className="col-span-2">
            <label className="label">Website / Portal Name *</label>
            <input className="input" value={form.portalName ?? ''} onChange={f('portalName')} required />
          </div>
          <div className="col-span-2">
            <label className="label">URL</label>
            <input className="input" type="url" value={form.url ?? ''} onChange={f('url')} placeholder="https://" />
          </div>
          <div>
            <label className="label">Registered Email</label>
            <input className="input" type="email" value={form.email ?? ''} onChange={f('email')} />
          </div>
          <div>
            <label className="label">Mobile No.</label>
            <input className="input" value={form.mobile ?? ''} onChange={f('mobile')} />
          </div>
          <div>
            <label className="label">Username / ID</label>
            <input className="input" value={form.username ?? ''} onChange={f('username')} />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input className="input pr-10" type={showPw ? 'text' : 'password'} value={form.password ?? ''} onChange={f('password')} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Last Updated</label>
            <input className="input" type="date" value={form.lastUpdated?.slice(0, 10) ?? ''} onChange={f('lastUpdated')} />
          </div>
          <div className="col-span-2">
            <label className="label">Remarks</label>
            <textarea className="input resize-none" rows={2} value={form.remarks ?? ''} onChange={f('remarks')} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => save.mutate()} disabled={!form.portalName || save.isPending} className="btn-primary">
            <Save size={14} /> {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CredentialsTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState<Partial<Credential> | null | false>(false);
  const [search, setSearch] = useState('');
  const [visiblePw, setVisiblePw] = useState<Set<number>>(new Set());

  const { data: creds = [], isLoading } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => credentialsApi.list().then(r => r.data),
  });

  const del = useMutation({
    mutationFn: (id: number) => credentialsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credentials'] }); toast.success('Deleted'); },
    onError: () => toast.error('Delete failed'),
  });

  const filtered = creds.filter(c =>
    !search || [c.portalName, c.entity, c.email, c.username, c.url, c.remarks]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const togglePw = (id: number) => setVisiblePw(v => { const n = new Set(v); n.has(id) ? n.delete(id) : n.add(id); return n; });

  function exportExcel() {
    const rows = filtered.map(c => ({
      'S.No': c.srNo ?? '',
      'Entity': c.entity ?? '',
      'Portal / Website': c.portalName,
      'URL': c.url ?? '',
      'Email': c.email ?? '',
      'Mobile': c.mobile ?? '',
      'Username': c.username ?? '',
      'Password': c.password ?? '',
      'Remarks': c.remarks ?? '',
      'Last Updated': c.lastUpdated ? new Date(c.lastUpdated).toLocaleDateString('en-IN') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Credentials');
    XLSX.writeFile(wb, `JH-Credentials-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const cols = ['#', 'Entity', 'Portal / Website', 'URL', 'Email', 'Mobile', 'Username', 'Password', 'Remarks', 'Updated', ''];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8 py-1.5 text-sm" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-gray-400">{filtered.length} records</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={exportExcel} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
            <Download size={13} /> Export Excel
          </button>
          {isAdmin && (
            <button onClick={() => setModal(EMPTY)} className="btn-primary text-xs py-1.5">
              <Plus size={13} /> Add
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
            <tr>
              {cols.map(c => (
                <th key={c} className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap border-r border-gray-100 last:border-r-0">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={11} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-12 text-gray-400">No credentials found</td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c.id} className={`border-b border-gray-100 hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="px-3 py-2 text-gray-400 whitespace-nowrap border-r border-gray-100">{c.srNo ?? i + 1}</td>
                <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap border-r border-gray-100">{c.entity || '—'}</td>
                <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap border-r border-gray-100">{c.portalName}</td>
                <td className="px-3 py-2 border-r border-gray-100">
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-600 hover:underline truncate max-w-[160px]">
                      <ExternalLink size={11} className="flex-shrink-0" />
                      <span className="truncate">{c.url.replace(/^https?:\/\//, '')}</span>
                    </a>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap border-r border-gray-100">{c.email || '—'}</td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap border-r border-gray-100">{c.mobile || '—'}</td>
                <td className="px-3 py-2 font-mono text-gray-700 whitespace-nowrap border-r border-gray-100">{c.username || '—'}</td>
                <td className="px-3 py-2 border-r border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-gray-700">
                      {visiblePw.has(c.id) ? (c.password || '—') : (c.password ? '••••••••' : '—')}
                    </span>
                    {c.password && (
                      <button onClick={() => togglePw(c.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                        {visiblePw.has(c.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate border-r border-gray-100">{c.remarks || '—'}</td>
                <td className="px-3 py-2 text-gray-400 whitespace-nowrap border-r border-gray-100">
                  {c.lastUpdated ? new Date(c.lastUpdated).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-3 py-2">
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal(c)} className="p-1 rounded hover:bg-blue-100 text-blue-600"><Pencil size={13} /></button>
                      <button onClick={() => { if (confirm('Delete this credential?')) del.mutate(c.id); }} className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2 size={13} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== false && (
        <CredentialModal cred={modal || null} onClose={() => setModal(false)} isAdmin={isAdmin} />
      )}
    </div>
  );
}
