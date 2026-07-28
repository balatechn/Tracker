'use client';
import { useMemo, useRef } from 'react';
import { Task as GanttTask, Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { Task } from '@/types';
import { useState } from 'react';
import { ZoomIn, ZoomOut, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  tasks: Task[];
  onTaskClick: (t: Task) => void;
  onTaskEdit: (t: Task) => void;
  locationFilter: string;
}

const STATUS_GANTT_COLORS: Record<string, string> = {
  'Completed':        '#16a34a',
  'In Progress':      '#2563eb',
  'Planned':          '#ea580c',
  'Delayed':          '#dc2626',
  'On Hold':          '#9ca3af',
  'Waiting Approval': '#7c3aed',
};

export default function TaskGanttView({ tasks, onTaskClick, onTaskEdit, locationFilter }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const containerRef = useRef<HTMLDivElement>(null);

  const ganttTasks: GanttTask[] = useMemo(() => {
    if (!tasks.length) return [];

    return tasks.map(t => {
      const start = new Date(t.startDate);
      const end   = new Date(t.endDate);
      // Gantt requires end > start
      if (end <= start) end.setDate(start.getDate() + 1);

      return {
        id:           String(t.id),
        name:         t.taskName,
        start,
        end,
        progress:     t.completionPct,
        type:         t.milestone ? 'milestone' : 'task',
        styles: {
          backgroundColor:        STATUS_GANTT_COLORS[t.status] || '#ea580c',
          backgroundSelectedColor: STATUS_GANTT_COLORS[t.status] || '#ea580c',
          progressColor:           '#ffffff55',
          progressSelectedColor:   '#ffffff55',
        },
        isDisabled:   false,
        project:      t.location || undefined,
        dependencies: t.dependencyIds
          ? t.dependencyIds.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
      } as GanttTask;
    });
  }, [tasks]);

  function taskById(id: string) { return tasks.find(t => String(t.id) === id); }

  function exportExcel() {
    const rows = tasks.map(t => ({
      ID: t.id, Task: t.taskName, Location: t.location || '',
      Status: t.status, Priority: t.priority,
      Start: new Date(t.startDate).toLocaleDateString('en-IN'),
      End:   new Date(t.endDate).toLocaleDateString('en-IN'),
      'Progress %': t.completionPct,
      'Assigned To': t.assignedTo || '',
      Dependencies: t.dependencyIds || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, `NGI-Tasks-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  async function exportPDF() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(`NGI IT Infrastructure Tasks${locationFilter !== 'All Locations' ? ` — ${locationFilter}` : ''}`, 14, 14);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 20);

    autoTable(doc, {
      startY: 25,
      head: [['#','Task','Location','Status','Priority','Start','End','Progress','Assigned To']],
      body: tasks.map(t => [
        t.id, t.taskName, t.location||'', t.status, t.priority,
        new Date(t.startDate).toLocaleDateString('en-IN'),
        new Date(t.endDate).toLocaleDateString('en-IN'),
        `${t.completionPct}%`, t.assignedTo||'',
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [0, 120, 212] },
    });

    doc.save(`NGI-Tasks-${new Date().toISOString().slice(0,10)}.pdf`);
  }

  if (!ganttTasks.length) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No tasks found for the selected filters.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Gantt toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
        {/* Zoom controls */}
        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-xs">
          {([
            { mode: ViewMode.Day,   label: 'Day'   },
            { mode: ViewMode.Week,  label: 'Week'  },
            { mode: ViewMode.Month, label: 'Month' },
          ] as {mode: ViewMode; label: string}[]).map(v => (
            <button
              key={v.label}
              onClick={() => setViewMode(v.mode)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                viewMode === v.mode
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 ml-2">
          {Object.entries(STATUS_GANTT_COLORS).map(([s, c]) => (
            <span key={s} className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: c }} />
              {s}
            </span>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={exportExcel} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
            <Download size={12} /> Excel
          </button>
          <button onClick={exportPDF} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
            <Download size={12} /> PDF
          </button>
        </div>
      </div>

      {/* Gantt chart */}
      <div ref={containerRef} className="flex-1 overflow-auto gantt-wrapper">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onDoubleClick={t => { const task = taskById(t.id); if (task) onTaskEdit(task); }}
          onClick={t => { const task = taskById(t.id); if (task) onTaskClick(task); }}
          columnWidth={viewMode === ViewMode.Day ? 40 : viewMode === ViewMode.Week ? 120 : 220}
          listCellWidth="180px"
          rowHeight={36}
          barCornerRadius={3}
          headerHeight={48}
          todayColor="rgba(0,120,212,0.1)"
          TooltipContent={({ task }) => {
            const orig = taskById(task.id);
            return (
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-[220px]">
                <p className="font-semibold text-gray-800 mb-1">{task.name}</p>
                {orig && (
                  <>
                    <p className="text-gray-500">📍 {orig.location || '—'}</p>
                    <p className="text-gray-500">👤 {orig.assignedTo || 'Unassigned'}</p>
                    <p className="text-gray-500">📅 {new Date(orig.startDate).toLocaleDateString('en-IN')} → {new Date(orig.endDate).toLocaleDateString('en-IN')}</p>
                    <p className="text-gray-500">Progress: {orig.completionPct}%</p>
                  </>
                )}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
