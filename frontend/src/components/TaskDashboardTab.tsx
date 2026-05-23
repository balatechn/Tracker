'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api';
import { Task } from '@/types';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { CheckCircle2, Clock, AlertTriangle, ListTodo, Users, TrendingUp, FolderKanban, ChevronDown } from 'lucide-react';

interface Props {
  projectFilter: string;
  projectNames: string[];
  onProjectChange: (p: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Planned':          '#ea580c',
  'In Progress':      '#2563eb',
  'Completed':        '#16a34a',
  'Delayed':          '#dc2626',
  'On Hold':          '#9ca3af',
  'Waiting Approval': '#7c3aed',
};

export default function TaskDashboardTab({ projectFilter, projectNames, onProjectChange }: Props) {
  // Fetch all tasks (unfiltered) for project-level aggregation
  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks-dashboard-all'],
    queryFn: () => tasksApi.list().then(r => r.data),
    staleTime: 30_000,
  });

  const tasks = useMemo(
    () => projectFilter === 'All' ? allTasks : allTasks.filter(t => t.projectName === projectFilter),
    [allTasks, projectFilter]
  );

  // ── KPI ──────────────────────────────────────────
  const total     = tasks.length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const inProg    = tasks.filter(t => t.status === 'In Progress').length;
  const overdue   = tasks.filter(t => t.status !== 'Completed' && t.status !== 'On Hold' && new Date(t.endDate) < new Date()).length;
  const avgPct    = total ? Math.round(tasks.reduce((s, t) => s + t.completionPct, 0) / total) : 0;

  // ── Status distribution ────────────────────────
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || '#9ca3af' }));
  }, [tasks]);

  // ── Project-wise progress (only if "All Projects") ────
  const projectProgress = useMemo(() => {
    if (projectFilter !== 'All') return [];
    const map: Record<string, { total: number; completed: number; pct: number[] }> = {};
    allTasks.forEach(t => {
      const p = t.projectName || 'Unassigned';
      if (!map[p]) map[p] = { total: 0, completed: 0, pct: [] };
      map[p].total++;
      if (t.status === 'Completed') map[p].completed++;
      map[p].pct.push(t.completionPct);
    });
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        total: d.total,
        completed: d.completed,
        avgPct: Math.round(d.pct.reduce((s, v) => s + v, 0) / d.pct.length),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [allTasks, projectFilter]);

  // ── Assignee workload ──────────────────────────
  const assigneeData = useMemo(() => {
    const map: Record<string, { total: number; completed: number; overdue: number }> = {};
    tasks.forEach(t => {
      const person = t.assignedTo || 'Unassigned';
      if (!map[person]) map[person] = { total: 0, completed: 0, overdue: 0 };
      map[person].total++;
      if (t.status === 'Completed') map[person].completed++;
      if (t.status !== 'Completed' && t.status !== 'On Hold' && new Date(t.endDate) < new Date()) map[person].overdue++;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name: name.split(' ')[0], fullName: name, ...d }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [tasks]);

  // ── Upcoming deadlines ─────────────────────────
  const upcoming = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 14);
    return tasks
      .filter(t => t.status !== 'Completed' && new Date(t.endDate) <= cutoff && new Date(t.endDate) >= new Date())
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .slice(0, 8);
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex flex-col gap-3">

        {/* Sub-header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FolderKanban size={18} className="text-brand-600" />
            <h2 className="text-base font-semibold text-gray-800">Task Dashboard</h2>
            {projectFilter !== 'All' && (
              <span className="bg-brand-100 text-brand-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {projectFilter}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Filter:</span>
            <div className="relative">
              <select
                value={projectFilter}
                onChange={e => onProjectChange(e.target.value)}
                className="appearance-none text-xs border border-gray-200 rounded-md pl-2.5 pr-6 py-1.5 bg-white focus:outline-none focus:border-brand-400 cursor-pointer"
              >
                <option value="All">All Projects</option>
                {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-shrink-0">
          {[
            { label: 'Total Tasks',  value: total,     color: 'blue',   icon: <ListTodo size={16} />,      bg: 'bg-blue-50',   text: 'text-blue-600'   },
            { label: 'Completed',    value: completed, color: 'green',  icon: <CheckCircle2 size={16} />,  bg: 'bg-green-50',  text: 'text-green-600'  },
            { label: 'In Progress',  value: inProg,    color: 'blue',   icon: <Clock size={16} />,         bg: 'bg-blue-50',   text: 'text-blue-700'   },
            { label: 'Overdue',      value: overdue,   color: 'red',    icon: <AlertTriangle size={16} />, bg: 'bg-red-50',    text: 'text-red-600'    },
            { label: 'Avg Progress', value: `${avgPct}%`, color: 'purple', icon: <TrendingUp size={16} />, bg: 'bg-purple-50', text: 'text-purple-600' },
          ].map(k => (
            <div key={k.label} className={`${k.bg} rounded-xl p-3 flex items-center gap-3 border border-white shadow-sm`}>
              <div className={`${k.text} flex-shrink-0`}>{k.icon}</div>
              <div>
                <p className={`text-xl font-bold ${k.text}`}>{k.value}</p>
                <p className="text-xs text-gray-500 leading-tight">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* Status donut */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col" style={{ minHeight: 260 }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status Distribution</p>
            {statusData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">No tasks</div>
            ) : (
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%" cy="45%"
                      innerRadius="35%" outerRadius="60%"
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                    >
                      {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} tasks`, '']} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Assignee workload */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col" style={{ minHeight: 260 }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assignee Workload</p>
            {assigneeData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">No data</div>
            ) : (
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={assigneeData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: '#f9fafb' }}
                      formatter={(v, name) => [v, name === 'total' ? 'Total' : name === 'completed' ? 'Completed' : 'Overdue']}
                      labelFormatter={(l) => assigneeData.find(d => d.name === l)?.fullName || l}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="total"     name="Total"     fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="completed" name="Completed" fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="overdue"   name="Overdue"   fill="#dc2626" radius={[3, 3, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: project progress + upcoming deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* Project progress (only when All Projects) */}
          {projectFilter === 'All' ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Project Progress</p>
              {projectProgress.length === 0 ? (
                <p className="text-gray-300 text-sm text-center py-6">No projects</p>
              ) : (
                <div className="space-y-3">
                  {projectProgress.map(proj => (
                    <div key={proj.name}>
                      <div className="flex items-center justify-between mb-1">
                        <button
                          onClick={() => onProjectChange(proj.name === 'Unassigned' ? 'All' : proj.name)}
                          className="text-xs font-medium text-gray-700 hover:text-brand-600 truncate max-w-[60%] text-left"
                        >
                          {proj.name}
                        </button>
                        <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                          <span>{proj.completed}/{proj.total}</span>
                          <span className="font-semibold text-brand-600">{proj.avgPct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-brand-500 transition-all"
                          style={{ width: `${proj.avgPct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* When filtered by project: show status breakdown as progress bars */
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Status Breakdown — {projectFilter}
              </p>
              {statusData.length === 0 ? (
                <p className="text-gray-300 text-sm text-center py-6">No tasks</p>
              ) : (
                <div className="space-y-3">
                  {statusData.map(s => (
                    <div key={s.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">{s.name}</span>
                        <span className="text-xs font-semibold" style={{ color: s.color }}>{s.value} tasks</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${Math.round((s.value / total) * 100)}%`, backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming deadlines */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Upcoming Deadlines (14 days)
            </p>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <CheckCircle2 size={24} className="text-green-400" />
                <p className="text-xs text-gray-400">No tasks due in the next 14 days</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {upcoming.map(t => {
                  const daysLeft = Math.ceil((new Date(t.endDate).getTime() - Date.now()) / 86_400_000);
                  const urgency = daysLeft <= 3 ? 'text-red-600 bg-red-50' : daysLeft <= 7 ? 'text-orange-600 bg-orange-50' : 'text-gray-600 bg-gray-50';
                  return (
                    <div key={t.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{t.taskName}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          {t.assignedTo && <span className="flex items-center gap-0.5"><Users size={9} /> {t.assignedTo}</span>}
                          {t.projectName && <span className="truncate max-w-[100px]">{t.projectName}</span>}
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${urgency}`}>
                        {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
