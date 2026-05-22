'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api';
import { Task } from '@/types';
import { BarChart2, Columns, List, Plus, RefreshCw, LayoutDashboard } from 'lucide-react';
import TaskGanttView from './TaskGanttView';
import TaskKanbanView from './TaskKanbanView';
import TaskListView from './TaskListView';
import TaskFormModal from './TaskFormModal';
import TaskDetailPanel from './TaskDetailPanel';
import toast from 'react-hot-toast';

type SubView = 'gantt' | 'kanban' | 'list';

const LOCATIONS = ['All Locations', 'Mangaluru', 'Shivamogga', 'Hassan', 'Chikkamagaluru'];
const STATUSES  = ['All', 'Planned', 'In Progress', 'Completed', 'Delayed', 'On Hold', 'Waiting Approval'];

export default function TaskMgtTab() {
  const qc = useQueryClient();
  const [view, setView]           = useState<SubView>('gantt');
  const [locationF, setLocationF] = useState('All Locations');
  const [statusF, setStatusF]     = useState('All');
  const [formOpen, setFormOpen]   = useState(false);
  const [editTask, setEditTask]   = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const { data: tasks = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['tasks', locationF, statusF],
    queryFn: () => tasksApi.list({
      location: locationF !== 'All Locations' ? locationF : undefined,
      status:   statusF   !== 'All'           ? statusF   : undefined,
    }).then(r => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['task-stats'],
    queryFn: () => tasksApi.stats().then(r => r.data),
  });

  function openEdit(t: Task) { setEditTask(t); setFormOpen(true); }
  function openDetail(t: Task) { setDetailTask(t); }
  function closeForm() { setFormOpen(false); setEditTask(null); }
  function onSaved() { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['task-stats'] }); closeForm(); }

  const STATUS_COLORS: Record<string, string> = {
    Planned: 'bg-orange-100 text-orange-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    Delayed: 'bg-red-100 text-red-700',
    'On Hold': 'bg-gray-100 text-gray-600',
    'Waiting Approval': 'bg-purple-100 text-purple-700',
  };

  const statCards = [
    { label: 'Total',       value: stats?.total   ?? 0,   color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Planned',     value: stats?.byStatus?.Planned ?? 0, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'In Progress', value: stats?.byStatus?.['In Progress'] ?? 0, color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'Completed',   value: stats?.byStatus?.Completed ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Delayed',     value: stats?.delayed ?? 0,   color: 'text-red-600',    bg: 'bg-red-50'    },
    { label: 'Due This Week', value: stats?.upcoming ?? 0, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">

      {/* Sub-header: stats + controls */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0 px-4 py-2">
        {/* Stat pills */}
        <div className="flex gap-2 mb-2 flex-wrap">
          {statCards.map(s => (
            <div key={s.label} className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${s.bg} text-xs font-medium`}>
              <span className={s.color}>{s.value}</span>
              <span className="text-gray-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View switcher */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {([
              { id: 'gantt',  icon: <BarChart2 size={13} />,  label: 'Gantt'  },
              { id: 'kanban', icon: <Columns size={13} />,    label: 'Kanban' },
              { id: 'list',   icon: <List size={13} />,       label: 'List'   },
            ] as {id: SubView; icon: React.ReactNode; label: string}[]).map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === v.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>

          {/* Location filter */}
          <select
            className="input text-xs py-1.5 w-44"
            value={locationF}
            onChange={e => setLocationF(e.target.value)}
          >
            {LOCATIONS.map(l => <option key={l}>{l}</option>)}
          </select>

          {/* Status filter */}
          <select
            className="input text-xs py-1.5 w-36"
            value={statusF}
            onChange={e => setStatusF(e.target.value)}
          >
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>

          {/* Location progress badges */}
          <div className="hidden lg:flex gap-1 ml-2">
            {['Mangaluru','Shivamogga','Hassan','Chikkamagaluru'].map(loc => {
              const count = stats?.byLocation?.[loc] ?? 0;
              return (
                <button
                  key={loc}
                  onClick={() => setLocationF(loc)}
                  className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                    locationF === loc
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300'
                  }`}
                >
                  {loc.slice(0,4)} ({count})
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex gap-2">
            <button
              onClick={() => refetch()}
              className="btn-secondary text-xs py-1.5 flex items-center gap-1"
              disabled={isFetching}
            >
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={() => { setEditTask(null); setFormOpen(true); }}
              className="btn-primary text-xs py-1.5 flex items-center gap-1"
            >
              <Plus size={12} /> New Task
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className={`flex-1 min-w-0 overflow-auto ${detailTask ? 'hidden lg:block' : ''}`}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading tasks…</div>
          ) : view === 'gantt' ? (
            <TaskGanttView
              tasks={tasks}
              onTaskClick={openDetail}
              onTaskEdit={openEdit}
              locationFilter={locationF}
            />
          ) : view === 'kanban' ? (
            <TaskKanbanView
              tasks={tasks}
              onTaskClick={openDetail}
              onStatusChange={(id, status) => {
                tasksApi.update(id, { status }).then(() => {
                  qc.invalidateQueries({ queryKey: ['tasks'] });
                  qc.invalidateQueries({ queryKey: ['task-stats'] });
                  toast.success('Status updated');
                });
              }}
            />
          ) : (
            <TaskListView
              tasks={tasks}
              onTaskClick={openDetail}
              onTaskEdit={openEdit}
              onTaskDelete={(id) => {
                tasksApi.delete(id).then(() => {
                  qc.invalidateQueries({ queryKey: ['tasks'] });
                  qc.invalidateQueries({ queryKey: ['task-stats'] });
                  toast.success('Task deleted');
                });
              }}
            />
          )}
        </div>

        {/* Detail side panel */}
        {detailTask && (
          <TaskDetailPanel
            task={detailTask}
            onClose={() => setDetailTask(null)}
            onEdit={() => { openEdit(detailTask); setDetailTask(null); }}
            onUpdated={() => {
              qc.invalidateQueries({ queryKey: ['tasks'] });
              qc.invalidateQueries({ queryKey: ['task-stats'] });
            }}
          />
        )}
      </div>

      {/* Task form modal */}
      {formOpen && (
        <TaskFormModal
          task={editTask}
          allTasks={tasks}
          onClose={closeForm}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
