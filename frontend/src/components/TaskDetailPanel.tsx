'use client';
import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api';
import { Task } from '@/types';
import { X, Pencil, MessageSquare, Paperclip, Clock, ChevronDown, ChevronUp, Send, Upload, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  task: Task;
  onClose: () => void;
  onEdit: () => void;
  onUpdated: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Planned':          'bg-orange-100 text-orange-700',
  'In Progress':      'bg-blue-100 text-blue-700',
  'Completed':        'bg-green-100 text-green-700',
  'Delayed':          'bg-red-100 text-red-700',
  'On Hold':          'bg-gray-100 text-gray-600',
  'Waiting Approval': 'bg-purple-100 text-purple-700',
};

const STATUSES = ['Planned', 'In Progress', 'Waiting Approval', 'Completed', 'On Hold', 'Delayed'];

export default function TaskDetailPanel({ task, onClose, onEdit, onUpdated }: Props) {
  const qc = useQueryClient();
  const [comment, setComment]   = useState('');
  const [pct, setPct]           = useState(task.completionPct);
  const [status, setStatus]     = useState(task.status);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'files' | 'activity'>('details');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: detail, refetch } = useQuery({
    queryKey: ['task-detail', task.id],
    queryFn: () => tasksApi.get(task.id).then(r => r.data),
    initialData: task,
  });

  async function saveProgress() {
    try {
      await tasksApi.update(task.id, { completionPct: pct, status });
      toast.success('Updated');
      onUpdated();
      refetch();
    } catch { toast.error('Failed'); }
  }

  async function postComment() {
    if (!comment.trim()) return;
    try {
      await tasksApi.addComment(task.id, { content: comment });
      setComment('');
      refetch();
    } catch { toast.error('Failed to post comment'); }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = (ev.target?.result as string).split(',')[1];
      try {
        await tasksApi.addAttachment(task.id, {
          filename: file.name,
          mimetype: file.type,
          data: b64,
        });
        toast.success('File uploaded');
        refetch();
      } catch { toast.error('Upload failed'); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const tabs = [
    { id: 'details',  label: 'Details',  icon: <ChevronDown size={12} /> },
    { id: 'comments', label: `Comments (${detail?.comments?.length ?? 0})`, icon: <MessageSquare size={12} /> },
    { id: 'files',    label: `Files (${detail?.attachments?.length ?? 0})`, icon: <Paperclip size={12} /> },
    { id: 'activity', label: 'Activity', icon: <Clock size={12} /> },
  ] as const;

  return (
    <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex-1 pr-2">
          <h3 className="font-semibold text-gray-800 text-sm leading-snug">{detail?.taskName}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{detail?.location || 'No location'} • #{detail?.id}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1 hover:bg-gray-100 rounded" title="Edit"><Pencil size={13} /></button>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={14} /></button>
        </div>
      </div>

      {/* Status + Progress quick edit */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[detail?.status || 'Planned']}`}>
            {detail?.status}
          </span>
          <span className="text-xs text-gray-400">Priority: <strong>{detail?.priority}</strong></span>
        </div>
        <select
          className="input text-xs py-1"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="range" min="0" max="100" value={pct}
            onChange={e => setPct(parseInt(e.target.value))}
            className="flex-1 accent-brand-600"
          />
          <span className="text-xs font-medium text-gray-600 w-8">{pct}%</span>
        </div>
        <button onClick={saveProgress} className="btn-primary text-xs py-1 w-full">
          Save Progress
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === t.id
                ? 'border-b-2 border-brand-500 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">

        {/* Details */}
        {activeTab === 'details' && (
          <div className="px-4 py-3 space-y-3 text-sm">
            <Row label="Project"    value={detail?.projectName} />
            <Row label="Dept"       value={detail?.department} />
            <Row label="Assigned"   value={detail?.assignedTo} />
            <Row label="Start"      value={detail?.startDate ? new Date(detail.startDate).toLocaleDateString('en-IN') : undefined} />
            <Row label="End"        value={detail?.endDate   ? new Date(detail.endDate).toLocaleDateString('en-IN')   : undefined} />
            <Row label="Est. Hours" value={detail?.estimatedHours != null ? `${detail.estimatedHours}h` : undefined} />
            <Row label="Act. Hours" value={detail?.actualHours    != null ? `${detail.actualHours}h`    : undefined} />
            <Row label="Depends On" value={detail?.dependencyIds} />
            {detail?.description && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Description</p>
                <p className="text-xs text-gray-700 leading-relaxed">{detail.description}</p>
              </div>
            )}
            {detail?.notes && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Notes</p>
                <p className="text-xs text-gray-700 leading-relaxed">{detail.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        {activeTab === 'comments' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {(detail?.comments || []).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">No comments yet</p>
              )}
              {(detail?.comments || []).map(c => (
                <div key={c.id} className="bg-gray-50 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{c.author}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{c.content}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-gray-100 flex gap-2">
              <input
                className="input flex-1 text-xs py-1.5"
                placeholder="Add a comment…"
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()}
              />
              <button onClick={postComment} className="btn-primary text-xs py-1.5 px-2">
                <Send size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Files */}
        {activeTab === 'files' && (
          <div className="px-4 py-3 space-y-2">
            <input type="file" ref={fileRef} className="hidden" onChange={uploadFile} />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-lg py-3 text-xs text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors flex items-center justify-center gap-1"
            >
              <Upload size={12} /> Upload File
            </button>
            {(detail?.attachments || []).length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No attachments</p>
            )}
            {(detail?.attachments || []).map(a => (
              <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-gray-700 truncate max-w-[160px]">{a.filename}</p>
                  {a.filesize && <p className="text-[10px] text-gray-400">{Math.round(a.filesize / 1024)}KB</p>}
                </div>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || '/api'}/tasks/${task.id}/attachments/${a.id}`}
                  download={a.filename}
                  className="p-1 hover:bg-blue-100 rounded text-blue-500"
                  title="Download"
                >
                  <Download size={12} />
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Activity */}
        {activeTab === 'activity' && (
          <div className="px-4 py-3 space-y-2">
            {(detail?.activities || []).length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No activity yet</p>
            )}
            {(detail?.activities || []).map(a => (
              <div key={a.id} className="flex gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-700">{a.details || a.action}</p>
                  <p className="text-gray-400 text-[10px]">
                    {a.createdBy} • {new Date(a.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-xs text-gray-400 w-20 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-700">{value}</span>
    </div>
  );
}
