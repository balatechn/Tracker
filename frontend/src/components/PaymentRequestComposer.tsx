'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { X, Eye, Send } from 'lucide-react';
import { billsApi, PaymentRequestRow } from '@/lib/api';
import { Bill } from '@/types';

const PAYMENT_TERMS = ['Part Payment', 'Final Invoice', 'Advance', 'Full Payment'];

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function shortDate(d: string | null) {
  if (!d) return '';
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, '0')}-${MON[x.getMonth()]}-${String(x.getFullYear()).slice(2)}`;
}
function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function nextMonday() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7));
  return d;
}
function splitEmails(s: string) {
  return s.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean);
}

type RowState = PaymentRequestRow & { billId: number };

const inp: React.CSSProperties = { border: '1px solid #bfbfbf', padding: '5px 7px', fontSize: 13, width: '100%', fontFamily: 'inherit' };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3, display: 'block' };

export default function PaymentRequestComposer({ bills, onClose }: { bills: Bill[]; onClose: () => void }) {
  const [start, setStart] = useState(() => isoDay(nextMonday()));
  const end = useMemo(() => { const d = new Date(start); d.setDate(d.getDate() + 6); return isoDay(d); }, [start]);

  const startD = new Date(start), endD = new Date(end);
  const defaultSubject = `List of Payments Required for the Week: ${ordinal(startD.getDate())} ${MON[startD.getMonth()]} – ${String(endD.getDate()).padStart(2, '0')}${ordinal(endD.getDate()).replace(/\d+/, '')} ${MON[endD.getMonth()]}'${endD.getFullYear()}`;
  const defaultIntro = `Please find below the list of payments required for the week starting from ${ordinal(startD.getDate())} ${MON[startD.getMonth()]} & ending on ${ordinal(endD.getDate())} ${MON[endD.getMonth()]} ${endD.getFullYear()}.`;

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState<string | null>(null);
  const [intro, setIntro] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unpaid = useMemo(
    () => bills.filter(b => b.status === 'Submitted' || b.status === 'Approved')
      .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')),
    [bills]
  );

  const idsDueIn = (from: string) => {
    const d = new Date(from); d.setDate(d.getDate() + 6);
    const to = isoDay(d);
    return new Set(unpaid.filter(b => b.dueDate && b.dueDate.slice(0, 10) >= from && b.dueDate.slice(0, 10) <= to).map(b => b.id));
  };
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => idsDueIn(start));

  const [rows, setRows] = useState<RowState[]>(() => unpaid.map(b => ({
    billId: b.id,
    entity: b.entity,
    vendorName: b.vendorName,
    natureOfExpense: '',
    invoiceNumber: b.invoiceNumber ?? '',
    invoiceDate: shortDate(b.invoiceDate),
    amount: b.amount,
    dueDate: shortDate(b.dueDate),
    paymentTerms: '',
    remarks: b.remarks ?? '',
  })));

  function changeWeek(from: string) {
    setStart(from);
    setSelectedIds(idsDueIn(from));
    setPreviewHtml(null);
  }
  function toggle(id: number, on: boolean) {
    setSelectedIds(s => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
    setPreviewHtml(null);
  }
  function updateRow(id: number, patch: Partial<RowState>) {
    setRows(rs => rs.map(r => (r.billId === id ? { ...r, ...patch } : r)));
    setPreviewHtml(null);
  }

  const effectiveRows = rows.map(r => ({ ...r, selected: selectedIds.has(r.billId) }));
  const selected = effectiveRows.filter(r => r.selected);
  const payload = () => ({
    to: splitEmails(to),
    cc: splitEmails(cc),
    subject: subject ?? defaultSubject,
    intro: intro ?? defaultIntro,
    rows: selected.map(({ billId: _b, selected: _s, ...r }) => r),
  });

  async function preview() {
    if (!selected.length) { toast.error('Select at least one bill'); return; }
    setBusy(true);
    try {
      const { data } = await billsApi.paymentRequest({ ...payload(), preview: true });
      setPreviewHtml(data.html ?? '');
    } catch { toast.error('Preview failed'); }
    finally { setBusy(false); }
  }

  async function send() {
    const p = payload();
    if (!p.to.length) { toast.error('Enter at least one To address'); return; }
    if (!selected.length) { toast.error('Select at least one bill'); return; }
    if (!confirm(`Send to ${[...p.to, ...p.cc].join(', ')}?`)) return;
    setBusy(true);
    try {
      await billsApi.paymentRequest(p);
      toast.success('Payment request email sent');
      onClose();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Send failed');
    } finally { setBusy(false); }
  }

  const cell = { ...inp, padding: '3px 5px', fontSize: 12 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'stretch', padding: 12 }} onClick={onClose}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 1250, display: 'flex', flexDirection: 'column', fontFamily: "'Calibri','Aptos',Arial,sans-serif" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#2b579a', color: '#fff', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Payment Request — Compose</strong>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 16, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <span style={lbl}>Week starting</span>
              <input type="date" style={inp} value={start} onChange={e => e.target.value && changeWeek(e.target.value)} />
              <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>to {shortDate(end)}</div>
            </div>
            <div>
              <span style={lbl}>To *</span>
              <input style={inp} value={to} onChange={e => setTo(e.target.value)} placeholder="name@company.com; name2@company.com" />
            </div>
            <div>
              <span style={lbl}>CC</span>
              <input style={inp} value={cc} onChange={e => setCc(e.target.value)} placeholder="Optional, separate with ;" />
            </div>
          </div>
          <div>
            <span style={lbl}>Subject</span>
            <input style={inp} value={subject ?? defaultSubject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <span style={lbl}>Message</span>
            <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={intro ?? defaultIntro} onChange={e => { setIntro(e.target.value); setPreviewHtml(null); }} />
          </div>

          <div>
            <span style={lbl}>Bills ({selected.length} selected · unpaid bills due in the selected week are ticked)</span>
            <div style={{ overflowX: 'auto', border: '1px solid #ddd' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12, minWidth: 1100 }}>
                <thead>
                  <tr style={{ background: '#f0f4f8' }}>
                    {['', 'Entity', 'Vendor', 'Nature of Expense', 'Invoice No.', 'Inv. Date', 'Amount', 'Due Date', 'Payment Terms', 'Remarks'].map(h =>
                      <th key={h} style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #ddd', whiteSpace: 'nowrap' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {effectiveRows.length === 0 && (
                    <tr><td colSpan={10} style={{ padding: 16, textAlign: 'center', color: '#777' }}>No unpaid bills</td></tr>
                  )}
                  {effectiveRows.map(r => (
                    <tr key={r.billId} style={{ background: r.selected ? '#fff' : '#fafafa', opacity: r.selected ? 1 : 0.6 }}>
                      <td style={{ padding: 4, textAlign: 'center' }}>
                        <input type="checkbox" checked={r.selected} onChange={e => toggle(r.billId, e.target.checked)} />
                      </td>
                      <td style={{ padding: 4 }}>{r.entity}</td>
                      <td style={{ padding: 4, minWidth: 150 }}>{r.vendorName}</td>
                      <td style={{ padding: 4, minWidth: 150 }}>
                        <input style={cell} value={r.natureOfExpense} onChange={e => updateRow(r.billId, { natureOfExpense: e.target.value })} placeholder="e.g. Software Licence" />
                      </td>
                      <td style={{ padding: 4 }}>{r.invoiceNumber}</td>
                      <td style={{ padding: 4, whiteSpace: 'nowrap' }}>{r.invoiceDate}</td>
                      <td style={{ padding: 4, whiteSpace: 'nowrap' }}>₹{r.amount.toLocaleString('en-IN')}</td>
                      <td style={{ padding: 4, whiteSpace: 'nowrap' }}>{r.dueDate || '—'}</td>
                      <td style={{ padding: 4, minWidth: 130 }}>
                        <input style={cell} list="payment-terms" value={r.paymentTerms} onChange={e => updateRow(r.billId, { paymentTerms: e.target.value })} />
                      </td>
                      <td style={{ padding: 4, minWidth: 180 }}>
                        <input style={cell} value={r.remarks} onChange={e => updateRow(r.billId, { remarks: e.target.value })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="payment-terms">{PAYMENT_TERMS.map(t => <option key={t} value={t} />)}</datalist>
            </div>
          </div>

          {previewHtml !== null && (
            <div>
              <span style={lbl}>Preview</span>
              <iframe title="Email preview" sandbox="" srcDoc={previewHtml} style={{ width: '100%', height: 380, border: '1px solid #ddd', background: '#fff' }} />
            </div>
          )}
        </div>

        <div style={{ padding: '10px 16px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 16px', border: '1px solid #bfbfbf', background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button onClick={preview} disabled={busy} style={{ padding: '7px 16px', border: '1px solid #2b579a', background: '#fff', color: '#2b579a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={14} /> Preview
          </button>
          <button onClick={send} disabled={busy} style={{ padding: '7px 16px', border: 'none', background: '#2b579a', color: '#fff', cursor: busy ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Send size={14} /> {busy ? 'Working…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
