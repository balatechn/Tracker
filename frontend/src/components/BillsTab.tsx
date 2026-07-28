'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Settings, Trash2, Edit2, Paperclip, Download, X, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { billsApi, entityManagersApi } from '@/lib/api';
import { Bill, EntityManager } from '@/types';

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUSES = ['Submitted', 'Approved', 'Paid', 'Rejected'];
const PAYMENT_METHODS = ['Bank Transfer', 'Cheque', 'Online', 'Cash', 'UPI'];

const STATUS_COLOR: Record<string, string> = {
  Submitted: '#2b579a',
  Approved:  '#217346',
  Paid:      '#107C10',
  Rejected:  '#c0392b',
};

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtAmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
function toInput(v: string | null) { return v ? v.slice(0, 10) : ''; }

// ─── styles ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  lbl: { display: 'block', fontSize: '8.5pt', fontWeight: 700, color: '#595959', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, fontFamily: "'Calibri','Aptos',Arial,sans-serif" },
  inp: { width: '100%', fontSize: '10.5pt', fontFamily: "'Calibri','Aptos',Arial,sans-serif", border: '1px solid #bfbfbf', borderRadius: 0, padding: '4px 6px', background: '#fff', color: '#1f1f1f', outline: 'none', boxSizing: 'border-box' },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={S.lbl}>{label}</label>{children}</div>;
}

function inp(val: string | number, onChange: (v: string) => void, type = 'text', placeholder = '') {
  return (
    <input style={S.inp} type={type} placeholder={placeholder} value={val}
      onChange={e => onChange(e.target.value)}
      onFocus={e => { e.currentTarget.style.borderColor = '#2b579a'; e.currentTarget.style.boxShadow = '0 0 0 1px #2b579a'; }}
      onBlur={e => { e.currentTarget.style.borderColor = '#bfbfbf'; e.currentTarget.style.boxShadow = 'none'; }} />
  );
}

