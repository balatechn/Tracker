'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi } from '@/lib/api';
import { AssetRequest } from '@/types';
import toast from 'react-hot-toast';
import { ClipboardList, Plus, CheckCircle, XCircle, Trash2, X } from 'lucide-react';

const REQUEST_TYPES = ['NewPurchase', 'Replacement', 'Repair', 'SoftwareLicense', 'AccessoryRequest', 'AssetReturn'];
const PRIORITIES    = ['High', 'Medium', 'Low'];
const STAGE_ORDER   = ['Manager', 'IT', 'Finance', 'Done'];

const STATUS_COLORS: Record<string, string> = {
  Pending:  'bg-yellow-100 text-yellow-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low:    'bg-green-100 text-green-700',
};

const STAGE_COLORS: Record<string, string> = {
  Manager: 'text-blue-600',
  IT:      'text-purple-600',
  Finance: 'text-orange-600',
  Done:    'text-green-600',
};

function nextStage(current: string): string {
  const idx = STAGE_ORDER.indexOf(current);
  return STAGE_ORDER[idx + 1] ?? 'Done';
}

export default function RequestsTab() {
  const qc = useQueryClient();
  const [statusF, setStatusF]   = useState('All');
  const [typeF, setTypeF]       = useState('All');
  const [modal, setModal]       = useState<'new' | 'approve' | 'reject' | null>(null);
  const [selected, setSelected] = useState<AssetRequest | null>(null);
  const [form, setForm]         = useState({ requestType: 'NewPurchase', requestedBy: '', description: '', priority: 'Medium' });
  const [approvalForm, setApprovalForm] = useState({ approvedBy: 'admin', comments: '' });
  const [rejectForm, setRejectForm]     = useState({ rejectedBy: 'admin', comments: '' });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', statusF, typeF],
    queryFn: () => requestsApi.list({
      status:      statusF !== 'All' ? statusF : undefined,
      requestType: typeF !== 'All' ? typeF : undefined,
    }).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => requestsApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requests'] }); toast.success('Request submitted'); closeModal(); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const approveMut = useMutation({
    mutationFn: () => requestsApi.approve(selected!.id, approvalForm),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      toast.success(res.data.status === 'Approved' ? 'Request fully approved!' : `Advanced to ${res.data.approvalStage} stage`);
      closeModal();
    },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const rejectMut = useMutation({
    mutationFn: () => requestsApi.reject(selected!.id, rejectForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requests'] }); toast.success('Request rejected'); closeModal(); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => requestsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requests'] }); toast.success('Request deleted'); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed'),
  });

  function openApprove(r: AssetRequest) { setSelected(r); setApprovalForm({ approvedBy: 'admin', comments: '' }); setModal('approve'); }
  function openReject(r: AssetRequest) { setSelected(r); setRejectForm({ rejectedBy: 'admin', comments: '' }); setModal('reject'); }
  function closeModal() { setModal(null); setSelected(null); }

  const pending  = requests.filter(r => r.status === 'Pending').length;
  const approved = requests.filter(r => r.status === 'Approved').length;
  const rejected = requests.filter(r => r.status === 'Rejected').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-gray-200 shrink-0">
        {[
          { label: 'Total Requests', value: requests.length, color: 'text-blue-600' },
          { label: 'Pending',        value: pending,          color: 'text-yellow-600' },
          { label: 'Approved',       value: approved,         color: 'text-green-600' },
          { label: 'Rejected',       value: rejected,         color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-3 flex items-center gap-3">
            <ClipboardList className={`w-8 h-8 ${color}`} />
            <div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold text-gray-800">{value}</p></div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center p-3 border-b border-gray-200 shrink-0">
        <select className="input w-40 text-sm" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <select className="input w-44 text-sm" value={typeF} onChange={e => setTypeF(e.target.value)}>
          <option value="All">All Types</option>
          {REQUEST_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <button className="btn-primary flex items-center gap-1.5 text-sm ml-auto" onClick={() => { setForm({ requestType: 'NewPurchase', requestedBy: '', description: '', priority: 'Medium' }); setModal('new'); }}>
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
            <ClipboardList className="w-12 h-12 opacity-30" />
            <p>No requests found</p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {['#','Type','Description','Requested By','Priority','Status','Stage','Date','Actions'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r, i) => (
                <tr key={r.id} className={`border-b border-gray-100 hover:bg-blue-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2 text-gray-400 text-xs">{r.id}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{r.requestType}</span>
                  </td>
                  <td className="px-3 py-2 max-w-[200px] truncate text-gray-700" title={r.description}>{r.description}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.requestedBy}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[r.priority || 'Medium']}`}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap text-xs font-medium ${STAGE_COLORS[r.approvalStage] || 'text-gray-600'}`}>
                    {r.approvalStage}
                    {r.status === 'Pending' && (
                      <span className="text-gray-400 ml-1">→ {nextStage(r.approvalStage)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(r.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex gap-1">
                      {r.status === 'Pending' && (
                        <>
                          <button onClick={() => openApprove(r)} title="Approve" className="p-1 hover:bg-green-100 rounded text-green-600"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => openReject(r)} title="Reject" className="p-1 hover:bg-red-100 rounded text-red-600"><XCircle className="w-4 h-4" /></button>
                        </>
                      )}
                      <button onClick={() => { if (window.confirm('Delete this request?')) deleteMut.mutate(r.id); }} title="Delete" className="p-1 hover:bg-red-100 rounded text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Request Modal */}
      {modal === 'new' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">New Asset Request</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="label">Request Type <span className="text-red-500">*</span></label>
                <select className="input" value={form.requestType} onChange={e => setForm(p => ({ ...p, requestType: e.target.value }))}>
                  {REQUEST_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Requested By <span className="text-red-500">*</span></label>
                <input className="input" value={form.requestedBy} onChange={e => setForm(p => ({ ...p, requestedBy: e.target.value }))} placeholder="Name or email" />
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description <span className="text-red-500">*</span></label>
                <textarea className="input resize-none" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button
                onClick={() => { if (!form.requestedBy || !form.description) { toast.error('All required fields must be filled'); return; } createMut.mutate(); }}
                className="btn-primary"
                disabled={createMut.isPending}
              >
                {createMut.isPending ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {modal === 'approve' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Approve Request</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-gray-600">
                <strong>{selected.requestType}</strong> from <strong>{selected.requestedBy}</strong>
              </p>
              <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">{selected.description}</p>
              <div className="text-sm text-blue-700 font-medium">
                Current stage: <strong>{selected.approvalStage}</strong> → Next: <strong>{nextStage(selected.approvalStage)}</strong>
                {nextStage(selected.approvalStage) === 'Done' && <span className="ml-1 text-green-600">(fully approved)</span>}
              </div>
              <div>
                <label className="label">Approved By</label>
                <input className="input" value={approvalForm.approvedBy} onChange={e => setApprovalForm(p => ({ ...p, approvedBy: e.target.value }))} />
              </div>
              <div>
                <label className="label">Comments</label>
                <textarea className="input resize-none" rows={2} value={approvalForm.comments} onChange={e => setApprovalForm(p => ({ ...p, comments: e.target.value }))} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={() => approveMut.mutate()} className="btn-primary bg-green-600 hover:bg-green-700" disabled={approveMut.isPending}>
                {approveMut.isPending ? 'Processing…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {modal === 'reject' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Reject Request</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-gray-600">
                <strong>{selected.requestType}</strong> from <strong>{selected.requestedBy}</strong>
              </p>
              <div>
                <label className="label">Rejected By</label>
                <input className="input" value={rejectForm.rejectedBy} onChange={e => setRejectForm(p => ({ ...p, rejectedBy: e.target.value }))} />
              </div>
              <div>
                <label className="label">Reason / Comments</label>
                <textarea className="input resize-none" rows={3} value={rejectForm.comments} onChange={e => setRejectForm(p => ({ ...p, comments: e.target.value }))} placeholder="Reason for rejection…" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={() => rejectMut.mutate()} className="btn-danger" disabled={rejectMut.isPending}>
                {rejectMut.isPending ? 'Processing…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
