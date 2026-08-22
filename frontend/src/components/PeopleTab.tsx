'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi, allocationsApi } from '@/lib/api';
import { Employee } from '@/types';
import toast from 'react-hot-toast';
import { Users, Plus, Pencil, Trash2, X, UserCheck, UserX, Clock, Briefcase, ChevronDown, ChevronRight, RotateCcw, RefreshCw, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const DEPARTMENTS = ['IT', 'HR', 'Finance', 'Operations', 'Sales', 'Marketing', 'Management', 'Admin'];
const STATUSES = ['Active', 'Resigned', 'On Leave', 'Probation'];

const DOMAIN_ENTITY: Record<string, string> = {
  'nationalgroupindia.com': 'NCPL',
  'rainlandautocorp.com':   'RAINLAND',
  'iskytransport.com':      'ISKY TRANSPORT',
};

function getEntity(email: string): string {
  const domain = email?.split('@')[1]?.toLowerCase() ?? '';
  return DOMAIN_ENTITY[domain] ?? (domain ? `Unknown (${domain})` : '—');
}

const STATUS_COLORS: Record<string, string> = {
  Active:    'bg-green-100 text-green-700',
  Resigned:  'bg-red-100 text-red-700',
  'On Leave':'bg-orange-100 text-orange-700',
  Probation: 'bg-blue-100 text-blue-700',
};

type EmpForm = Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'allocations'>;

const EMPTY_FORM: EmpForm = {
  empId: '', name: '', email: '', department: '', designation: null,
  phone: null, manager: null, status: 'Active', joiningDate: null, exitDate: null,
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

export default function PeopleTab() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [statusF, setStatusF] = useState('All');
  const [entityF, setEntityF] = useState('All');
  const [licenseF, setLicenseF] = useState('All');
  const [modal, setModal]     = useState<'add' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [form, setForm]       = useState<EmpForm>(EMPTY_FORM);
  const [expandedEmpId, setExpandedEmpId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ added: number; updated: number; skipped: number } | null>(null);

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  const isAdmin = userRole === 'admin';

  async function handleMicrosoftSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/employees/sync-microsoft', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Sync failed');
        return;
      }
      const result = await res.json();
      setSyncResult(result);
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`Sync complete: ${result.added} added, ${result.updated} updated`);
    } catch {
      toast.error('Sync failed — check Azure credentials');
    } finally {
      setSyncing(false);
    }
  }

  const returnMut = useMutation({
    mutationFn: (id: number) => allocationsApi.return(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Asset returned'); },
    onError: () => toast.error('Return failed'),
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', search, statusF],
    queryFn: () => employeesApi.list({ search: search || undefined, status: statusF }).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: EmpForm) => employeesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee added'); closeModal(); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: (d: EmpForm) => employeesApi.update(selected!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee updated'); closeModal(); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: () => employeesApi.delete(selected!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee deleted'); closeModal(); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed'),
  });

  function openAdd() { setForm(EMPTY_FORM); setSelected(null); setModal('add'); }
  function openEdit(e: Employee) {
    setSelected(e);
    setForm({
      empId: e.empId, name: e.name, email: e.email, department: e.department,
      designation: e.designation, phone: e.phone, manager: e.manager,
      status: e.status, joiningDate: e.joiningDate ? e.joiningDate.slice(0, 10) : null,
      exitDate: e.exitDate ? e.exitDate.slice(0, 10) : null,
    });
    setModal('edit');
  }
  function openDelete(e: Employee) { setSelected(e); setModal('delete'); }
  function closeModal() { setModal(null); setSelected(null); }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.name || !form.email || !form.department) { toast.error('Name, email and department are required'); return; }
    if (modal === 'add') createMut.mutate(form);
    else updateMut.mutate(form);
  }

  // Unique license names present in the data for the filter dropdown
  const licenseOptions = Array.from(new Set(
    employees.map(e => e.msLicenseName ?? '—').filter(n => n !== '—')
  )).sort();

  const filtered = employees.filter(e => {
    if (entityF !== 'All' && getEntity(e.email) !== entityF) return false;
    if (licenseF !== 'All') {
      if (licenseF === '—' && e.msLicenseName) return false;
      if (licenseF !== '—' && e.msLicenseName !== licenseF) return false;
    }
    return true;
  });

  const ENTITY_LABELS = ['All', ...Object.values(DOMAIN_ENTITY), 'Unknown'];

  function exportExcel() {
    const rows = filtered.map(e => ({
      'Emp ID':      e.empId,
      'Name':        e.name,
      'Entity':      getEntity(e.email),
      'License':     e.msLicenseName ?? (e.msLicensed === true ? 'Licensed' : '—'),
      'Department':  e.department,
      'Designation': e.designation ?? '',
      'Email':       e.email,
      'Phone':       e.phone ?? '',
      'Manager':     e.manager ?? '',
      'Status':      e.status,
      'Joining Date': e.joiningDate ? new Date(e.joiningDate).toLocaleDateString('en-IN') : '',
      'Exit Date':   e.exitDate ? new Date(e.exitDate).toLocaleDateString('en-IN') : '',
      'Assets':      e.allocations?.length ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, `NGI-Employees-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const total      = filtered.length;
  const active     = filtered.filter(e => e.status === 'Active').length;
  const resigned   = filtered.filter(e => e.status === 'Resigned').length;
  const onLeave    = filtered.filter(e => e.status === 'On Leave').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-gray-200 shrink-0">
        {[
          { label: 'Total Employees', value: total,    icon: Users,    color: 'text-blue-600' },
          { label: 'Active',          value: active,   icon: UserCheck, color: 'text-green-600' },
          { label: 'Resigned',        value: resigned, icon: UserX,    color: 'text-red-600' },
          { label: 'On Leave',        value: onLeave,  icon: Clock,    color: 'text-orange-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-3 flex items-center gap-3">
            <Icon className={`w-8 h-8 ${color}`} />
            <div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold text-gray-800">{value}</p></div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center p-3 border-b border-gray-200 shrink-0">
        <input
          className="input w-56 text-sm"
          placeholder="Search employees…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input w-40 text-sm" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="All">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input w-40 text-sm" value={entityF} onChange={e => setEntityF(e.target.value)}>
          <option value="All">All Entities</option>
          {Object.values(DOMAIN_ENTITY).map(v => <option key={v}>{v}</option>)}
          <option value="Unknown">Unknown</option>
        </select>
        <select className="input w-48 text-sm" value={licenseF} onChange={e => setLicenseF(e.target.value)}>
          <option value="All">All Licenses</option>
          {licenseOptions.map(l => <option key={l} value={l}>{l}</option>)}
          <option value="—">No License</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          {syncResult && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Last sync: <span className="text-green-600 font-semibold">{syncResult.added} added</span>, {syncResult.updated} updated, {syncResult.skipped} skipped
            </span>
          )}
          <button onClick={exportExcel} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Download className="w-4 h-4" /> Export Excel
          </button>
          {isAdmin && (
            <button
              className="btn-secondary flex items-center gap-1.5 text-sm"
              onClick={handleMicrosoftSync}
              disabled={syncing}
              title="Sync employees from Microsoft Azure AD"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Microsoft'}
            </button>
          )}
          <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
            <Briefcase className="w-12 h-12 opacity-30" />
            <p>No employees found</p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {['Emp ID','Name','Entity','License','Department','Designation','Email','Phone','Status','Assets','Joined',''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.flatMap((emp, i) => {
                const rows = [
                  <tr key={emp.id} className={`border-b border-gray-100 hover:bg-blue-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">{emp.empId}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{emp.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700">{getEntity(emp.email)}</span>
                    </td>
                    <td className="px-3 py-2 max-w-[180px] overflow-hidden">
                      {emp.msLicensed === true
                        ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-700 truncate block" title={emp.msLicenseName ?? undefined}>{emp.msLicenseName ?? '—'}</span>
                        : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{emp.department}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.designation || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[180px] truncate">{emp.email}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.phone || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[emp.status] || 'bg-gray-100 text-gray-600'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {emp.allocations && emp.allocations.length > 0 ? (
                        <button
                          onClick={() => setExpandedEmpId(expandedEmpId === emp.id ? null : emp.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          {emp.allocations.length}
                          {expandedEmpId === emp.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(emp)} className="p-1 hover:bg-blue-100 rounded text-blue-600" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openDelete(emp)} className="p-1 hover:bg-red-100 rounded text-red-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ];
                if (expandedEmpId === emp.id && emp.allocations && emp.allocations.length > 0) {
                  rows.push(
                    <tr key={`${emp.id}-assets`} className="bg-blue-50/60 border-b border-blue-100">
                      <td colSpan={12} className="px-6 py-2">
                        <div className="flex flex-wrap gap-2">
                          {emp.allocations.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs shadow-sm">
                              <span className="font-medium text-gray-800">{a.asset?.serviceName}</span>
                              {a.asset?.assetTag && <span className="font-mono text-gray-500">{a.asset.assetTag}</span>}
                              <button
                                onClick={() => returnMut.mutate(a.id)}
                                disabled={returnMut.isPending}
                                className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition-colors"
                                title="Return asset"
                              >
                                <RotateCcw className="w-2.5 h-2.5" /> Return
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                }
                return rows;
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">{modal === 'add' ? 'Add Employee' : 'Edit Employee'}</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {form.email && (
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded text-sm text-indigo-700 font-semibold">
                  Entity: {getEntity(form.email)}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Emp ID" required>
                  <input
                    className="input"
                    value={form.empId}
                    onChange={e => setForm(p => ({ ...p, empId: e.target.value }))}
                    placeholder="Auto-generated if blank"
                    readOnly={modal === 'edit'}
                  />
                </Field>
                <Field label="Full Name" required>
                  <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </Field>
                <Field label="Email" required>
                  <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                </Field>
                <Field label="Department" required>
                  <input className="input" list="depts" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} required />
                  <datalist id="depts">{DEPARTMENTS.map(d => <option key={d} value={d} />)}</datalist>
                </Field>
                <Field label="Designation">
                  <input className="input" value={form.designation || ''} onChange={e => setForm(p => ({ ...p, designation: e.target.value || null }))} />
                </Field>
                <Field label="Phone">
                  <input className="input" value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value || null }))} />
                </Field>
                <Field label="Manager">
                  <input className="input" value={form.manager || ''} onChange={e => setForm(p => ({ ...p, manager: e.target.value || null }))} />
                </Field>
                <Field label="Status">
                  <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Joining Date">
                  <input className="input" type="date" value={form.joiningDate || ''} onChange={e => setForm(p => ({ ...p, joiningDate: e.target.value || null }))} />
                </Field>
                <Field label="Exit Date">
                  <input className="input" type="date" value={form.exitDate || ''} onChange={e => setForm(p => ({ ...p, exitDate: e.target.value || null }))} />
                </Field>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button
                onClick={handleSubmit}
                className="btn-primary"
                disabled={createMut.isPending || updateMut.isPending}
              >
                {createMut.isPending || updateMut.isPending ? 'Saving…' : modal === 'add' ? 'Add Employee' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Delete Employee</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to delete <strong>{selected.name}</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={() => deleteMut.mutate()} className="btn-danger" disabled={deleteMut.isPending}>
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
