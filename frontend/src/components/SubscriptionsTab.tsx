'use client';

import { useState, useMemo, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, Pencil, Trash2, X, AlertTriangle, Clock,
  CheckCircle2, MinusCircle, IndianRupee, Globe, Package, RefreshCw,
} from 'lucide-react';
import { subscriptionsApi } from '@/lib/api';
import { Subscription, SubscriptionFormData } from '@/types';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const TYPES = ['All', 'Domain', 'SAAS', 'AMC'];
const CRITICALITIES = ['All', 'High', 'Medium', 'Low'];
const TYPE_OPTS = ['Domain', 'SAAS', 'AMC'];
const PAYMENT_METHODS = ['Online', 'Cheque', 'NEFT', 'IMPS', 'Credit Card', 'Other'];

const EMPTY: SubscriptionFormData = {
  srNo: null, name: '', type: 'SAAS', billingCompany: null, registrar: null,
  expiryDate: null, autoRenewal: false, owner: null, criticality: 'High',
  lastRenewalDate: null, renewalPeriod: null, annualCost: null,
  paymentMethod: null, invoiceRef: null, financeEmail: null,
  adminEmail: null, vendorEmail: null, remarks: null,
};

function getDays(d: string | null) {
  if (!d) return null;
  return dayjs(d).diff(dayjs(), 'day');
}

function fmtDate(d: string | null) {
  return d ? dayjs(d).format('DD-MMM-YYYY') : '—';
}

function fmtCost(n: number | null) {
  if (!n) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function ExpiryBadge({ date }: { date: string | null }) {
  const days = getDays(date);
  if (days === null) return <span className="text-gray-400 text-xs">No expiry</span>;
  if (days < 0) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><AlertTriangle size={10} />Expired</span>;
  if (days <= 30) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><Clock size={10} />{days}d</span>;
  if (days <= 90) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700"><Clock size={10} />{days}d</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle2 size={10} />{days}d</span>;
}

function CritBadge({ v }: { v: string | null }) {
  const c = v === 'High' ? 'bg-red-100 text-red-700' : v === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600';
  return <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${c}`}>{v || '—'}</span>;
}

function TypeBadge({ v }: { v: string }) {
  const c = v === 'Domain' ? 'bg-blue-100 text-blue-700' : v === 'SAAS' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700';
  return <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${c}`}>{v}</span>;
}