function sel(val: string, onChange: (v: string) => void, options: string[], placeholder = '— Select —') {
  return (
    <select style={S.inp} value={val} onChange={e => onChange(e.target.value)}
      onFocus={e => { e.currentTarget.style.borderColor = '#2b579a'; }}
      onBlur={e => { e.currentTarget.style.borderColor = '#bfbfbf'; }}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

// ─── Bill Form Modal ──────────────────────────────────────────────────────────

interface BillModalProps {
  bill: Bill | null;
  entities: string[];
  username: string;
  userEmail: string;
  onClose: () => void;
}

function BillModal({ bill, entities, username, userEmail, onClose }: BillModalProps) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    vendorName: bill?.vendorName ?? '',
    invoiceNumber: bill?.invoiceNumber ?? '',
    invoiceDate: toInput(bill?.invoiceDate ?? null),
    dueDate: toInput(bill?.dueDate ?? null),
    amount: bill?.amount?.toString() ?? '',
    entity: bill?.entity ?? '',
    paymentMethod: bill?.paymentMethod ?? '',
    submittedBy: bill?.submittedBy ?? username,
    submitterEmail: bill?.submitterEmail ?? userEmail,
    remarks: bill?.remarks ?? '',
  });
  const [attachment, setAttachment] = useState<{ filename: string; mimetype: string; data: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(',')[1];
      setAttachment({ filename: file.name, mimetype: file.type, data: b64 });
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vendorName.trim() || !form.amount || !form.entity) {
      toast.error('Vendor, amount and entity are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        vendorName: form.vendorName,
        invoiceNumber: form.invoiceNumber || null,
        invoiceDate: form.invoiceDate || null,
        dueDate: form.dueDate || null,
        amount: Number(form.amount),
        entity: form.entity,
        paymentMethod: form.paymentMethod || null,
        submittedBy: form.submittedBy,
        submitterEmail: form.submitterEmail,
        remarks: form.remarks || null,
      };

      let saved: Bill;
      if (bill) {
        const r = await billsApi.update(bill.id, payload);
        saved = r.data;
        toast.success('Bill updated');
      } else {
        const r = await billsApi.create(payload);
        saved = r.data;
        toast.success('Bill submitted — email sent');
      }

      if (attachment) {
        await billsApi.addAttachment(saved.id, attachment);
      }

      qc.invalidateQueries({ queryKey: ['bills'] });
      onClose();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 }} className="sm:items-center sm:p-4" onClick={onClose}>
      <div style={{ background: '#fff', border: '1px solid #bfbfbf', width: '100%', maxWidth: 660, maxHeight: '95vh', overflowY: 'auto', fontFamily: "'Calibri','Aptos',Arial,sans-serif", display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ background: '#2b579a', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '11pt' }}>
            {bill ? 'Edit Bill' : 'Submit Bill for Payment'}
          </span>
          <button onClick={onClose} style={{ color: '#c7d8f0', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Vendor / Payee *">{inp(form.vendorName, v => set('vendorName', v), 'text', 'Vendor name')}</Field>
            <Field label="Invoice Number">{inp(form.invoiceNumber, v => set('invoiceNumber', v), 'text', 'INV-001')}</Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Amount (INR) *">{inp(form.amount, v => set('amount', v), 'number', '0.00')}</Field>
            <Field label="Invoice Date">{inp(form.invoiceDate, v => set('invoiceDate', v), 'date')}</Field>
            <Field label="Due Date">{inp(form.dueDate, v => set('dueDate', v), 'date')}</Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Entity / Company *">
              {sel(form.entity, v => set('entity', v), entities, '— Select Entity —')}
            </Field>
            <Field label="Payment Method">
              {sel(form.paymentMethod, v => set('paymentMethod', v), PAYMENT_METHODS)}
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Submitted By *">{inp(form.submittedBy, v => set('submittedBy', v))}</Field>
            <Field label="Submitter Email *">{inp(form.submitterEmail, v => set('submitterEmail', v), 'email')}</Field>
          </div>

          <Field label="Remarks">
            <textarea style={{ ...S.inp, resize: 'none' }} rows={2} value={form.remarks}
              onChange={e => set('remarks', e.target.value)}
              onFocus={e => { e.currentTarget.style.borderColor = '#2b579a'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#bfbfbf'; }} />
          </Field>

          <div>
            <label style={S.lbl}>Invoice Attachment (PDF / Image)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={() => fileRef.current?.click()}
                style={{ background: '#f2f2f2', border: '1px solid #bfbfbf', padding: '4px 12px', fontSize: '10pt', fontFamily: "'Calibri',Arial,sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#1f1f1f' }}>
                <Paperclip size={13} /> Choose File
              </button>
              {attachment && <span style={{ fontSize: '10pt', color: '#595959' }}>{attachment.filename}</span>}
              {!attachment && bill?.attachments?.length ? (
                <span style={{ fontSize: '10pt', color: '#595959' }}>{bill.attachments.length} file(s) already attached</span>
              ) : null}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={handleFile} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 10, borderTop: '1px solid #d0d0d0', marginTop: 2 }}>
            <button type="button" onClick={onClose}
              style={{ background: '#f2f2f2', border: '1px solid #bfbfbf', padding: '4px 16px', fontSize: '10pt', fontFamily: "'Calibri',Arial,sans-serif", cursor: 'pointer', color: '#1f1f1f' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ background: saving ? '#7a9fcb' : '#2b579a', border: '1px solid #1f4278', color: '#fff', padding: '4px 20px', fontSize: '10pt', fontFamily: "'Calibri',Arial,sans-serif", cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving && <span style={{ width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />}
              {saving ? 'Saving…' : bill ? 'Update Bill' : 'Submit Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Status Update Modal ──────────────────────────────────────────────────────

function StatusModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(bill.status);
  const [rejectionReason, setRejectionReason] = useState(bill.rejectionReason ?? '');
  const [paidBy, setPaidBy] = useState(bill.paidBy ?? '');
  const [transactionRef, setTransactionRef] = useState(bill.transactionRef ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await billsApi.update(bill.id, {
        status,
        rejectionReason: status === 'Rejected' ? (rejectionReason || null) : null,
        paidAt: status === 'Paid' ? new Date().toISOString() : (bill.paidAt ?? null),
        paidBy: status === 'Paid' ? (paidBy || null) : (bill.paidBy ?? null),
        transactionRef: status === 'Paid' ? (transactionRef || null) : (bill.transactionRef ?? null),
      });
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['bills'] });
      onClose();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', border: '1px solid #bfbfbf', width: '100%', maxWidth: 400, fontFamily: "'Calibri','Aptos',Arial,sans-serif" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#2b579a', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '11pt' }}>Update Status</span>
          <button onClick={onClose} style={{ color: '#c7d8f0', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Status">{sel(status, setStatus, STATUSES)}</Field>
          {status === 'Rejected' && (
            <Field label="Rejection Reason">
              <textarea style={{ ...S.inp, resize: 'none' }} rows={2} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
            </Field>
          )}
          {status === 'Paid' && <>
            <Field label="Paid By">{inp(paidBy, setPaidBy, 'text', 'Name of person')}</Field>
            <Field label="Transaction Ref">{inp(transactionRef, setTransactionRef, 'text', 'UTR / Cheque no.')}</Field>
          </>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid #d0d0d0' }}>
            <button onClick={onClose} style={{ background: '#f2f2f2', border: '1px solid #bfbfbf', padding: '4px 14px', fontSize: '10pt', cursor: 'pointer', color: '#1f1f1f', fontFamily: "'Calibri',Arial,sans-serif" }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ background: '#2b579a', border: '1px solid #1f4278', color: '#fff', padding: '4px 16px', fontSize: '10pt', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Calibri',Arial,sans-serif" }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Entity Manager Settings Modal ───────────────────────────────────────────

function EntityManagersModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: managers = [] } = useQuery({ queryKey: ['entity-managers'], queryFn: () => entityManagersApi.list().then(r => r.data) });
  const [form, setForm] = useState({ entityName: '', managerName: '', managerEmail: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(em: EntityManager) {
    setEditId(em.id);
    setForm({ entityName: em.entityName, managerName: em.managerName, managerEmail: em.managerEmail });
  }
  function cancelEdit() { setEditId(null); setForm({ entityName: '', managerName: '', managerEmail: '' }); }

  async function save() {
    if (!form.entityName.trim() || !form.managerName.trim() || !form.managerEmail.trim()) {
      toast.error('All fields required'); return;
    }
    setSaving(true);
    try {
      if (editId) {
        await entityManagersApi.update(editId, form);
        toast.success('Updated');
      } else {
        await entityManagersApi.create(form);
        toast.success('Added');
      }
      qc.invalidateQueries({ queryKey: ['entity-managers'] });
      cancelEdit();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Save failed');
    } finally { setSaving(false); }
  }

  async function del(id: number, name: string) {
    if (!confirm(`Delete entity "${name}"?`)) return;
    try {
      await entityManagersApi.delete(id);
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['entity-managers'] });
    } catch { toast.error('Delete failed'); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', border: '1px solid #bfbfbf', width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', fontFamily: "'Calibri','Aptos',Arial,sans-serif" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#2b579a', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '11pt' }}>Entity → Account Manager Mapping</span>
          <button onClick={onClose} style={{ color: '#c7d8f0', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 12 }}>
            <Field label="Entity Name">{inp(form.entityName, v => setForm(f => ({ ...f, entityName: v })), 'text', 'e.g. NGI Pvt Ltd')}</Field>
            <Field label="Manager Name">{inp(form.managerName, v => setForm(f => ({ ...f, managerName: v })), 'text', 'Full name')}</Field>
            <Field label="Manager Email">{inp(form.managerEmail, v => setForm(f => ({ ...f, managerEmail: v })), 'email', 'manager@example.com')}</Field>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={save} disabled={saving}
                style={{ background: '#2b579a', border: '1px solid #1f4278', color: '#fff', padding: '4px 12px', fontSize: '10pt', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Calibri',Arial,sans-serif", height: 30 }}>
                {editId ? 'Update' : 'Add'}
              </button>
              {editId && <button onClick={cancelEdit} style={{ background: '#f2f2f2', border: '1px solid #bfbfbf', padding: '4px 8px', fontSize: '10pt', cursor: 'pointer', fontFamily: "'Calibri',Arial,sans-serif", height: 30 }}>✕</button>}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
            <thead>
              <tr style={{ background: '#f0f4f8' }}>
                <th style={{ textAlign: 'left', padding: '7px 10px', color: '#444', fontWeight: 600, borderBottom: '2px solid #dde3ec' }}>Entity</th>
                <th style={{ textAlign: 'left', padding: '7px 10px', color: '#444', fontWeight: 600, borderBottom: '2px solid #dde3ec' }}>Manager</th>
                <th style={{ textAlign: 'left', padding: '7px 10px', color: '#444', fontWeight: 600, borderBottom: '2px solid #dde3ec' }}>Email</th>
                <th style={{ width: 60, borderBottom: '2px solid #dde3ec' }}></th>
              </tr>
            </thead>
            <tbody>
              {managers.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#888', fontSize: '10pt' }}>No entities configured yet</td></tr>
              )}
              {managers.map(em => (
                <tr key={em.id} style={{ borderBottom: '1px solid #eef0f3' }}>
                  <td style={{ padding: '7px 10px', color: '#1f1f1f' }}>{em.entityName}</td>
                  <td style={{ padding: '7px 10px', color: '#333' }}>{em.managerName}</td>
                  <td style={{ padding: '7px 10px', color: '#333' }}>{em.managerEmail}</td>
                  <td style={{ padding: '7px 6px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => startEdit(em)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2b579a', padding: 3 }}><Edit2 size={13} /></button>
                      <button onClick={() => del(em.id, em.entityName)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', padding: 3 }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main BillsTab ────────────────────────────────────────────────────────────

export default function BillsTab() {
  const qc = useQueryClient();
  const username = typeof window !== 'undefined' ? (localStorage.getItem('username') ?? 'Admin') : 'Admin';
  const userEmail = 'bala@nationalgroupindia.com';

  const { data: bills = [], isLoading } = useQuery({ queryKey: ['bills'], queryFn: () => billsApi.list().then(r => r.data) });
  const { data: managers = [] } = useQuery({ queryKey: ['entity-managers'], queryFn: () => entityManagersApi.list().then(r => r.data) });

  const [showForm, setShowForm] = useState(false);
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [statusBill, setStatusBill] = useState<Bill | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEntity, setFilterEntity] = useState('');

  const entities = managers.map(m => m.entityName);

  const filtered = bills.filter(b =>
    (!filterStatus || b.status === filterStatus) &&
    (!filterEntity || b.entity === filterEntity)
  );

  // KPI
  const totalSubmitted = bills.filter(b => b.status === 'Submitted').length;
  const totalApproved  = bills.filter(b => b.status === 'Approved').length;
  const totalPaid      = bills.filter(b => b.status === 'Paid').length;
  const totalRejected  = bills.filter(b => b.status === 'Rejected').length;
  const pendingAmount  = bills.filter(b => b.status === 'Submitted' || b.status === 'Approved').reduce((s, b) => s + b.amount, 0);

  async function deleteBill(id: number, name: string) {
    if (!confirm(`Delete bill from "${name}"?`)) return;
    try {
      await billsApi.delete(id);
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['bills'] });
    } catch { toast.error('Delete failed'); }
  }

  const TH: React.CSSProperties = { textAlign: 'left', padding: '7px 10px', color: '#444', fontWeight: 600, borderBottom: '2px solid #dde3ec', background: '#f0f4f8', fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };
  const TD: React.CSSProperties = { padding: '7px 10px', borderBottom: '1px solid #eef0f3', fontSize: '10.5pt', color: '#333', verticalAlign: 'middle' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Calibri','Aptos',Arial,sans-serif" }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #dde3ec', background: '#fff', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: '12pt', color: '#1f1f1f' }}>Bill Payments</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowSettings(true)}
            style={{ background: '#f2f2f2', border: '1px solid #bfbfbf', padding: '4px 12px', fontSize: '10pt', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#1f1f1f', fontFamily: "'Calibri',Arial,sans-serif" }}>
            <Settings size={13} /> Entity Settings
          </button>
          <button onClick={() => { setEditBill(null); setShowForm(true); }}
            style={{ background: '#2b579a', border: '1px solid #1f4278', color: '#fff', padding: '4px 14px', fontSize: '10pt', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Calibri',Arial,sans-serif" }}>
            <Plus size={14} /> Submit Bill
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, padding: '12px 16px', background: '#fafafa', borderBottom: '1px solid #e8e8e8', flexShrink: 0 }}>
        {[
          { label: 'Pending Amount', value: fmtAmt(pendingAmount), color: '#2b579a', icon: '💰' },
          { label: 'Submitted', value: totalSubmitted, color: '#2b579a', icon: '📤' },
          { label: 'Approved', value: totalApproved, color: '#217346', icon: '✅' },
          { label: 'Paid', value: totalPaid, color: '#107C10', icon: '💳' },
          { label: 'Rejected', value: totalRejected, color: '#c0392b', icon: '❌' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '10px 12px' }}>
            <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#595959', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: '16pt', fontWeight: 700, color: k.color, marginTop: 4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e8e8e8', flexShrink: 0, flexWrap: 'wrap' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ ...S.inp, width: 'auto', minWidth: 130, fontSize: '10pt' }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
          style={{ ...S.inp, width: 'auto', minWidth: 160, fontSize: '10pt' }}>
          <option value="">All Entities</option>
          {entities.map(e => <option key={e}>{e}</option>)}
        </select>
        {(filterStatus || filterEntity) && (
          <button onClick={() => { setFilterStatus(''); setFilterEntity(''); }}
            style={{ background: 'none', border: '1px solid #bfbfbf', padding: '3px 10px', fontSize: '10pt', cursor: 'pointer', color: '#595959', fontFamily: "'Calibri',Arial,sans-serif" }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💳</div>
            <div style={{ fontSize: '11pt' }}>No bills found</div>
            <div style={{ fontSize: '10pt', marginTop: 4 }}>Click "Submit Bill" to add one</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={TH}>Date</th>
                  <th style={TH}>Vendor</th>
                  <th style={TH}>Invoice #</th>
                  <th style={TH}>Entity</th>
                  <th style={TH}>Amount</th>
                  <th style={TH}>Due</th>
                  <th style={TH}>Status</th>
                  <th style={TH}>Submitted By</th>
                  <th style={TH}>Files</th>
                  <th style={{ ...TH, width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} style={{ background: '#fff' }}>
                    <td style={TD}>{fmt(b.createdAt)}</td>
                    <td style={{ ...TD, fontWeight: 600, color: '#1f1f1f' }}>{b.vendorName}</td>
                    <td style={TD}>{b.invoiceNumber ?? '—'}</td>
                    <td style={TD}>{b.entity}</td>
                    <td style={{ ...TD, fontWeight: 700, color: '#2b579a' }}>{fmtAmt(b.amount)}</td>
                    <td style={{ ...TD, color: b.dueDate && new Date(b.dueDate) < new Date() && b.status !== 'Paid' ? '#c0392b' : '#333', fontWeight: b.dueDate && new Date(b.dueDate) < new Date() && b.status !== 'Paid' ? 700 : 400 }}>
                      {fmt(b.dueDate)}
                    </td>
                    <td style={TD}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: '9.5pt', fontWeight: 600, background: STATUS_COLOR[b.status] + '22', color: STATUS_COLOR[b.status] ?? '#333' }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={TD}>{b.submittedBy}</td>
                    <td style={TD}>
                      {b.attachments?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {b.attachments.map(a => (
                            <a key={a.id} href={billsApi.getAttachmentUrl(b.id, a.id)} target="_blank" rel="noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#2b579a', fontSize: '9.5pt', textDecoration: 'none' }}>
                              <Download size={11} /> {a.filename}
                            </a>
                          ))}
                        </div>
                      ) : <span style={{ color: '#aaa', fontSize: '9.5pt' }}>—</span>}
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button title="Update status" onClick={() => setStatusBill(b)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#217346', padding: 3 }}>
                          <CheckCircle size={14} />
                        </button>
                        <button title="Edit bill" onClick={() => { setEditBill(b); setShowForm(true); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2b579a', padding: 3 }}>
                          <Edit2 size={14} />
                        </button>
                        <button title="Delete" onClick={() => deleteBill(b.id, b.vendorName)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', padding: 3 }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <BillModal
          bill={editBill}
          entities={entities}
          username={username}
          userEmail={userEmail}
          onClose={() => { setShowForm(false); setEditBill(null); }}
        />
      )}
      {statusBill && <StatusModal bill={statusBill} onClose={() => setStatusBill(null)} />}
      {showSettings && <EntityManagersModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
