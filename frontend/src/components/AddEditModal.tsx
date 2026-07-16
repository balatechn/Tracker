'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { Entry, EntryFormData } from '@/types';
import { entriesApi } from '@/lib/api';

interface Props {
  entry: Entry | null;
  onClose: () => void;
  allocatedUser?: string;
}

const EMPTY: EntryFormData = {
  srNo: null, serviceName: '', category: null, billingCompany: null,
  vendor: null, expiryDate: null, autoRenewal: false, owner: null,
  criticality: null, lastRenewalDate: null, renewalPeriod: null,
  annualCost: null, paymentMethod: null, invoiceRef: null,
  financeEmail: null, adminEmail: null, vendorEmail: null, remarks: null,
  assetTag: null, serialNumber: null, location: null, condition: null,
  assetStatus: null, purchaseDate: null, purchasePrice: null, warrantyYears: null,
};

function toInputDate(v: string | null) {
  if (!v) return '';
  return v.slice(0, 10);
}

const LBL: React.CSSProperties = {
  display: 'block',
  fontSize: '8.5pt',
  fontWeight: 700,
  color: '#595959',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 3,
  fontFamily: "'Calibri','Aptos',Arial,sans-serif",
};

const INPUT: React.CSSProperties = {
  width: '100%',
  fontSize: '10.5pt',
  fontFamily: "'Calibri','Aptos',Arial,sans-serif",
  border: '1px solid #bfbfbf',
  borderRadius: 0,
  padding: '4px 6px',
  background: '#fff',
  color: '#1f1f1f',
  outline: 'none',
  boxSizing: 'border-box',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={LBL}>{label}</label>
      {children}
    </div>
  );
}

