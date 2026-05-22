'use client';
import { useState, useEffect } from 'react';
import { Task } from '@/types';
import { tasksApi } from '@/lib/api';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  task: Task | null;
  allTasks: Task[];
  onClose: () => void;
  onSaved: () => void;
}

const LOCATIONS  = ['All Locations', 'Mangaluru', 'Shivamogga', 'Hassan', 'Chikkamagaluru'];
const STATUSES   = ['Planned', 'In Progress', 'Waiting Approval', 'Completed', 'On Hold', 'Delayed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const empty = {
  taskName: '', projectName: '', location: 'All Locations', department: '',
  description: '', assignedTo: '', startDate: '', endDate: '',
  priority: 'Medium', status: 'Planned', dependencyIds: '',
  estimatedHours: '', actualHours: '', notes: '',
  completionPct: '0', milestone: false,
};

export default function TaskFormModal({ task, allTasks, onClose, onSaved }: Props) {
  const [form, setForm]       = useState(empty);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        taskName:       task.taskName,
        projectName:    task.projectName  || '',
        location:       task.location     || 'All Locations',
        department:     task.department   || '',
        description:    task.description  || '',
        assignedTo:     task.assignedTo   || '',
        startDate:      task.startDate  ? new Date(task.startDate).toISOString().slice(0, 10)  : '',
        endDate:        task.endDate    ? new Date(task.endDate).toISOString().slice(0, 10)    : '',
        priority:       task.priority,
        status:         task.status,
        dependencyIds:  task.dependencyIds  || '',
        estimatedHours: task.estimatedHours != null ? String(task.estimatedHours) : '',
        actualHours:    task.actualHours    != null ? String(task.actualHours)    : '',
        notes:          task.notes          || '',
        completionPct:  String(task.completionPct),
        milestone:      task.milestone,
      });
    } else {
      setForm(empty);
    }
  }, [task]);

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  async function save() {
    if (!form.taskName || !form.startDate || !form.endDate) {
      toast.error('Task name, start date and end date are required');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error('End date must be after start date');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        taskName:       form.taskName,
        projectName:    form.projectName  || undefined,
        location:       form.location     || undefined,
        department:     form.department   || undefined,
        description:    form.description  || undefined,
        assignedTo:     form.assignedTo   || undefined,
        startDate:      form.startDate,
        endDate:        form.endDate,
        priority:       form.priority,
        status:         form.status,
        dependencyIds:  form.dependencyIds || undefined,
        estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
        actualHours:    form.actualHours    ? parseFloat(form.actualHours)    : undefined,
        notes:          form.notes          || undefined,
        completionPct:  parseInt(form.completionPct) || 0,
        milestone:      form.milestone,
      };
      if (task) {
        await tasksApi.update(task.id, payload);
        toast.success('Task updated');
      } else {
        await tasksApi.create(payload);
        toast.success('Task created');
      }
      onSaved();
    } catch {
      toast.error('Failed to save task');
    } finally {
      setSaving(false);
    }
  }

  const otherTasks = allTasks.filter(t => !task || t.id !== task.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Row 1: Name + Project */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Task Name <span className="text-red-500">*</span></label>
              <input className="input" value={form.taskName} onChange={e => set('taskName', e.target.value)} placeholder="e.g. Windows Installation" />
            </div>
            <div>
              <label className="label">Project Name</label>
              <input className="input" value={form.projectName} onChange={e => set('projectName', e.target.value)} placeholder="e.g. NGI IT Infrastructure 2026" />
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. IT Infra" />
            </div>
          </div>

          {/* Row 2: Location + Assigned To */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Location</label>
              <select className="input" value={form.location} onChange={e => set('location', e.target.value)}>
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assigned To</label>
              <input className="input" value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} placeholder="Name or team" />
            </div>
          </div>

          {/* Row 3: Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date <span className="text-red-500">*</span></label>
              <input className="input" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className="label">End Date <span className="text-red-500">*</span></label>
              <input className="input" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>

          {/* Row 4: Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Row 5: Hours + Completion */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Estimated Hours</label>
              <input className="input" type="number" min="0" value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)} />
            </div>
            <div>
              <label className="label">Actual Hours</label>
              <input className="input" type="number" min="0" value={form.actualHours} onChange={e => set('actualHours', e.target.value)} />
            </div>
            <div>
              <label className="label">Completion %</label>
              <input className="input" type="number" min="0" max="100" value={form.completionPct} onChange={e => set('completionPct', e.target.value)} />
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <label className="label">Dependencies (select tasks)</label>
            <div className="border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto grid grid-cols-2 gap-1">
              {otherTasks.length === 0 && <span className="text-xs text-gray-400 col-span-2">No other tasks</span>}
              {otherTasks.map(t => {
                const deps = form.dependencyIds ? form.dependencyIds.split(',').map(s => s.trim()) : [];
                const checked = deps.includes(String(t.id));
                return (
                  <label key={t.id} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const newDeps = checked
                          ? deps.filter(d => d !== String(t.id))
                          : [...deps, String(t.id)];
                        set('dependencyIds', newDeps.filter(Boolean).join(','));
                      }}
                    />
                    <span className="text-gray-400 w-4">{t.id}</span>
                    <span className="truncate text-gray-700">{t.taskName}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Task details…" />
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes…" />
          </div>

          {/* Milestone toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={form.milestone}
              onChange={e => set('milestone', e.target.checked)}
            />
            <span className="text-sm text-gray-700">Mark as Milestone</span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
