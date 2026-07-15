'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Download, LogOut, RefreshCw, Key, LayoutDashboard, Table2, Package, CheckCircle2, Clock, AlertTriangle, MinusCircle, IndianRupee, Users, ArrowLeftRight, ClipboardList, ScrollText, UserPlus, Monitor, X, ListTodo, FolderKanban, ChevronDown, Globe, Shield } from 'lucide-react';
import { entriesApi, employeesApi, allocationsApi, requestsApi, tasksApi, subscriptionsApi } from '@/lib/api';
import { computeStats, formatCurrency, getDaysRemaining, getStatusInfo } from '@/lib/utils';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import StatCard from './StatCard';
import TrackerTable from './TrackerTable';
import AddEditModal from './AddEditModal';
import ChangePasswordModal from './ChangePasswordModal';
import PeopleTab from './PeopleTab';
import AllocationsTab from './AllocationsTab';
import RequestsTab from './RequestsTab';
import AuditTab from './AuditTab';
import TaskMgtTab from './TaskMgtTab';
import TaskDashboardTab from './TaskDashboardTab';
import SubscriptionsTab from './SubscriptionsTab';
import UsersTab from './UsersTab';
import ReportModal from './ReportModal';
import { Entry } from '@/types';
import * as XLSX from 'xlsx';

type Tab = 'overview' | 'tracker' | 'subscriptions' | 'people' | 'allocations' | 'requests' | 'audit' | 'task-dashboard' | 'tasks' | 'users';

