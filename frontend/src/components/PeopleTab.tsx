'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/lib/api';
import { Employee } from '@/types';
import toast from 'react-hot-toast';
import { Users, Plus, Pencil, Trash2, X, UserCheck, UserX, Clock, Briefcase } from 'lucide-react';

const DEPARTMENTS = ['IT', 'HR', 'Finance', 'Operations', 'Sales', 'Marketing', 'Management', 'Admin'];
const STATUSES = ['Active', 'Resigned', 'On Leave', 'Probation'];

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
  const [modal, setModal]     = useState<'add' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [form, setForm]       = useState<EmpForm>(EMPTY_FORM);

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

  const total      = employees.length;
  const active     = employees.filter(e => e.status === 'Active').length;
  const resigned   = employees.filter(e => e.status === 'Resigned').length;
  const onLeave    = employees.filter(e => e.status === 'On Leave').length;

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
        <button className="btn-primary flex items-center gap-1.5 text-sm ml-auto" onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">Loading…</div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
            <Briefcase className="w-12 h-12 opacity-30" />
            <p>No employees found</p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {['Emp ID','Name','Department','Designation','Email','Phone','Status','Assets','Joined',''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => (
                <tr key={emp.id} className={`border-b border-gray-100 hover:bg-blue-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">{emp.empId}</td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{emp.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{emp.department}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.designation || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[180px] truncate">{emp.email}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.phone || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[emp.status] || 'bg-gray-100 text-gray-600'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">{emp.allocations?.length ?? 0}</td>
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
              ))}
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
