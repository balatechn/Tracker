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
  const [companyFilter, setCompanyFilter] = useState('All');

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
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#f2f2f2', fontFamily: "'Calibri','Aptos',Arial,sans-serif" }}>
      {/* Office-style title bar + ribbon */}
      <header style={{ flexShrink: 0 }}>
        {/* Title bar */}
        <div style={{ background: '#2b579a', height: 36, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10 }}>
          <div style={{ width: 20, height: 20, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" fill="#2b579a" />
              <rect x="9" y="1" width="6" height="6" fill="#2b579a" opacity="0.7" />
              <rect x="1" y="9" width="6" height="6" fill="#2b579a" opacity="0.7" />
              <rect x="9" y="9" width="6" height="6" fill="#2b579a" opacity="0.4" />
            </svg>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '11pt' }}>National Group India</span>
          <span style={{ color: '#c7d8f0', fontSize: '9pt', opacity: 0.9 }}>IT Asset Tracker</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12 }}>
            <FolderKanban size={12} style={{ color: '#c7d8f0' }} />
            <span style={{ color: '#c7d8f0', fontSize: '9pt' }}>Project:</span>
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
              style={{ background: '#1f4278', color: '#fff', fontSize: '9pt', border: '1px solid #4a7bc4', padding: '1px 6px', cursor: 'pointer' }}>
              <option value="All">All Projects</option>
              {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ color: '#c7d8f0', fontSize: '9pt', marginRight: 8 }}>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <span style={{ color: '#fff', fontSize: '9pt', marginRight: 8 }}>{username}</span>
          <button onClick={() => setChangePwOpen(true)} title="Change Password" style={{ color: '#c7d8f0', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}><Key size={13} /></button>
          <button onClick={handleLogout} title="Sign out" style={{ color: '#c7d8f0', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}><LogOut size={13} /></button>
        </div>

        {/* Office ribbon tab bar — white bg, active tab = bold + blue underline */}
        <div style={{ background: '#ffffff', borderBottom: '1px solid #d0d0d0', display: 'flex', alignItems: 'stretch', padding: '0 4px' }}>
          {([
            { key: 'overview',      label: 'Overview',                icon: <LayoutDashboard size={13} /> },
            { key: 'tracker',       label: 'Hardware Assets',          icon: <Table2 size={13} /> },
            { key: 'subscriptions', label: 'Software & Subscriptions', icon: <Globe size={13} /> },
            { key: 'people',        label: 'People',                   icon: <Users size={13} /> },
            { key: 'allocations',   label: 'Allocations',              icon: <ArrowLeftRight size={13} /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 14px',
              height: 36,
              fontSize: '10pt',
              fontWeight: activeTab === key ? 700 : 400,
              color: activeTab === key ? '#2b579a' : '#3b3b3b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === key ? '3px solid #2b579a' : '3px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap' as const,
              transition: 'color 0.1s, border-color 0.1s, background 0.1s',
            }}
            onMouseEnter={e => { if (activeTab !== key) { (e.currentTarget as HTMLButtonElement).style.background = '#e8eef7'; (e.currentTarget as HTMLButtonElement).style.color = '#2b579a'; } }}
            onMouseLeave={e => { if (activeTab !== key) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#3b3b3b'; } }}
            >{icon}{label}</button>
          ))}
          <div style={{ flex: 1 }} />
          {isAdmin && (
            <button onClick={() => setActiveTab('users')} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 14px', height: 36, fontSize: '10pt',
              fontWeight: activeTab === 'users' ? 700 : 400,
              color: activeTab === 'users' ? '#2b579a' : '#3b3b3b',
              background: 'transparent', border: 'none',
              borderBottom: activeTab === 'users' ? '3px solid #2b579a' : '3px solid transparent',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { if (activeTab !== 'users') { (e.currentTarget as HTMLButtonElement).style.background = '#e8eef7'; (e.currentTarget as HTMLButtonElement).style.color = '#2b579a'; } }}
            onMouseLeave={e => { if (activeTab !== 'users') { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#3b3b3b'; } }}
            ><Shield size={13} />Users</button>
          )}
        </div>
      </header>

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
                <StatCard label="Total Hardware"    value={entries.length}                                                                                                           color="blue"   icon={<Package size={14} />} />
                <StatCard label="NCPL HO Total"     value={entries.filter(e => (e.billingCompany ?? '').toUpperCase().includes('NCPL')).length}                                      color="blue"   icon={<Monitor size={14} />} />
                <StatCard label="Rainland Total"    value={entries.filter(e => (e.billingCompany ?? '').toUpperCase().includes('RAINLAND')).length}                                  color="green"  icon={<Monitor size={14} />} />
                <StatCard label="Available Total"   value={entries.filter(e => e.assetStatus === 'Available').length}                                                                color="gray"   icon={<CheckCircle2 size={14} />} />
                <StatCard label="Active Allocations" value={activeAllocCount}                                                                                                        color="purple" icon={<ArrowLeftRight size={14} />} />
                <StatCard label="Total Employees"   value={employees.length}                                                                                                         color="blue"   icon={<Users size={14} />} />
              </div>

              {/* Hardware 3-panel lists */}
              <div className="grid grid-cols-3 gap-3" style={{ height: 280 }}>

                {/* Panel 1: Available — NCPL HO */}
                {(() => {
                  const list = entries.filter(e => e.assetStatus === 'Available' && (e.billingCompany ?? '').toUpperCase().includes('NCPL'));
                  return (
                    <div className="rounded-xl shadow-sm flex flex-col overflow-hidden" style={{ border: '1px solid #2e75b6' }}>
                      <div className="px-3 py-1.5 flex items-center justify-between flex-shrink-0" style={{ background: '#2e75b6' }}>
                        <p className="text-xs font-bold text-white uppercase tracking-wide">Available — NCPL HO</p>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#1f4e79', color: '#fff' }}>{list.length}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
                        {list.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-xs text-gray-400">No available assets</div>
                        ) : (
                          <table className="w-full text-[10.5px]" style={{ fontFamily: "'Calibri','Arial',sans-serif" }}>
                            <thead className="sticky top-0" style={{ background: '#bdd7ee' }}>
                              <tr>
                                <th className="px-2 py-1 text-left font-bold border-b border-[#2e75b6]" style={{ color: '#1f3864' }}>Previous User</th>
                                <th className="px-2 py-1 text-left font-bold border-b border-[#2e75b6]" style={{ color: '#1f3864' }}>Product</th>
                                <th className="px-2 py-1 text-left font-bold border-b border-[#2e75b6]" style={{ color: '#1f3864' }}>Make</th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((e, i) => (
                                <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f2f2f2]'}>
                                  <td className="px-2 py-[2px] border-b border-[#e8e8e8] text-gray-600">{e.owner ?? '—'}</td>
                                  <td className="px-2 py-[2px] border-b border-[#e8e8e8] text-gray-800 font-medium">{e.category ?? e.serviceName}</td>
                                  <td className="px-2 py-[2px] border-b border-[#e8e8e8] text-gray-600">{e.vendor ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Panel 2: Available — RAINLAND */}
                {(() => {
                  const list = entries.filter(e => e.assetStatus === 'Available' && (e.billingCompany ?? '').toUpperCase().includes('RAINLAND'));
                  return (
                    <div className="rounded-xl shadow-sm flex flex-col overflow-hidden" style={{ border: '1px solid #375623' }}>
                      <div className="px-3 py-1.5 flex items-center justify-between flex-shrink-0" style={{ background: '#375623' }}>
                        <p className="text-xs font-bold text-white uppercase tracking-wide">Available — RAINLAND</p>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#1e3a12', color: '#fff' }}>{list.length}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
                        {list.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-xs text-gray-400">No available assets</div>
                        ) : (
                          <table className="w-full text-[10.5px]" style={{ fontFamily: "'Calibri','Arial',sans-serif" }}>
                            <thead className="sticky top-0" style={{ background: '#e2efda' }}>
                              <tr>
                                <th className="px-2 py-1 text-left font-bold border-b border-[#375623]" style={{ color: '#1e3a12' }}>Previous User</th>
                                <th className="px-2 py-1 text-left font-bold border-b border-[#375623]" style={{ color: '#1e3a12' }}>Product</th>
                                <th className="px-2 py-1 text-left font-bold border-b border-[#375623]" style={{ color: '#1e3a12' }}>Make</th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((e, i) => (
                                <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f2f2f2]'}>
                                  <td className="px-2 py-[2px] border-b border-[#e8e8e8] text-gray-600">{e.owner ?? '—'}</td>
                                  <td className="px-2 py-[2px] border-b border-[#e8e8e8] text-gray-800 font-medium">{e.category ?? e.serviceName}</td>
                                  <td className="px-2 py-[2px] border-b border-[#e8e8e8] text-gray-600">{e.vendor ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Panel 3: In Use hardware list */}
                {(() => {
                  const list = entries.filter(e => e.assetStatus === 'InUse');
                  return (
                    <div className="rounded-xl shadow-sm flex flex-col overflow-hidden" style={{ border: '1px solid #833c00' }}>
                      <div className="px-3 py-1.5 flex items-center justify-between flex-shrink-0" style={{ background: '#833c00' }}>
                        <p className="text-xs font-bold text-white uppercase tracking-wide">In Use</p>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#4d2300', color: '#fff' }}>{list.length}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
                        {list.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-xs text-gray-400">No assets in use</div>
                        ) : (
                          <table className="w-full text-[10.5px]" style={{ fontFamily: "'Calibri','Arial',sans-serif" }}>
                            <thead className="sticky top-0" style={{ background: '#fce4d6' }}>
                              <tr>
                                <th className="px-2 py-1 text-left font-bold border-b border-[#833c00]" style={{ color: '#4d2300' }}>User ID</th>
                                <th className="px-2 py-1 text-left font-bold border-b border-[#833c00]" style={{ color: '#4d2300' }}>Previous User</th>
                                <th className="px-2 py-1 text-left font-bold border-b border-[#833c00]" style={{ color: '#4d2300' }}>Product</th>
                                <th className="px-2 py-1 text-left font-bold border-b border-[#833c00]" style={{ color: '#4d2300' }}>Make</th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((e, i) => (
                                <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f2f2f2]'}>
                                  <td className="px-2 py-[2px] border-b border-[#e8e8e8] text-gray-700 whitespace-nowrap">{e.allocations?.[0]?.employee.name ?? '—'}</td>
                                  <td className="px-2 py-[2px] border-b border-[#e8e8e8] text-gray-600">{e.owner ?? '—'}</td>
                                  <td className="px-2 py-[2px] border-b border-[#e8e8e8] text-gray-800 font-medium">{e.category ?? e.serviceName}</td>
                                  <td className="px-2 py-[2px] border-b border-[#e8e8e8] text-gray-600">{e.vendor ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })()}

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
          <div className="h-full flex flex-col w-full">
            {/* Excel-style toolbar */}
            <div className="bg-[#f2f2f2] border-b border-[#bfbfbf] px-2 py-1 flex flex-wrap items-center gap-1.5 flex-shrink-0">
              <input
                className="border border-[#bfbfbf] bg-white px-2 py-[3px] text-xs flex-1 min-w-[160px] max-w-xs focus:outline-none focus:border-blue-500"
                placeholder="Search by name, vendor, owner…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="border border-[#bfbfbf] bg-white px-2 py-[3px] text-xs min-w-[120px] focus:outline-none focus:border-blue-500"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {['All', 'Laptop', 'Desktop', 'Phone/Mobile', 'Tablet', 'Monitor', 'Printer', 'Scanner', 'Server', 'Networking', 'UPS', 'Projector', 'Camera', 'Other Hardware'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                className="border border-[#bfbfbf] bg-white px-2 py-[3px] text-xs min-w-[100px] focus:outline-none focus:border-blue-500"
                value={criticality}
                onChange={(e) => setCriticality(e.target.value)}
              >
                {['All', 'High', 'Medium', 'Low'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                className="border border-[#bfbfbf] bg-white px-2 py-[3px] text-xs min-w-[130px] focus:outline-none focus:border-blue-500"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <option value="All">All Companies</option>
                {Array.from(new Set(entries.map(e => e.billingCompany).filter(Boolean))).sort().map(c => (
                  <option key={c!} value={c!}>{c}</option>
                ))}
              </select>
              <div className="flex items-center gap-1 ml-auto">
                <button
                  className="flex items-center gap-1 border border-[#bfbfbf] bg-white hover:bg-[#e8e8e8] px-2 py-[3px] text-xs transition-colors"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['entries'] })}
                  title="Refresh"
                >
                  <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <button
                  className="flex items-center gap-1 border border-[#bfbfbf] bg-white hover:bg-[#e8e8e8] px-2 py-[3px] text-xs transition-colors"
                  onClick={() => setReportOpen(true)}
                >
                  <Download size={12} />
                  Report
                </button>
                <button
                  className="flex items-center gap-1 border border-[#217346] bg-[#217346] hover:bg-[#1a5c38] text-white px-2 py-[3px] text-xs transition-colors"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus size={12} />
                  Add New
                </button>
              </div>
            </div>

            {/* Table fills remaining height, rows scroll inside */}
            <div className="flex-1 min-h-0 bg-white overflow-hidden flex flex-col border-t-0">
              <TrackerTable
                entries={companyFilter === 'All' ? entries : entries.filter(e => e.billingCompany === companyFilter)}
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
          allocatedUser={editEntry?.allocations?.[0]?.employee?.name ?? undefined}
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
