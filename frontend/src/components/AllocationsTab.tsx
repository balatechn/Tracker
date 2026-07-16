'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { allocationsApi, employeesApi, entriesApi } from '@/lib/api';
import { Allocation } from '@/types';
import toast from 'react-hot-toast';
import { ArrowLeftRight, Plus, RotateCcw, X, Package, Printer, Pencil, ChevronDown } from 'lucide-react';
import { printHandover } from '@/lib/handover';

const STATUS_COLORS: Record<string, string> = {
  Active:   'bg-green-100 text-green-700',
  Returned: 'bg-gray-100 text-gray-600',
};

const FLAT: React.CSSProperties = {
  border: '1px solid #bfbfbf', borderRadius: 0, padding: '3px 7px',
  fontSize: '10.5pt', fontFamily: "'Calibri','Aptos',Arial,sans-serif",
  background: '#fff', color: '#1f1f1f', width: '100%', boxSizing: 'border-box',
};

const LBL: React.CSSProperties = {
  display: 'block', fontSize: '8.5pt', fontWeight: 700, color: '#595959',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3,
  fontFamily: "'Calibri','Aptos',Arial,sans-serif",
};

// Multi-select dropdown component
function MultiSelect({ options, selected, onChange, placeholder }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);
  const label = selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`;
  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 160 }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        ...FLAT, width: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '3px 7px', cursor: 'pointer',
      }}>
        <span style={{ fontSize: '10.5pt' }}>{label}</span>
        <ChevronDown size={11} style={{ color: '#595959', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 100, background: '#fff',
          border: '1px solid #bfbfbf', minWidth: 180, maxHeight: 240, overflowY: 'auto',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        }}>
          {options.map(opt => (
            <label key={opt} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px',
              cursor: 'pointer', fontSize: '10.5pt', fontFamily: "'Calibri',Arial,sans-serif",
              background: selected.includes(opt) ? '#e8eef7' : '#fff',
            }}
            onMouseEnter={e => { if (!selected.includes(opt)) (e.currentTarget as HTMLElement).style.background = '#f5f5f5'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected.includes(opt) ? '#e8eef7' : '#fff'; }}
            >
              <input type="checkbox" checked={selected.includes(opt)} style={{ accentColor: '#2b579a' }}
                onChange={e => onChange(e.target.checked ? [...selected, opt] : selected.filter(s => s !== opt))} />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AllocationsTab() {
  const qc = useQueryClient();
  const [statusF, setStatusF]   = useState('Active');
  const [search, setSearch]     = useState('');
  const [locationF, setLocationF] = useState('All');
  const [categoryF, setCategoryF] = useState<string[]>([]);
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

  const editEmployeeOptions = modal === 'edit' && selected
    ? [selected.employee, ...employees.filter(e => e.id !== selected.employee.id)]
    : employees;

  const { data: entries = [] } = useQuery({
    queryKey: ['entries'],
    queryFn: () => entriesApi.list().then(r => r.data),
    enabled: modal === 'allocate',
  });

  const availableAssets = entries.filter(e => e.assetStatus === 'Available' || !e.assetStatus);

  const createMut = useMutation({
    mutationFn: () => allocationsApi.create({
      assetId: parseInt(form.assetId),
      employeeId: parseInt(form.employeeId),
      notes: form.notes || undefined,
      allocatedAt: form.allocatedAt || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['allocations'] }); qc.invalidateQueries({ queryKey: ['entries'] }); toast.success('Asset allocated'); closeModal(); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Allocation failed'),
  });

  const editMut = useMutation({
    mutationFn: () => allocationsApi.update(selected!.id, {
      employeeId: editForm.employeeId ? parseInt(editForm.employeeId) : undefined,
      allocatedAt: editForm.allocatedAt || undefined,
      notes: editForm.notes,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['allocations'] }); toast.success('Allocation updated'); closeModal(); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Update failed'),
  });

  const returnMut = useMutation({
    mutationFn: () => allocationsApi.return(selected!.id, { returnNotes: returnNote || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['allocations'] }); qc.invalidateQueries({ queryKey: ['entries'] }); toast.success('Asset returned'); closeModal(); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Return failed'),
  });

  function openAllocate() { setForm({ assetId: '', employeeId: '', notes: '', allocatedAt: '' }); setModal('allocate'); }
  function openReturn(a: Allocation) { setSelected(a); setReturnNote(''); setModal('return'); }
  function openEdit(a: Allocation) {
    setSelected(a);
    setEditForm({ employeeId: String(a.employee.id), allocatedAt: a.allocatedAt ? new Date(a.allocatedAt).toISOString().slice(0, 10) : '', notes: a.notes || '' });
    setModal('edit');
  }
  function closeModal() { setModal(null); setSelected(null); }

  // Unique filter values
  const locations = Array.from(new Set(allocations.map(a => a.asset.location).filter(Boolean))).sort() as string[];
  const categories = Array.from(new Set(allocations.map(a => a.asset.category).filter(Boolean))).sort() as string[];

  const filtered = allocations.filter(a => {
    const q = search.toLowerCase();
    if (q && !(a.asset.serviceName.toLowerCase().includes(q) || a.employee.name.toLowerCase().includes(q) || a.employee.department.toLowerCase().includes(q))) return false;
    if (locationF !== 'All' && a.asset.location !== locationF) return false;
    if (categoryF.length > 0 && !categoryF.includes(a.asset.category ?? '')) return false;
    return true;
  });

  const total    = allocations.length;
  const active   = allocations.filter(a => a.status === 'Active').length;
  const returned = allocations.filter(a => a.status === 'Returned').length;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "'Calibri','Aptos',Arial,sans-serif" }}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-3 border-b border-[#d0d0d0] shrink-0" style={{ background: '#f3f3f3' }}>
        {[
          { label: 'Total Allocations', value: total,    color: '#2b579a' },
          { label: 'Currently Active',  value: active,   color: '#375623' },
          { label: 'Returned',          value: returned, color: '#595959' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #d0d0d0', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ArrowLeftRight size={20} style={{ color }} />
            <div>
              <p style={{ fontSize: '8.5pt', color: '#595959', margin: 0 }}>{label}</p>
              <p style={{ fontSize: '18pt', fontWeight: 700, color, margin: 0, lineHeight: 1.1 }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid #d0d0d0', background: '#f3f3f3', flexShrink: 0 }}>
        <input style={{ ...FLAT, width: 220 }} placeholder="Search assets or employees…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...FLAT, width: 120 }} value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Returned">Returned</option>
        </select>
        <select style={{ ...FLAT, width: 160 }} value={locationF} onChange={e => setLocationF(e.target.value)}>
          <option value="All">All Locations</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <MultiSelect options={categories} selected={categoryF} onChange={setCategoryF} placeholder="All Categories" />
        {(categoryF.length > 0 || locationF !== 'All') && (
          <button onClick={() => { setCategoryF([]); setLocationF('All'); }} style={{ fontSize: '9pt', color: '#c00000', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>
            Clear filters
          </button>
        )}
        <button onClick={openAllocate} style={{ marginLeft: 'auto', background: '#2b579a', color: '#fff', border: '1px solid #1f4278', padding: '4px 14px', fontSize: '10.5pt', fontFamily: "'Calibri',Arial,sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={14} /> Allocate Asset
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto" style={{ background: '#fff' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: '#595959' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: '#a0a0a0', gap: 8 }}>
            <Package size={40} style={{ opacity: 0.3 }} />
            <p>No allocations found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt', fontFamily: "'Calibri','Aptos',Arial,sans-serif" }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: '#1f3864', color: '#fff' }}>
                {['#', 'Asset', 'Category', 'Location', 'Employee', 'Department', 'Allocated', 'Returned', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '10pt', whiteSpace: 'nowrap', borderRight: '1px solid #2a4a7f' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#f5f5f5', borderBottom: '1px solid #e8e8e8' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#dce6f1')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f5f5f5')}
                >
                  <td style={{ padding: '4px 8px', color: '#a0a0a0', whiteSpace: 'nowrap' }}>{a.id}</td>
                  <td style={{ padding: '4px 8px', fontWeight: 600, whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.asset.serviceName}
                    {a.asset.assetTag && <span style={{ marginLeft: 4, fontSize: '9pt', color: '#a0a0a0' }}>({a.asset.assetTag})</span>}
                  </td>
                  <td style={{ padding: '4px 8px', color: '#595959', whiteSpace: 'nowrap' }}>{a.asset.category || '—'}</td>
                  <td style={{ padding: '4px 8px', color: '#595959', whiteSpace: 'nowrap' }}>{a.asset.location || '—'}</td>
                  <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 500 }}>{a.employee.name}</div>
                    <div style={{ fontSize: '9pt', color: '#a0a0a0' }}>{a.employee.empId}</div>
                  </td>
                  <td style={{ padding: '4px 8px', color: '#595959', whiteSpace: 'nowrap' }}>{a.employee.department}</td>
                  <td style={{ padding: '4px 8px', color: '#595959', whiteSpace: 'nowrap' }}>{new Date(a.allocatedAt).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '4px 8px', color: '#595959', whiteSpace: 'nowrap' }}>{a.returnedAt ? new Date(a.returnedAt).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                    <span style={{ padding: '1px 8px', fontSize: '9.5pt', fontWeight: 600, background: a.status === 'Active' ? '#e2efda' : '#f2f2f2', color: a.status === 'Active' ? '#375623' : '#595959' }}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                    {a.status === 'Active' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => openEdit(a)} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '9pt', padding: '2px 8px', background: '#f2f2f2', border: '1px solid #bfbfbf', cursor: 'pointer', color: '#3b3b3b' }}>
                          <Pencil size={11} /> Edit
                        </button>
                        <button onClick={() => openReturn(a)} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '9pt', padding: '2px 8px', background: '#fce4d6', border: '1px solid #c55a11', cursor: 'pointer', color: '#833c00' }}>
                          <RotateCcw size={11} /> Return
                        </button>
                        <button onClick={() => printHandover(a)} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '9pt', padding: '2px 8px', background: '#dce6f1', border: '1px solid #2b579a', cursor: 'pointer', color: '#1f3864' }}>
                          <Printer size={11} /> Handover
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={closeModal}>
          <div style={{ background: '#fff', border: '1px solid #bfbfbf', width: '100%', maxWidth: 520, fontFamily: "'Calibri','Aptos',Arial,sans-serif" }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#2b579a', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '11pt' }}>Allocate Asset</span>
              <button onClick={closeModal} style={{ color: '#c7d8f0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={LBL}>Asset <span style={{ color: '#c00000' }}>*</span></label>
                <select style={FLAT} value={form.assetId} onChange={e => setForm(p => ({ ...p, assetId: e.target.value }))}>
                  <option value="">— Select available asset —</option>
                  {availableAssets.map(e => (
                    <option key={e.id} value={e.id}>{e.serviceName}{e.assetTag ? ` [${e.assetTag}]` : ''}{e.category ? ` — ${e.category}` : ''}</option>
                  ))}
                </select>
                {availableAssets.length === 0 && <p style={{ fontSize: '9pt', color: '#c00000', marginTop: 4 }}>No available assets found.</p>}
              </div>
              <div>
                <label style={LBL}>Employee <span style={{ color: '#c00000' }}>*</span></label>
                <select style={FLAT} value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}>
                  <option value="">— Select employee —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.empId}) — {e.department}</option>)}
                </select>
              </div>
              <div>
                <label style={LBL}>Allocation Date</label>
                <input style={FLAT} type="date" value={form.allocatedAt} onChange={e => setForm(p => ({ ...p, allocatedAt: e.target.value }))} />
              </div>
              <div>
                <label style={LBL}>Notes</label>
                <textarea style={{ ...FLAT, resize: 'none' }} rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid #d0d0d0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={closeModal} style={{ background: '#f2f2f2', border: '1px solid #bfbfbf', padding: '4px 16px', fontSize: '10.5pt', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { if (!form.assetId || !form.employeeId) { toast.error('Asset and employee are required'); return; } createMut.mutate(); }}
                disabled={createMut.isPending}
                style={{ background: createMut.isPending ? '#7a9fcb' : '#2b579a', border: '1px solid #1f4278', color: '#fff', padding: '4px 20px', fontSize: '10.5pt', cursor: 'pointer' }}>
                {createMut.isPending ? 'Allocating…' : 'Allocate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={closeModal}>
          <div style={{ background: '#fff', border: '1px solid #bfbfbf', width: '100%', maxWidth: 480, fontFamily: "'Calibri','Aptos',Arial,sans-serif" }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#2b579a', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '11pt' }}>Edit Allocation</span>
              <button onClick={closeModal} style={{ color: '#c7d8f0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#f5f5f5', border: '1px solid #d0d0d0', padding: '8px 12px', fontSize: '10pt' }}>
                <strong>{selected.asset.serviceName}</strong>
                {selected.asset.assetTag && <span style={{ color: '#595959', marginLeft: 6 }}>[{selected.asset.assetTag}]</span>}
                {selected.asset.category && <span style={{ color: '#595959', marginLeft: 6 }}>• {selected.asset.category}</span>}
              </div>
              <div>
                <label style={LBL}>Employee <span style={{ color: '#c00000' }}>*</span></label>
                <select style={FLAT} value={editForm.employeeId} onChange={e => setEditForm(p => ({ ...p, employeeId: e.target.value }))}>
                  <option value="">— Select employee —</option>
                  {editEmployeeOptions.map(e => <option key={e.id} value={String(e.id)}>{e.name} ({e.empId}) — {e.department}</option>)}
                </select>
              </div>
              <div>
                <label style={LBL}>Allocation Date</label>
                <input style={FLAT} type="date" value={editForm.allocatedAt} onChange={e => setEditForm(p => ({ ...p, allocatedAt: e.target.value }))} />
              </div>
              <div>
                <label style={LBL}>Notes</label>
                <textarea style={{ ...FLAT, resize: 'none' }} rows={2} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid #d0d0d0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={closeModal} style={{ background: '#f2f2f2', border: '1px solid #bfbfbf', padding: '4px 16px', fontSize: '10.5pt', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { if (!editForm.employeeId) { toast.error('Employee is required'); return; } editMut.mutate(); }}
                disabled={editMut.isPending}
                style={{ background: editMut.isPending ? '#7a9fcb' : '#2b579a', border: '1px solid #1f4278', color: '#fff', padding: '4px 20px', fontSize: '10.5pt', cursor: 'pointer' }}>
                {editMut.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {modal === 'return' && selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={closeModal}>
          <div style={{ background: '#fff', border: '1px solid #bfbfbf', width: '100%', maxWidth: 420, fontFamily: "'Calibri','Aptos',Arial,sans-serif" }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#833c00', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '11pt' }}>Return Asset</span>
              <button onClick={closeModal} style={{ color: '#fce4d6', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#fce4d6', border: '1px solid #c55a11', padding: '8px 12px', fontSize: '10pt', color: '#4d2300' }}>
                Return <strong>{selected.asset.serviceName}</strong> from <strong>{selected.employee.name}</strong>?
              </div>
              <div>
                <label style={LBL}>Return Notes (optional)</label>
                <textarea style={{ ...FLAT, resize: 'none' }} rows={2} value={returnNote} onChange={e => setReturnNote(e.target.value)} />
              </div>
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid #d0d0d0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={closeModal} style={{ background: '#f2f2f2', border: '1px solid #bfbfbf', padding: '4px 16px', fontSize: '10.5pt', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => returnMut.mutate()} disabled={returnMut.isPending}
                style={{ background: returnMut.isPending ? '#b07040' : '#833c00', border: '1px solid #4d2300', color: '#fff', padding: '4px 20px', fontSize: '10.5pt', cursor: 'pointer' }}>
                {returnMut.isPending ? 'Processing…' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
