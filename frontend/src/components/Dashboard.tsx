'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Download, LogOut, RefreshCw, Key } from 'lucide-react';
import { entriesApi } from '@/lib/api';
import { computeStats, formatCurrency } from '@/lib/utils';
import StatCard from './StatCard';
import TrackerTable from './TrackerTable';
import AddEditModal from './AddEditModal';
import ChangePasswordModal from './ChangePasswordModal';
import { Entry } from '@/types';
import * as XLSX from 'xlsx';

export default function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [criticality, setCriticality] = useState('All');
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [changePwOpen, setChangePwOpen] = useState(false);

  const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';

  const { data: entries = [], isLoading, isFetching } = useQuery({
    queryKey: ['entries', search, category, criticality],
    queryFn: () =>
      entriesApi
        .list({
          search: search || undefined,
          category: category !== 'All' ? category : undefined,
          criticality: criticality !== 'All' ? criticality : undefined,
        })
        .then((r) => r.data),
  });

  const stats = computeStats(entries);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    router.replace('/');
  }

  async function handleExport() {
    try {
      const { data } = await entriesApi.export();
      const rows = data.map((e) => ({
        'Sr No': e.srNo ?? '',
        'Service / Domain Name': e.serviceName,
        Category: e.category ?? '',
        'Billing Company': e.billingCompany ?? '',
        'Vendor / Registrar': e.vendor ?? '',
        'Expiry Date': e.expiryDate ? new Date(e.expiryDate).toLocaleDateString('en-IN') : '',
        'Auto Renewal': e.autoRenewal ? 'Yes' : 'No',
        Owner: e.owner ?? '',
        Criticality: e.criticality ?? '',
        'Last Renewal Date': e.lastRenewalDate ? new Date(e.lastRenewalDate).toLocaleDateString('en-IN') : '',
        'Renewal Period (Yrs)': e.renewalPeriod ?? '',
        'Annual Cost (INR)': e.annualCost ?? '',
        'Payment Method': e.paymentMethod ?? '',
        'Invoice Reference': e.invoiceRef ?? '',
        'Finance Email': e.financeEmail ?? '',
        'Admin Email': e.adminEmail ?? '',
        'Vendor Email': e.vendorEmail ?? '',
        Remarks: e.remarks ?? '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tracker');
      XLSX.writeFile(wb, `NGI-Tracker-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Exported to Excel');
    } catch {
      toast.error('Export failed');
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Top navigation */}
      <header className="bg-brand-700 shadow-md sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white rounded flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" fill="#0078d4" />
                <rect x="9" y="1" width="6" height="6" fill="#0078d4" opacity="0.7" />
                <rect x="1" y="9" width="6" height="6" fill="#0078d4" opacity="0.7" />
                <rect x="9" y="9" width="6" height="6" fill="#0078d4" opacity="0.4" />
              </svg>
            </div>
            <div>
              <span className="text-white font-semibold text-sm">National Group India</span>
              <span className="text-brand-100 text-xs opacity-70 ml-2">IT Asset Tracker</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-brand-100 text-xs hidden sm:block">{username}</span>
            <button
              onClick={() => setChangePwOpen(true)}
              className="text-brand-100 hover:text-white p-2 rounded hover:bg-brand-600 transition-colors"
              title="Change Password"
            >
              <Key size={15} />
            </button>
            <button
              onClick={handleLogout}
              className="text-brand-100 hover:text-white p-2 rounded hover:bg-brand-600 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-5 space-y-4">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Domain / SaaS / AMC Tracker</h1>
            <p className="text-sm text-gray-500">Manage renewals, subscriptions and IT asset expiry</p>
          </div>
          <div className="text-xs text-gray-400">
            Last updated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Items" value={stats.total} color="blue" />
          <StatCard label="Active" value={stats.active} color="green" />
          <StatCard label="Expiring Soon" value={stats.expiringSoon} color="orange" subtitle="≤ 60 days" />
          <StatCard label="Expired" value={stats.expired} color="red" />
          <StatCard label="No Expiry Set" value={stats.noExpiry} color="gray" />
          <StatCard
            label="Annual Cost"
            value={formatCurrency(stats.totalAnnualCost)}
            color="blue"
            wide
          />
        </div>

        {/* Expiry warning banner */}
        {stats.expiringSoon > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
            <p className="text-sm text-orange-800">
              <strong>{stats.expiringSoon} item{stats.expiringSoon > 1 ? 's' : ''}</strong> expiring within 60 days.
              Review and renew soon.
            </p>
          </div>
        )}
        {stats.expired > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <p className="text-sm text-red-800">
              <strong>{stats.expired} item{stats.expired > 1 ? 's' : ''}</strong> already expired. Immediate action required.
            </p>
          </div>
        )}

        {/* Table card */}
        <div className="card !p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center gap-2">
            <input
              className="input flex-1 min-w-[180px] max-w-xs"
              placeholder="Search by name, vendor, owner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="input w-auto min-w-[130px]"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {['All', 'Domain', 'SaaS', 'Microsoft365', 'Antivirus', 'AMC', 'Other'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              className="input w-auto min-w-[120px]"
              value={criticality}
              onChange={(e) => setCriticality(e.target.value)}
            >
              {['All', 'High', 'Medium', 'Low'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 ml-auto">
              <button
                className="btn-secondary"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['entries'] })}
                title="Refresh"
              >
                <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button className="btn-secondary" onClick={handleExport}>
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button className="btn-primary" onClick={() => setAddOpen(true)}>
                <Plus size={14} />
                <span className="hidden sm:inline">Add New</span>
              </button>
            </div>
          </div>

          <TrackerTable
            entries={entries}
            isLoading={isLoading}
            onEdit={(e) => setEditEntry(e)}
          />
        </div>
      </main>

      {(addOpen || editEntry) && (
        <AddEditModal
          entry={editEntry}
          onClose={() => { setAddOpen(false); setEditEntry(null); }}
        />
      )}

      {changePwOpen && <ChangePasswordModal onClose={() => setChangePwOpen(false)} />}
    </div>
  );
}