type SortKey = 'srNo' | 'name' | 'type' | 'criticality' | 'expiryDate' | 'annualCost' | 'owner';
type SortDir = 'asc' | 'desc';
const CRIT_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export default function SubscriptionsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeF, setTypeF] = useState('All');
  const [critF, setCritF] = useState('All');
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [form, setForm] = useState<SubscriptionFormData>(EMPTY);
  const [sortKey, setSortKey] = useState<SortKey>('srNo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['subscriptions', search, typeF, critF],
    queryFn: () => subscriptionsApi.list({
      search: search || undefined,
      type: typeF !== 'All' ? typeF : undefined,
      criticality: critF !== 'All' ? critF : undefined,
    }).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: SubscriptionFormData) => subscriptionsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); toast.success('Added successfully'); closeModal(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to add'),
  });

  const updateMut = useMutation({
    mutationFn: (d: SubscriptionFormData) => subscriptionsApi.update(selected!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); toast.success('Updated successfully'); closeModal(); },
    onError: () => toast.error('Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: () => subscriptionsApi.delete(selected!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); toast.success('Deleted'); closeModal(); },
    onError: () => toast.error('Failed to delete'),
  });

  function openAdd() { setForm(EMPTY); setSelected(null); setModal('add'); }
  function openEdit(s: Subscription) {
    setSelected(s);
    setForm({
      srNo: s.srNo, name: s.name, type: s.type, billingCompany: s.billingCompany,
      registrar: s.registrar, expiryDate: s.expiryDate ? s.expiryDate.slice(0, 10) : null,
      autoRenewal: s.autoRenewal, owner: s.owner, criticality: s.criticality,
      lastRenewalDate: s.lastRenewalDate ? s.lastRenewalDate.slice(0, 10) : null,
      renewalPeriod: s.renewalPeriod, annualCost: s.annualCost, paymentMethod: s.paymentMethod,
      invoiceRef: s.invoiceRef, financeEmail: s.financeEmail, adminEmail: s.adminEmail,
      vendorEmail: s.vendorEmail, remarks: s.remarks,
    });
    setModal('edit');
  }
  function openDelete(s: Subscription) { setSelected(s); setModal('delete'); }
  function closeModal() { setModal(null); setSelected(null); }

  function set<K extends keyof SubscriptionFormData>(k: K, v: SubscriptionFormData[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (modal === 'add') createMut.mutate(form);
    else updateMut.mutate(form);
  }

  function handleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  }

  const sorted = useMemo(() => {
    return [...subs].sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === 'expiryDate') {
        av = getDays(a.expiryDate) ?? 999999;
        bv = getDays(b.expiryDate) ?? 999999;
      } else if (sortKey === 'criticality') {
        av = CRIT_ORDER[a.criticality ?? ''] ?? 3;
        bv = CRIT_ORDER[b.criticality ?? ''] ?? 3;
      } else if (sortKey === 'annualCost') {
        av = a.annualCost ?? 0;
        bv = b.annualCost ?? 0;
      } else if (sortKey === 'srNo') {
        av = a.srNo ?? 999999;
        bv = b.srNo ?? 999999;
      } else {
        av = (a[sortKey] as string | null) ?? '';
        bv = (b[sortKey] as string | null) ?? '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [subs, sortKey, sortDir]);

  // Stats
  const stats = useMemo(() => {
    let active = 0, expiringSoon = 0, expired = 0, noExpiry = 0, totalCost = 0;
    for (const s of subs) {
      const d = getDays(s.expiryDate);
      if (d === null) noExpiry++;
      else if (d < 0) expired++;
      else if (d <= 90) expiringSoon++;
      else active++;
      if (s.annualCost) totalCost += s.annualCost;
    }
    return { total: subs.length, active, expiringSoon, expired, noExpiry, totalCost };
  }, [subs]);

  async function handleExport() {
    try {
      const { data } = await subscriptionsApi.export();
      const rows = data.map(s => ({
        'Sr No': s.srNo ?? '',
        'Name': s.name,
        'Type': s.type,
        'Billing Company': s.billingCompany ?? '',
        'Registrar': s.registrar ?? '',
        'Expiry Date': fmtDate(s.expiryDate),
        'Auto Renewal': s.autoRenewal ? 'Yes' : 'No',
        'Owner': s.owner ?? '',
        'Criticality': s.criticality ?? '',
        'Last Renewal': fmtDate(s.lastRenewalDate),
        'Renewal Period (Yrs)': s.renewalPeriod ?? '',
        'Annual Cost (INR)': s.annualCost ?? '',
        'Payment Method': s.paymentMethod ?? '',
        'Invoice Ref': s.invoiceRef ?? '',
        'Finance Email': s.financeEmail ?? '',
        'Admin Email': s.adminEmail ?? '',
        'Vendor Email': s.vendorEmail ?? '',
        'Remarks': s.remarks ?? '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Subscriptions');
      XLSX.writeFile(wb, `NGI-Subscriptions-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Exported to Excel');
    } catch { toast.error('Export failed'); }
  }

  const saving = createMut.isPending || updateMut.isPending;

  function Th({ k, children }: { k: SortKey; children: React.ReactNode }) {
    return (
      <th
        className="px-3 py-2 text-left text-xs font-semibold cursor-pointer select-none hover:bg-brand-500 transition-colors whitespace-nowrap"
        onClick={() => handleSort(k)}
      >
        <span className="flex items-center gap-1">
          {children}
          <span className="opacity-50">{sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
        </span>
      </th>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats bar */}
      <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-3 py-1.5">
            <Package size={13} className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-800">{stats.total} Total</span>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 rounded-lg px-3 py-1.5">
            <CheckCircle2 size={13} className="text-green-600" />
            <span className="text-xs font-semibold text-green-800">{stats.active} Active</span>
          </div>
          <div className="flex items-center gap-1.5 bg-orange-50 rounded-lg px-3 py-1.5">
            <Clock size={13} className="text-orange-500" />
            <span className="text-xs font-semibold text-orange-800">{stats.expiringSoon} Expiring (≤90d)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-3 py-1.5">
            <AlertTriangle size={13} className="text-red-500" />
            <span className="text-xs font-semibold text-red-800">{stats.expired} Expired</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
            <MinusCircle size={13} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-600">{stats.noExpiry} No Expiry</span>
          </div>
          <div className="flex items-center gap-1.5 bg-purple-50 rounded-lg px-3 py-1.5">
            <IndianRupee size={13} className="text-purple-600" />
            <span className="text-xs font-semibold text-purple-800">{fmtCost(stats.totalCost)}/yr</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-gray-200 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search subscriptions…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <select value={typeF} onChange={e => setTypeF(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300">
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={critF} onChange={e => setCritF(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300">
          {CRITICALITIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Download size={13} /> Export
        </button>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-semibold">
          <Plus size={13} /> Add New
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <Globe size={32} className="opacity-30" />
            <p className="text-sm">No subscriptions found</p>
            <button onClick={openAdd} className="text-xs text-brand-600 hover:underline">Add your first subscription</button>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-brand-600 text-white sticky top-0 z-10">
              <tr>
                <Th k="srNo">#</Th>
                <Th k="name">Name / Domain</Th>
                <Th k="type">Type</Th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">Registrar</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">Billing Co.</th>
                <Th k="expiryDate">Expiry</Th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">Auto-Renew</th>
                <Th k="owner">Owner</Th>
                <Th k="criticality">Criticality</Th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">Last Renewal</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">Period</th>
                <Th k="annualCost">Annual Cost</Th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">Payment</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">Invoice Ref</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">Remarks</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((s, i) => {
                const days = getDays(s.expiryDate);
                const rowBg = days !== null && days < 0
                  ? 'bg-red-50'
                  : days !== null && days <= 30
                  ? 'bg-orange-50'
                  : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
                return (
                  <tr key={s.id} className={`${rowBg} hover:bg-blue-50 transition-colors`}>
                    <td className="px-3 py-2 text-gray-500 text-xs">{s.srNo ?? ''}</td>
                    <td className="px-3 py-2 font-medium text-gray-900 max-w-[180px] truncate" title={s.name}>{s.name}</td>
                    <td className="px-3 py-2"><TypeBadge v={s.type} /></td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{s.registrar || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{s.billingCompany || '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        <ExpiryBadge date={s.expiryDate} />
                        {s.expiryDate && <span className="text-[10px] text-gray-400">{fmtDate(s.expiryDate)}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded ${s.autoRenewal ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.autoRenewal ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700 text-xs">{s.owner || '—'}</td>
                    <td className="px-3 py-2"><CritBadge v={s.criticality} /></td>
                    <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{fmtDate(s.lastRenewalDate)}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{s.renewalPeriod ? `${s.renewalPeriod}yr` : '—'}</td>
                    <td className="px-3 py-2 text-gray-700 text-xs font-medium whitespace-nowrap">{fmtCost(s.annualCost)}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{s.paymentMethod || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{s.invoiceRef || '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs max-w-[140px] truncate" title={s.remarks || ''}>{s.remarks || '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)} title="Edit" className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => openDelete(s)} title="Delete" className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-900">{modal === 'add' ? 'Add Subscription' : 'Edit Subscription'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-4">
                {/* Row 1 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sr No</label>
                  <input type="number" value={form.srNo ?? ''} onChange={e => set('srNo', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name / Domain <span className="text-red-500">*</span></label>
                  <input required value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="e.g. iskytransport.com or Microsoft 365"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>

                {/* Row 2 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select value={form.type} onChange={e => set('type', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300">
                    {TYPE_OPTS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Registrar / Vendor</label>
                  <input value={form.registrar ?? ''} onChange={e => set('registrar', e.target.value || null)}
                    placeholder="e.g. GoDaddy, CloudFlare, PaceInfo"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Billing Company</label>
                  <input value={form.billingCompany ?? ''} onChange={e => set('billingCompany', e.target.value || null)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>

                {/* Row 3 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date</label>
                  <input type="date" value={form.expiryDate ?? ''} onChange={e => set('expiryDate', e.target.value || null)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Renewal Date</label>
                  <input type="date" value={form.lastRenewalDate ?? ''} onChange={e => set('lastRenewalDate', e.target.value || null)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Renewal Period (Years)</label>
                  <input type="number" min="1" value={form.renewalPeriod ?? ''} onChange={e => set('renewalPeriod', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>

                {/* Row 4 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Auto Renewal</label>
                  <select value={form.autoRenewal ? 'Yes' : 'No'} onChange={e => set('autoRenewal', e.target.value === 'Yes')}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300">
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Owner (IT Person)</label>
                  <input value={form.owner ?? ''} onChange={e => set('owner', e.target.value || null)}
                    placeholder="e.g. Balasubramanian P"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Criticality</label>
                  <select value={form.criticality ?? 'High'} onChange={e => set('criticality', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300">
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>

                {/* Row 5 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Annual Cost (INR)</label>
                  <input type="number" min="0" value={form.annualCost ?? ''} onChange={e => set('annualCost', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                  <select value={form.paymentMethod ?? ''} onChange={e => set('paymentMethod', e.target.value || null)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300">
                    <option value="">— Select —</option>
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Reference</label>
                  <input value={form.invoiceRef ?? ''} onChange={e => set('invoiceRef', e.target.value || null)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>

                {/* Row 6 - Emails */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Finance Email</label>
                  <input type="email" value={form.financeEmail ?? ''} onChange={e => set('financeEmail', e.target.value || null)}
                    placeholder="30-day renewal alert"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Admin Email</label>
                  <input type="email" value={form.adminEmail ?? ''} onChange={e => set('adminEmail', e.target.value || null)}
                    placeholder="30-day + daily alerts"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vendor Email</label>
                  <input type="email" value={form.vendorEmail ?? ''} onChange={e => set('vendorEmail', e.target.value || null)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>

                {/* Remarks full width */}
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                  <textarea value={form.remarks ?? ''} onChange={e => set('remarks', e.target.value || null)} rows={2}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button type="button" onClick={closeModal} className="px-4 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-semibold disabled:opacity-50">
                  {saving ? 'Saving…' : modal === 'add' ? 'Add Subscription' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete Subscription</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete <span className="font-semibold">{selected.name}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}
                className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50">
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
