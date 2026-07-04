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
}

const EMPTY: EntryFormData = {
  srNo: null, serviceName: '', category: null, billingCompany: null,
  vendor: null, expiryDate: null, autoRenewal: false, owner: null,
  criticality: null, lastRenewalDate: null, renewalPeriod: null,
  annualCost: null, paymentMethod: null, invoiceRef: null,
  financeEmail: null, adminEmail: null, vendorEmail: null, remarks: null,
  // Physical asset fields
  assetTag: null, serialNumber: null, location: null, condition: null,
  assetStatus: null, purchaseDate: null, purchasePrice: null, warrantyYears: null,
};

function toInputDate(v: string | null) {
  if (!v) return '';
  return v.slice(0, 10);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export default function AddEditModal({ entry, onClose }: Props) {
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
    }
  }, [entry]);

  function set<K extends keyof EntryFormData>(key: K, value: EntryFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.serviceName.trim()) { toast.error('Service name is required'); return; }
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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="bg-brand-500 px-6 py-4 flex items-center justify-between rounded-t-xl sticky top-0">
          <h2 className="text-white font-semibold text-base">
            {entry ? 'Edit Entry' : 'Add New Entry'}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sr No">
              <input className="input" type="number" value={form.srNo ?? ''} onChange={(e) => set('srNo', e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Category">
              <select className="input" value={form.category ?? ''} onChange={(e) => set('category', e.target.value || null)}>
                <option value="">— Select —</option>
                {['Laptop', 'Desktop', 'Phone/Mobile', 'Tablet', 'Monitor', 'Printer', 'Scanner', 'Server', 'Networking', 'UPS', 'Projector', 'Camera', 'Other Hardware'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Service Name */}
          <Field label="Service / Domain Name *">
            <input className="input" type="text" value={form.serviceName} onChange={(e) => set('serviceName', e.target.value)} required placeholder="e.g. nationalgroupindia.com" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Billing Company">
              <input className="input" type="text" value={form.billingCompany ?? ''} onChange={(e) => set('billingCompany', e.target.value || null)} />
            </Field>
            <Field label="Vendor / Registrar">
              <input className="input" type="text" value={form.vendor ?? ''} onChange={(e) => set('vendor', e.target.value || null)} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Expiry Date">
              <input className="input" type="date" value={form.expiryDate ?? ''} onChange={(e) => set('expiryDate', e.target.value || null)} />
            </Field>
            <Field label="Last Renewal Date">
              <input className="input" type="date" value={form.lastRenewalDate ?? ''} onChange={(e) => set('lastRenewalDate', e.target.value || null)} />
            </Field>
            <Field label="Renewal Period (Yrs)">
              <input className="input" type="number" value={form.renewalPeriod ?? ''} onChange={(e) => set('renewalPeriod', e.target.value ? Number(e.target.value) : null)} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Owner (IT Person)">
              <input className="input" type="text" value={form.owner ?? ''} onChange={(e) => set('owner', e.target.value || null)} />
            </Field>
            <Field label="Criticality">
              <select className="input" value={form.criticality ?? ''} onChange={(e) => set('criticality', e.target.value || null)}>
                <option value="">— Select —</option>
                {['High', 'Medium', 'Low'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer mt-5">
                <input type="checkbox" checked={form.autoRenewal} onChange={(e) => set('autoRenewal', e.target.checked)} className="w-4 h-4 accent-brand-500" />
                <span className="text-sm font-medium text-gray-700">Auto Renewal</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Annual Cost (INR)">
              <input className="input" type="number" value={form.annualCost ?? ''} onChange={(e) => set('annualCost', e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Payment Method">
              <input className="input" type="text" value={form.paymentMethod ?? ''} onChange={(e) => set('paymentMethod', e.target.value || null)} placeholder="Online / Cheque" />
            </Field>
            <Field label="Invoice Reference">
              <input className="input" type="text" value={form.invoiceRef ?? ''} onChange={(e) => set('invoiceRef', e.target.value || null)} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Finance Email">
              <input className="input" type="email" value={form.financeEmail ?? ''} onChange={(e) => set('financeEmail', e.target.value || null)} />
            </Field>
            <Field label="Admin Email">
              <input className="input" type="email" value={form.adminEmail ?? ''} onChange={(e) => set('adminEmail', e.target.value || null)} />
            </Field>
            <Field label="Vendor Email">
              <input className="input" type="email" value={form.vendorEmail ?? ''} onChange={(e) => set('vendorEmail', e.target.value || null)} />
            </Field>
          </div>

          <Field label="Remarks">
            <textarea className="input resize-none" rows={2} value={form.remarks ?? ''} onChange={(e) => set('remarks', e.target.value || null)} />
          </Field>

          {/* Physical Asset Details section */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Physical Asset Details</p>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Asset Tag">
                <input className="input" type="text" value={form.assetTag ?? ''} onChange={(e) => set('assetTag', e.target.value || null)} placeholder="e.g. NGI-LT-001" />
              </Field>
              <Field label="Serial Number">
                <input className="input" type="text" value={form.serialNumber ?? ''} onChange={(e) => set('serialNumber', e.target.value || null)} />
              </Field>
              <Field label="Location">
                <input className="input" type="text" value={form.location ?? ''} onChange={(e) => set('location', e.target.value || null)} placeholder="Office / Floor" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <Field label="Condition">
                <select className="input" value={form.condition ?? ''} onChange={(e) => set('condition', e.target.value || null)}>
                  <option value="">— Select —</option>
                  {['Good','Fair','Poor','Faulty'].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Asset Status">
                <select className="input" value={form.assetStatus ?? ''} onChange={(e) => set('assetStatus', e.target.value || null)}>
                  <option value="">— Select —</option>
                  {['Available','InUse','InRepair','Retired','Scrapped'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Warranty (Years)">
                <input className="input" type="number" min="0" value={form.warrantyYears ?? ''} onChange={(e) => set('warrantyYears', e.target.value ? Number(e.target.value) : null)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Field label="Purchase Date">
                <input className="input" type="date" value={form.purchaseDate ?? ''} onChange={(e) => set('purchaseDate', e.target.value || null)} />
              </Field>
              <Field label="Purchase Price (INR)">
                <input className="input" type="number" min="0" value={form.purchasePrice ?? ''} onChange={(e) => set('purchasePrice', e.target.value ? Number(e.target.value) : null)} />
              </Field>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />}
              {saving ? 'Saving…' : entry ? 'Update Entry' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
