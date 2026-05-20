'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { allocationsApi, employeesApi, entriesApi } from '@/lib/api';
import { Allocation } from '@/types';
import toast from 'react-hot-toast';
import { ArrowLeftRight, Plus, RotateCcw, X, Package, Printer, Pencil } from 'lucide-react';
import { printHandover } from '@/lib/handover';

const STATUS_COLORS: Record<string, string> = {
  Active:   'bg-green-100 text-green-700',
  Returned: 'bg-gray-100 text-gray-600',
};

export default function AllocationsTab() {
  const qc = useQueryClient();
  const [statusF, setStatusF]   = useState('Active');
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState<'allocate' | 'return' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Allocation | null>(null);
  const [form, setForm]         = useState({ assetId: '', employeeId: '', notes: '', allocatedAt: '' });
  const [returnNote, setReturnNote] = useState('');
  const [editForm, setEditForm]     = useState({ employeeId: '', allocatedAt: '', notes: '' });

  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ['allocations', statusF],
    queryFn: () => allocationsApi.list({ status: statusF !== 'All' ? statusF : undefined }).then(r => r.data),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', '', 'Active'],
    queryFn: () => employeesApi.list({ status: 'Active' }).then(r => r.data),
    enabled: modal === 'allocate' || modal === 'edit',
  });

  // Ensure current employee always appears in the edit dropdown even while list is loading
  const editEmployeeOptions = modal === 'edit' && selected
    ? [selected.employee, ...employees.filter(e => e.id !== selected.employee.id)]
    : employees;

  const { data: entries = [] } = useQuery({
    queryKey: ['entries'],
    queryFn: () => entriesApi.list().then(r => r.data),
    enabled: modal === 'allocate',
  });

  const availableAssets = entries.filter(e => !e.assetStatus || e.assetStatus === 'Available');

  const createMut = useMutation({
    mutationFn: () => allocationsApi.create({
      assetId: parseInt(form.assetId),
      employeeId: parseInt(form.employeeId),
      notes: form.notes || undefined,
      allocatedAt: form.allocatedAt || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allocations'] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      toast.success('Asset allocated');
      closeModal();
    },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const editMut = useMutation({
    mutationFn: () => allocationsApi.update(selected!.id, {
      employeeId: editForm.employeeId ? parseInt(editForm.employeeId) : undefined,
      allocatedAt: editForm.allocatedAt || undefined,
      notes: editForm.notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allocations'] });
      toast.success('Allocation updated');
      closeModal();
    },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const returnMut = useMutation({
    mutationFn: () => allocationsApi.return(selected!.id, { returnNotes: returnNote || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allocations'] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      toast.success('Asset returned');
      closeModal();
    },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed'),
  });

  function openAllocate() { setForm({ assetId: '', employeeId: '', notes: '', allocatedAt: '' }); setModal('allocate'); }
  function openReturn(a: Allocation) { setSelected(a); setReturnNote(''); setModal('return'); }
  function openEdit(a: Allocation) {
    setSelected(a);
    setEditForm({
      employeeId: String(a.employee.id),
      allocatedAt: a.allocatedAt ? new Date(a.allocatedAt).toISOString().slice(0, 10) : '',
      notes: a.notes || '',
    });
    setModal('edit');
  }
  function closeModal() { setModal(null); setSelected(null); }

  const filtered = search
    ? allocations.filter(a =>
        a.asset.serviceName.toLowerCase().includes(search.toLowerCase()) ||
        a.employee.name.toLowerCase().includes(search.toLowerCase()) ||
        a.employee.department.toLowerCase().includes(search.toLowerCase()))
    : allocations;

  const total    = allocations.length;
  const active   = allocations.filter(a => a.status === 'Active').length;
  const returned = allocations.filter(a => a.status === 'Returned').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 border-b border-gray-200 shrink-0">
        {[
          { label: 'Total Allocations', value: total,    color: 'text-blue-600' },
          { label: 'Currently Active',  value: active,   color: 'text-green-600' },
          { label: 'Returned',          value: returned, color: 'text-gray-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-3 flex items-center gap-3">
            <ArrowLeftRight className={`w-8 h-8 ${color}`} />
            <div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold text-gray-800">{value}</p></div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center p-3 border-b border-gray-200 shrink-0">
        <input
          className="input w-56 text-sm"
          placeholder="Search assets or employees…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input w-36 text-sm" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Returned">Returned</option>
        </select>
        <button className="btn-primary flex items-center gap-1.5 text-sm ml-auto" onClick={openAllocate}>
          <Plus className="w-4 h-4" /> Allocate Asset
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
            <Package className="w-12 h-12 opacity-30" />
            <p>No allocations found</p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {['#','Asset','Category','Location','Employee','Department','Allocated','Returned','Status',''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} className={`border-b border-gray-100 hover:bg-blue-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2 text-gray-400 text-xs">{a.id}</td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap max-w-[180px] truncate">
                    {a.asset.serviceName}
                    {a.asset.assetTag && <span className="ml-1 text-xs text-gray-400">({a.asset.assetTag})</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{a.asset.category || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{a.asset.location || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div>{a.employee.name}</div>
                    <div className="text-xs text-gray-400">{a.employee.empId}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{a.employee.department}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {new Date(a.allocatedAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {a.returnedAt ? new Date(a.returnedAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-600'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {a.status === 'Active' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(a)}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => openReturn(a)}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded"
                        >
                          <RotateCcw className="w-3 h-3" /> Return
                        </button>
                        <button
                          onClick={() => printHandover(a)}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                          title="Print Handover Report"
                        >
                          <Printer className="w-3 h-3" /> Handover
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Allocate Modal */}
      {modal === 'allocate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Allocate Asset</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="label">Asset <span className="text-red-500">*</span></label>
                <select className="input" value={form.assetId} onChange={e => setForm(p => ({ ...p, assetId: e.target.value }))}>
                  <option value="">Select an available asset…</option>
                  {availableAssets.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.serviceName}{e.assetTag ? ` [${e.assetTag}]` : ''}{e.category ? ` — ${e.category}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Employee <span className="text-red-500">*</span></label>
                <select className="input" value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}>
                  <option value="">Select employee…</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.empId}) — {e.department}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Allocation Date</label>
                <input className="input" type="date" value={form.allocatedAt} onChange={e => setForm(p => ({ ...p, allocatedAt: e.target.value }))} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button
                onClick={() => { if (!form.assetId || !form.employeeId) { toast.error('Asset and employee are required'); return; } createMut.mutate(); }}
                className="btn-primary"
                disabled={createMut.isPending}
              >
                {createMut.isPending ? 'Allocating…' : 'Allocate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Edit Allocation</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-3">Asset: <strong className="text-gray-800">{selected.asset.serviceName}{selected.asset.assetTag ? ` [${selected.asset.assetTag}]` : ''}</strong></p>
              </div>
              <div>
                <label className="label">Employee <span className="text-red-500">*</span></label>
                <select className="input" value={editForm.employeeId} onChange={e => setEditForm(p => ({ ...p, employeeId: e.target.value }))}>
                  <option value="">Select employee…</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.empId}) — {e.department}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Allocation Date</label>
                <input className="input" type="date" value={editForm.allocatedAt} onChange={e => setEditForm(p => ({ ...p, allocatedAt: e.target.value }))} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={2} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button
                onClick={() => { if (!editForm.employeeId) { toast.error('Employee is required'); return; } editMut.mutate(); }}
                className="btn-primary"
                disabled={editMut.isPending}
              >
                {editMut.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Edit Allocation</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Asset info — read only */}
              <div className="bg-gray-50 rounded-lg px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div><span className="text-gray-500">Asset:</span> <strong className="text-gray-800">{selected.asset.serviceName}</strong></div>
                {selected.asset.assetTag && <div><span className="text-gray-500">Tag:</span> <span className="text-gray-700">{selected.asset.assetTag}</span></div>}
                {selected.asset.category && <div><span className="text-gray-500">Category:</span> <span className="text-gray-700">{selected.asset.category}</span></div>}
                {selected.asset.location && <div><span className="text-gray-500">Location:</span> <span className="text-gray-700">{selected.asset.location}</span></div>}
              </div>
              <div>
                <label className="label">Employee <span className="text-red-500">*</span></label>
                <select className="input" value={editForm.employeeId} onChange={e => setEditForm(p => ({ ...p, employeeId: e.target.value }))}>
                  <option value="">Select employee…</option>
                  {editEmployeeOptions.map(e => (
                    <option key={e.id} value={String(e.id)}>{e.name} ({e.empId}) — {e.department}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Allocation Date</label>
                <input className="input" type="date" value={editForm.allocatedAt} onChange={e => setEditForm(p => ({ ...p, allocatedAt: e.target.value }))} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={2} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button
                onClick={() => { if (!editForm.employeeId) { toast.error('Employee is required'); return; } editMut.mutate(); }}
                className="btn-primary"
                disabled={editMut.isPending}
              >
                {editMut.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {modal === 'return' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Return Asset</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-gray-600">
                Return <strong>{selected.asset.serviceName}</strong> from <strong>{selected.employee.name}</strong>?
              </p>
              <div>
                <label className="label">Return Notes (optional)</label>
                <textarea className="input resize-none" rows={2} value={returnNote} onChange={e => setReturnNote(e.target.value)} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={() => returnMut.mutate()} className="btn-primary" disabled={returnMut.isPending}>
                {returnMut.isPending ? 'Processing…' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