export default function AddEditModal({ entry, onClose, allocatedUser }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<EntryFormData>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setForm({
        srNo: entry.srNo,
        serviceName: entry.serviceName,
        category: entry.category,
        billingCompany: entry.billingCompany,
        vendor: entry.vendor,
        expiryDate: toInputDate(entry.expiryDate),
        autoRenewal: entry.autoRenewal,
        owner: entry.owner,
        criticality: entry.criticality,
        lastRenewalDate: toInputDate(entry.lastRenewalDate),
        renewalPeriod: entry.renewalPeriod,
        annualCost: entry.annualCost,
        paymentMethod: entry.paymentMethod,
        invoiceRef: entry.invoiceRef,
        financeEmail: entry.financeEmail,
        adminEmail: entry.adminEmail,
        vendorEmail: entry.vendorEmail,
        remarks: entry.remarks,
        assetTag: entry.assetTag,
        serialNumber: entry.serialNumber,
        location: entry.location,
        condition: entry.condition,
        assetStatus: entry.assetStatus,
        purchaseDate: toInputDate(entry.purchaseDate),
        purchasePrice: entry.purchasePrice,
        warrantyYears: entry.warrantyYears,
      });
    } else {
      setForm(EMPTY);
    }
  }, [entry]);

  function set<K extends keyof EntryFormData>(key: K, value: EntryFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.serviceName.trim()) { toast.error('Re Issued To is required'); return; }
    setSaving(true);
    try {
      if (entry) {
        await entriesApi.update(entry.id, form);
        toast.success('Entry updated');
      } else {
        await entriesApi.create(form);
        toast.success('Entry added');
      }
      qc.invalidateQueries({ queryKey: ['entries'] });
      onClose();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }

  const inp = (key: keyof EntryFormData, type = 'text', placeholder = '') => (
    <input
      style={INPUT}
      type={type}
      placeholder={placeholder}
      value={(form[key] as string | number) ?? ''}
      onChange={e => set(key, (type === 'number' ? (e.target.value ? Number(e.target.value) : null) : (e.target.value || null)) as EntryFormData[typeof key])}
      onFocus={e => { e.currentTarget.style.borderColor = '#2b579a'; e.currentTarget.style.boxShadow = '0 0 0 1px #2b579a'; }}
      onBlur={e => { e.currentTarget.style.borderColor = '#bfbfbf'; e.currentTarget.style.boxShadow = 'none'; }}
    />
  );

  const sel = (key: keyof EntryFormData, options: string[]) => (
    <select
      style={INPUT}
      value={(form[key] as string) ?? ''}
      onChange={e => set(key, (e.target.value || null) as EntryFormData[typeof key])}
      onFocus={e => { e.currentTarget.style.borderColor = '#2b579a'; }}
      onBlur={e => { e.currentTarget.style.borderColor = '#bfbfbf'; }}
    >
      <option value="">— Select —</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div
        style={{ background: '#fff', border: '1px solid #bfbfbf', width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', fontFamily: "'Calibri','Aptos',Arial,sans-serif", display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header — Office blue flat */}
        <div style={{ background: '#2b579a', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '11pt' }}>
            {entry ? 'Edit Entry' : 'Add New Entry'}
          </span>
          <button onClick={onClose} style={{ color: '#c7d8f0', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Row: # and Product (Category) */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10 }}>
            <Field label="#">{inp('srNo', 'number')}</Field>
            <Field label="Product">
              {sel('category', ['Laptop', 'Desktop', 'Phone/Mobile', 'Tablet', 'Monitor', 'Printer', 'Scanner', 'Server', 'Networking', 'UPS', 'Projector', 'Camera', 'Other Hardware'])}
            </Field>
          </div>

          {/* Re Issued To (serviceName) */}
          <Field label="Re Issued To *">
            <input
              style={INPUT} type="text" value={form.serviceName}
              onChange={e => set('serviceName', e.target.value)} required
              placeholder="Asset description / name"
              onFocus={e => { e.currentTarget.style.borderColor = '#2b579a'; e.currentTarget.style.boxShadow = '0 0 0 1px #2b579a'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#bfbfbf'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </Field>

          {/* Previous User + User ID + Make */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Previous User">{inp('owner')}</Field>
            <Field label="User ID">
              <input
                style={{ ...INPUT, background: '#f5f5f5', color: '#888', cursor: 'not-allowed' }}
                type="text"
                value={allocatedUser ?? '—'}
                readOnly
                title="Managed via Allocations"
              />
            </Field>
            <Field label="Make">{inp('vendor')}</Field>
          </div>

          {/* Company + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Company">{inp('billingCompany')}</Field>
            <Field label="Status">
              {sel('assetStatus', ['Available', 'InUse', 'InRepair', 'Retired', 'Scrapped', 'RETURNED', 'SPARE'])}
            </Field>
          </div>

          {/* Tag Number + Serial Number + Invoice + Invoice Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <Field label="Tag Number">{inp('assetTag', 'text', 'e.g. NGI-LT-001')}</Field>
            <Field label="Serial Number">{inp('serialNumber')}</Field>
            <Field label="Invoice">{inp('invoiceRef')}</Field>
            <Field label="Invoice Date">{inp('purchaseDate', 'date')}</Field>
          </div>

          {/* Divider — Additional Details */}
          <div style={{ borderTop: '1px solid #d0d0d0', paddingTop: 10, marginTop: 2 }}>
            <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#2b579a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Additional Details</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Field label="Asset Tag">{inp('assetTag', 'text', 'e.g. NGI-LT-001')}</Field>
              <Field label="Serial Number">{inp('serialNumber')}</Field>
              <Field label="Location">{inp('location', 'text', 'Office / Floor')}</Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
              <Field label="Condition">
                {sel('condition', ['Good', 'Fair', 'Poor', 'Faulty'])}
              </Field>
              <Field label="Criticality">
                {sel('criticality', ['High', 'Medium', 'Low'])}
              </Field>
              <Field label="Warranty (Years)">{inp('warrantyYears', 'number')}</Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
              <Field label="Annual Cost (INR)">{inp('annualCost', 'number')}</Field>
              <Field label="Purchase Price (INR)">{inp('purchasePrice', 'number')}</Field>
              <Field label="Payment Method">{inp('paymentMethod', 'text', 'Online / Cheque')}</Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
              <Field label="Finance Email">
                <input style={INPUT} type="email" value={form.financeEmail ?? ''} onChange={e => set('financeEmail', e.target.value || null)}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2b579a'; }} onBlur={e => { e.currentTarget.style.borderColor = '#bfbfbf'; }} />
              </Field>
              <Field label="Admin Email">
                <input style={INPUT} type="email" value={form.adminEmail ?? ''} onChange={e => set('adminEmail', e.target.value || null)}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2b579a'; }} onBlur={e => { e.currentTarget.style.borderColor = '#bfbfbf'; }} />
              </Field>
              <Field label="Vendor Email">
                <input style={INPUT} type="email" value={form.vendorEmail ?? ''} onChange={e => set('vendorEmail', e.target.value || null)}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2b579a'; }} onBlur={e => { e.currentTarget.style.borderColor = '#bfbfbf'; }} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <Field label="Expiry Date">{inp('expiryDate', 'date')}</Field>
              <Field label="Last Renewal Date">{inp('lastRenewalDate', 'date')}</Field>
            </div>

            <div style={{ marginTop: 10 }}>
              <Field label="Remarks">
                <textarea
                  style={{ ...INPUT, resize: 'none' }} rows={2}
                  value={form.remarks ?? ''} onChange={e => set('remarks', e.target.value || null)}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2b579a'; }} onBlur={e => { e.currentTarget.style.borderColor = '#bfbfbf'; }}
                />
              </Field>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '10pt', color: '#3b3b3b' }}>
                <input type="checkbox" checked={form.autoRenewal} onChange={e => set('autoRenewal', e.target.checked)} style={{ accentColor: '#2b579a', width: 14, height: 14 }} />
                Auto Renewal
              </label>
            </div>
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 10, borderTop: '1px solid #d0d0d0', marginTop: 2 }}>
            <button type="button" onClick={onClose}
              style={{ background: '#f2f2f2', border: '1px solid #bfbfbf', padding: '4px 16px', fontSize: '10pt', fontFamily: "'Calibri',Arial,sans-serif", cursor: 'pointer', color: '#1f1f1f' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ background: saving ? '#7a9fcb' : '#2b579a', border: '1px solid #1f4278', color: '#fff', padding: '4px 20px', fontSize: '10pt', fontFamily: "'Calibri',Arial,sans-serif", cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving && <span style={{ width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />}
              {saving ? 'Saving…' : entry ? 'Update Entry' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