export default function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [criticality, setCriticality] = useState('All');
  const [addOpen, setAddOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [allocateEntry, setAllocateEntry] = useState<Entry | null>(null);
  const [allocEmpId, setAllocEmpId] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');

  const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('role') || 'viewer' : 'viewer';
  const isAdmin = userRole === 'admin';

  const HARDWARE_CATEGORIES = ['Laptop', 'Desktop', 'Phone/Mobile', 'Tablet', 'Monitor', 'Printer', 'Scanner', 'Server', 'Networking', 'UPS', 'Projector', 'Camera', 'Other Hardware'];

  const { data: allEntries = [], isLoading, isFetching } = useQuery({
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

  const entries = useMemo(
    () => allEntries.filter((e) => !e.category || HARDWARE_CATEGORIES.includes(e.category)),
    [allEntries]
  );

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.list().then((r) => r.data),
  });

  const { data: activeAllocCount = 0 } = useQuery({
    queryKey: ['alloc-count'],
    queryFn: () => allocationsApi.list({ status: 'Active' }).then((r) => r.data.length),
  });

  const { data: pendingReqCount = 0 } = useQuery({
    queryKey: ['req-count'],
    queryFn: () => requestsApi.list({ status: 'Pending' }).then((r) => r.data.length),
  });

  const { data: allTasksForProjects = [] } = useQuery({
    queryKey: ['tasks-projects'],
    queryFn: () => tasksApi.list().then(r => r.data),
    staleTime: 60_000,
  });
  const projectNames = useMemo(() => {
    const names = Array.from(new Set(allTasksForProjects.map(t => t.projectName).filter(Boolean) as string[])).sort();
    return names;
  }, [allTasksForProjects]);

  const allocateMut = useMutation({
    mutationFn: (empId: number) =>
      allocationsApi.create({ assetId: allocateEntry!.id, employeeId: empId }),
    onSuccess: () => {
      toast.success('Asset allocated successfully');
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['alloc-count'] });
      setAllocateEntry(null);
      setAllocEmpId('');
    },
    onError: () => toast.error('Allocation failed'),
  });

  const stats = computeStats(entries);

  const CHART_COLORS = ['#0078d4', '#00b050', '#ff8c00', '#d13438', '#8764b8', '#038387', '#ca5010', '#7a7574'];

  // Hardware charts
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => { const cat = e.category || 'Other'; counts[cat] = (counts[cat] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [entries]);

  const hwStatusData = [
    { name: 'In Use',    count: entries.filter(e => e.assetStatus === 'InUse').length,    color: '#0078d4' },
    { name: 'Available', count: entries.filter(e => e.assetStatus === 'Available').length, color: '#00b050' },
    { name: 'In Repair', count: entries.filter(e => e.assetStatus === 'InRepair').length,  color: '#ff8c00' },
    { name: 'Retired',   count: entries.filter(e => e.assetStatus === 'Retired').length,   color: '#9ca3af' },
  ];

  // Subscription data for overview
  const { data: overviewSubs = [] } = useQuery({
    queryKey: ['overview-subs'],
    queryFn: () => subscriptionsApi.list({}).then(r => r.data),
    staleTime: 60_000,
  });

  const now = new Date();
  const subStats = useMemo(() => {
    const expiring30 = overviewSubs.filter(s => { if (!s.expiryDate) return false; const d = Math.ceil((new Date(s.expiryDate).getTime() - now.getTime()) / 86400000); return d >= 0 && d <= 30; });
    const expiring90 = overviewSubs.filter(s => { if (!s.expiryDate) return false; const d = Math.ceil((new Date(s.expiryDate).getTime() - now.getTime()) / 86400000); return d > 30 && d <= 90; });
    const expired    = overviewSubs.filter(s => s.expiryDate && new Date(s.expiryDate) < now);
    const totalCost  = overviewSubs.reduce((sum, s) => sum + (s.annualCost ?? 0), 0);
    return { total: overviewSubs.length, expiring30, expiring90, expired, totalCost };
  }, [overviewSubs]);

  const subsByType = useMemo(() => {
    const counts: Record<string, { count: number; cost: number }> = {};
    overviewSubs.forEach(s => {
      const t = s.type || 'Other';
      if (!counts[t]) counts[t] = { count: 0, cost: 0 };
      counts[t].count++;
      counts[t].cost += s.annualCost ?? 0;
    });
    return Object.entries(counts).map(([name, v]) => ({ name, count: v.count, cost: v.cost })).sort((a, b) => b.cost - a.cost);
  }, [overviewSubs]);

  const upcomingRenewals = useMemo(() =>
    overviewSubs
      .filter(s => { if (!s.expiryDate) return false; const d = Math.ceil((new Date(s.expiryDate).getTime() - now.getTime()) / 86400000); return d >= 0 && d <= 90; })
      .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())
      .slice(0, 8),
    [overviewSubs]
  );

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
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
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="bg-brand-700 shadow-md flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" fill="#0078d4" />
                <rect x="9" y="1" width="6" height="6" fill="#0078d4" opacity="0.7" />
                <rect x="1" y="9" width="6" height="6" fill="#0078d4" opacity="0.7" />
                <rect x="9" y="9" width="6" height="6" fill="#0078d4" opacity="0.4" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <span className="text-white font-semibold text-sm">National Group India</span>
              <span className="text-brand-200 text-xs opacity-70 ml-2">IT Asset Tracker</span>
            </div>
          </div>

          {/* Global project filter */}
          <div className="flex items-center gap-1.5 ml-4">
            <FolderKanban size={13} className="text-brand-200" />
            <span className="text-brand-200 text-xs hidden md:inline">Project:</span>
            <div className="relative">
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="appearance-none bg-brand-600 hover:bg-brand-500 text-white text-xs rounded-md pl-2 pr-6 py-1 border border-brand-500 focus:outline-none cursor-pointer transition-colors"
              >
                <option value="All">All Projects</option>
                {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-brand-200 pointer-events-none" />
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User actions */}
          <div className="flex items-center gap-2">
            <span className="text-brand-100 text-xs hidden sm:block">{username}</span>
            <button
              onClick={() => setChangePwOpen(true)}
              className="text-brand-100 hover:text-white p-1.5 rounded hover:bg-brand-600 transition-colors"
              title="Change Password"
            >
              <Key size={14} />
            </button>
            <button
              onClick={handleLogout}
              className="text-brand-100 hover:text-white p-1.5 rounded hover:bg-brand-600 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-gray-100 border-b border-gray-200 flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto px-3 flex items-center gap-0.5 py-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'overview'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <LayoutDashboard size={17} />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'tracker'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <Table2 size={17} />
            Hardware Assets
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'subscriptions'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <Globe size={17} />
            Software & Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'people'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <Users size={17} />
            People
          </button>
          <button
            onClick={() => setActiveTab('allocations')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'allocations'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <ArrowLeftRight size={17} />
            Allocations
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'requests'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <ClipboardList size={17} />
            Requests
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'audit'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <ScrollText size={17} />
            Audit Log
          </button>

          {/* Task section separator */}
          <div className="h-6 w-px bg-gray-300 mx-1" />

          <button
            onClick={() => setActiveTab('task-dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'task-dashboard'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <FolderKanban size={17} />
            Task Dashboard
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'tasks'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <ListTodo size={17} />
            Task Mgt
          </button>

          {isAdmin && (
            <>
              <div className="h-6 w-px bg-gray-300 mx-1" />
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-md transition-all ${
                  activeTab === 'users'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
              >
                <Shield size={17} />
                Users
              </button>
            </>
          )}

          <div className="ml-auto text-xs text-gray-400">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Tab content — fills remaining viewport height */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* ── Overview tab ── */}
        {activeTab === 'overview' && (
          <div className="h-full max-w-screen-2xl mx-auto w-full px-4 py-3 overflow-y-auto space-y-5">

            {/* ── SECTION 1: Hardware Assets ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Monitor size={14} className="text-brand-600" />
                <h2 className="text-xs font-bold text-brand-700 uppercase tracking-widest">Hardware Assets</h2>
                <div className="flex-1 h-px bg-brand-100" />
              </div>

              {/* Hardware KPI row */}
              <div className="grid grid-cols-6 gap-3 mb-3">
                <StatCard label="Total Hardware"      value={entries.length}                                               color="blue"   icon={<Package size={14} />} />
                <StatCard label="In Use"              value={entries.filter(e => e.assetStatus === 'InUse').length}        color="green"  icon={<Monitor size={14} />} />
                <StatCard label="Available"           value={entries.filter(e => e.assetStatus === 'Available').length}    color="gray"   icon={<CheckCircle2 size={14} />} />
                <StatCard label="Active Allocations"  value={activeAllocCount}                                             color="purple" icon={<ArrowLeftRight size={14} />} />
                <StatCard label="Pending Requests"    value={pendingReqCount}                                              color="orange" icon={<ClipboardList size={14} />} />
                <StatCard label="Total Employees"     value={employees.length}                                             color="blue"   icon={<Users size={14} />} />
              </div>

              {/* Hardware Charts */}
              <div className="grid grid-cols-2 gap-3" style={{ height: 220 }}>
                {/* Pie: By Category */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex-shrink-0">Asset by Category</p>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="45%" innerRadius="30%" outerRadius="58%" paddingAngle={3} dataKey="value" labelLine={false}>
                          {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => { const n = Number(v); return [`${n} asset${n !== 1 ? 's' : ''}`, '']; }} />
                        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bar: Allocation Status */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex-shrink-0">Allocation Status</p>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hwStatusData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip cursor={{ fill: '#f9fafb' }} />
                        <Bar dataKey="count" name="Assets" radius={[4, 4, 0, 0]} maxBarSize={52}>
                          {hwStatusData.map((item, i) => <Cell key={i} fill={item.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION 2: Software & Subscriptions ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe size={14} className="text-purple-600" />
                <h2 className="text-xs font-bold text-purple-700 uppercase tracking-widest">Software &amp; Subscriptions</h2>
                <div className="flex-1 h-px bg-purple-100" />
              </div>

              {/* Subscription KPI row */}
              <div className="grid grid-cols-5 gap-3 mb-3">
                <StatCard label="Total Subscriptions" value={subStats.total}                                        color="blue"   icon={<Package size={14} />} />
                <StatCard label="Expiring ≤ 30d"      value={subStats.expiring30.length}                           color="red"    icon={<AlertTriangle size={14} />} />
                <StatCard label="Expiring ≤ 90d"      value={subStats.expiring90.length}                           color="orange" icon={<Clock size={14} />} />
                <StatCard label="Expired"             value={subStats.expired.length}                              color="red"    icon={<MinusCircle size={14} />} />
                <StatCard label="Total Annual Cost"   value={formatCurrency(subStats.totalCost)}                   color="purple" icon={<IndianRupee size={14} />} />
              </div>

              {/* Alert bar */}
              {(subStats.expiring30.length > 0 || subStats.expired.length > 0) && (
                <div className="flex gap-2 mb-3">
                  {subStats.expired.length > 0 && (
                    <div className="flex-1 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-800"><strong>{subStats.expired.length}</strong> subscription{subStats.expired.length > 1 ? 's' : ''} expired — immediate action required</p>
                    </div>
                  )}
                  {subStats.expiring30.length > 0 && (
                    <div className="flex-1 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <Clock size={12} className="text-orange-400 animate-pulse flex-shrink-0" />
                      <p className="text-xs text-orange-800"><strong>{subStats.expiring30.length}</strong> subscription{subStats.expiring30.length > 1 ? 's' : ''} expiring within 30 days</p>
                    </div>
                  )}
                </div>
              )}

              {/* Subscription Charts + Renewals */}
              <div className="grid grid-cols-3 gap-3" style={{ height: 240 }}>

                {/* Bar: Cost by Type */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex-shrink-0">Annual Cost by Type</p>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subsByType} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : `₹${(v/1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={70} />
                        <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Annual Cost']} />
                        <Bar dataKey="cost" radius={[0, 4, 4, 0]} maxBarSize={18}>
                          {subsByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie: Count by Type */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex-shrink-0">Subscriptions by Type</p>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={subsByType} dataKey="count" cx="50%" cy="45%" innerRadius="30%" outerRadius="58%" paddingAngle={3} labelLine={false}>
                          {subsByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v, _, p) => [`${v} (${p.payload.name})`, '']} />
                        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 9 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Upcoming Renewals list + cost summary */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Upcoming Renewals ≤ 90d</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${upcomingRenewals.length > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {upcomingRenewals.length} items
                    </span>
                  </div>
                  {/* Cost summary */}
                  {upcomingRenewals.length > 0 && (
                    <div className="flex-shrink-0 mb-1.5 bg-purple-50 rounded px-2 py-1 flex justify-between items-center">
                      <span className="text-xs text-purple-700 font-medium">Total renewal cost</span>
                      <span className="text-xs font-bold text-purple-900">{formatCurrency(upcomingRenewals.reduce((s, r) => s + (r.annualCost ?? 0), 0))}</span>
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto min-h-0 space-y-0.5">
                    {upcomingRenewals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-1">
                        <CheckCircle2 size={22} className="text-green-400" />
                        <p className="text-xs">All subscriptions up to date</p>
                      </div>
                    ) : upcomingRenewals.map(s => {
                      const days = Math.ceil((new Date(s.expiryDate!).getTime() - now.getTime()) / 86400000);
                      const badgeCls = days <= 7 ? 'bg-red-100 text-red-700' : days <= 30 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
                      return (
                        <div key={s.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-gray-50 gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-800 truncate">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.type} · {s.annualCost ? formatCurrency(s.annualCost) : '—'}</p>
                          </div>
                          <span className={`flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full ${badgeCls}`}>{days}d</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── Tracker tab ── */}
        {activeTab === 'tracker' && (
          <div className="h-full flex flex-col max-w-screen-2xl mx-auto w-full px-4 py-3 gap-3">
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-card border border-gray-200 px-3 py-2 flex flex-wrap items-center gap-2 flex-shrink-0">
              <input
                className="input flex-1 min-w-[160px] max-w-xs py-1.5 text-sm"
                placeholder="Search by name, vendor, owner…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="input w-auto min-w-[120px] py-1.5 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {['All', 'Laptop', 'Desktop', 'Phone/Mobile', 'Tablet', 'Monitor', 'Printer', 'Scanner', 'Server', 'Networking', 'UPS', 'Projector', 'Camera', 'Other Hardware'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                className="input w-auto min-w-[110px] py-1.5 text-sm"
                value={criticality}
                onChange={(e) => setCriticality(e.target.value)}
              >
                {['All', 'High', 'Medium', 'Low'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  className="btn-secondary py-1.5 px-3 text-xs"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['entries'] })}
                  title="Refresh"
                >
                  <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => setReportOpen(true)}>
                  <Download size={13} />
                  <span className="hidden sm:inline">Report</span>
                </button>
                <button className="btn-primary py-1.5 px-3 text-xs" onClick={() => setAddOpen(true)}>
                  <Plus size={13} />
                  <span className="hidden sm:inline">Add New</span>
                </button>
              </div>
            </div>

            {/* Table card — fills remaining height, rows scroll inside */}
            <div className="flex-1 min-h-0 bg-white rounded-lg shadow-card border border-gray-200 overflow-hidden flex flex-col">
              <TrackerTable
                entries={entries}
                isLoading={isLoading}
                onEdit={(e) => setEditEntry(e)}
                onAllocate={(e) => { setAllocateEntry(e); setAllocEmpId(''); }}
              />
            </div>
          </div>
        )}

        {/* ── Subscriptions tab ── */}
        {activeTab === 'subscriptions' && (
          <div className="h-full max-w-screen-2xl mx-auto w-full overflow-hidden">
            <SubscriptionsTab />
          </div>
        )}

        {/* ── People tab ── */}
        {activeTab === 'people' && (
          <div className="h-full max-w-screen-2xl mx-auto w-full overflow-hidden">
            <PeopleTab />
          </div>
        )}

        {/* ── Allocations tab ── */}
        {activeTab === 'allocations' && (
          <div className="h-full max-w-screen-2xl mx-auto w-full overflow-hidden">
            <AllocationsTab />
          </div>
        )}

        {/* ── Requests tab ── */}
        {activeTab === 'requests' && (
          <div className="h-full max-w-screen-2xl mx-auto w-full overflow-hidden">
            <RequestsTab />
          </div>
        )}

        {/* ── Audit tab ── */}
        {activeTab === 'audit' && (
          <div className="h-full max-w-screen-2xl mx-auto w-full overflow-hidden">
            <AuditTab />
          </div>
        )}

        {activeTab === 'task-dashboard' && (
          <div className="h-full max-w-screen-2xl mx-auto w-full overflow-hidden">
            <TaskDashboardTab projectFilter={projectFilter} projectNames={projectNames} onProjectChange={setProjectFilter} />
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="h-full max-w-screen-2xl mx-auto w-full overflow-hidden">
            <TaskMgtTab projectFilter={projectFilter} onProjectChange={setProjectFilter} projectNames={projectNames} />
          </div>
        )}

        {activeTab === 'users' && isAdmin && (
          <div className="h-full max-w-screen-2xl mx-auto w-full overflow-hidden">
            <UsersTab />
          </div>
        )}
      </div>

      {(addOpen || editEntry) && (
        <AddEditModal
          entry={editEntry}
          onClose={() => { setAddOpen(false); setEditEntry(null); }}
        />
      )}

      {changePwOpen && <ChangePasswordModal onClose={() => setChangePwOpen(false)} />}

      {reportOpen && <ReportModal entries={entries} onClose={() => setReportOpen(false)} />}

      {/* Quick Allocate Modal */}
      {allocateEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <UserPlus size={16} className="text-brand-500" />
                Allocate Asset
              </h2>
              <button onClick={() => setAllocateEntry(null)} className="p-1 hover:bg-gray-100 rounded">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{allocateEntry.serviceName}</span>
                {allocateEntry.assetTag && <span className="ml-1 text-xs text-gray-400">({allocateEntry.assetTag})</span>}
              </p>
              <div>
                <label className="label">Assign to Employee <span className="text-red-500">*</span></label>
                <select
                  className="input mt-1"
                  value={allocEmpId}
                  onChange={e => setAllocEmpId(e.target.value)}
                >
                  <option value="">— Select employee —</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.empId})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
              <button className="btn-secondary text-sm py-1.5 px-3" onClick={() => setAllocateEntry(null)}>Cancel</button>
              <button
                className="btn-primary text-sm py-1.5 px-3"
                disabled={!allocEmpId || allocateMut.isPending}
                onClick={() => allocateMut.mutate(Number(allocEmpId))}
              >
                {allocateMut.isPending ? 'Allocating…' : 'Allocate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
