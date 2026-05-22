'use client';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task } from '@/types';
import { MapPin, User, Calendar, Flag, ChevronRight } from 'lucide-react';

interface Props {
  tasks: Task[];
  onTaskClick: (t: Task) => void;
  onStatusChange: (id: number, status: string) => void;
}

const COLUMNS = [
  { id: 'Planned',          label: 'Planned',          color: 'border-orange-400',  bg: 'bg-orange-50',  badge: 'bg-orange-100 text-orange-700'  },
  { id: 'In Progress',      label: 'In Progress',      color: 'border-blue-400',    bg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700'      },
  { id: 'Waiting Approval', label: 'Waiting Approval', color: 'border-purple-400',  bg: 'bg-purple-50',  badge: 'bg-purple-100 text-purple-700'  },
  { id: 'Completed',        label: 'Completed',        color: 'border-green-400',   bg: 'bg-green-50',   badge: 'bg-green-100 text-green-700'    },
  { id: 'On Hold',          label: 'On Hold',          color: 'border-gray-400',    bg: 'bg-gray-50',    badge: 'bg-gray-100 text-gray-600'      },
  { id: 'Delayed',          label: 'Delayed',          color: 'border-red-400',     bg: 'bg-red-50',     badge: 'bg-red-100 text-red-700'        },
];

const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'text-red-600',
  High:     'text-orange-500',
  Medium:   'text-yellow-500',
  Low:      'text-gray-400',
};

const LOCATION_COLORS: Record<string, string> = {
  'Mangaluru':      'bg-blue-100 text-blue-700',
  'Shivamogga':     'bg-green-100 text-green-700',
  'Hassan':         'bg-purple-100 text-purple-700',
  'Chikkamagaluru': 'bg-orange-100 text-orange-700',
  'All Locations':  'bg-gray-100 text-gray-600',
};

export default function TaskKanbanView({ tasks, onTaskClick, onStatusChange }: Props) {
  const byStatus: Record<string, Task[]> = {};
  for (const col of COLUMNS) byStatus[col.id] = [];
  for (const t of tasks) {
    const colId = COLUMNS.find(c => c.id === t.status)?.id || 'Planned';
    byStatus[colId].push(t);
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const taskId    = parseInt(result.draggableId);
    const task      = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;
    onStatusChange(taskId, newStatus);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 h-full overflow-x-auto px-4 py-3">
        {COLUMNS.map(col => {
          const colTasks = byStatus[col.id] || [];
          return (
            <div key={col.id} className="flex flex-col flex-shrink-0 w-64">
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-t-4 ${col.color} bg-white border-x border-gray-200`}>
                <span className="text-xs font-semibold text-gray-700">{col.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${col.badge}`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto px-1 py-1 rounded-b-lg border border-t-0 border-gray-200 min-h-[200px] transition-colors ${
                      snapshot.isDraggingOver ? col.bg : 'bg-gray-50'
                    }`}
                  >
                    {colTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            onClick={() => onTaskClick(task)}
                            className={`bg-white rounded-lg border border-gray-200 p-2.5 mb-2 cursor-pointer hover:border-brand-300 hover:shadow-sm transition-all text-xs ${
                              snap.isDragging ? 'shadow-lg border-brand-400 rotate-1' : ''
                            }`}
                          >
                            {/* Priority flag + task name */}
                            <div className="flex items-start justify-between gap-1 mb-1.5">
                              <p className="font-medium text-gray-800 leading-snug line-clamp-2">{task.taskName}</p>
                              <Flag size={10} className={`flex-shrink-0 mt-0.5 ${PRIORITY_COLORS[task.priority] || 'text-gray-400'}`} />
                            </div>

                            {/* Location badge */}
                            {task.location && (
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium mb-1.5 ${LOCATION_COLORS[task.location] || 'bg-gray-100 text-gray-600'}`}>
                                <MapPin size={8} /> {task.location}
                              </span>
                            )}

                            {/* Progress bar */}
                            {task.completionPct > 0 && (
                              <div className="w-full bg-gray-100 rounded-full h-1 mb-1.5">
                                <div
                                  className="h-1 rounded-full bg-brand-500 transition-all"
                                  style={{ width: `${task.completionPct}%` }}
                                />
                              </div>
                            )}

                            {/* Meta */}
                            <div className="flex items-center justify-between text-gray-400">
                              <span className="flex items-center gap-0.5">
                                <Calendar size={9} />
                                {new Date(task.endDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                              </span>
                              {task.assignedTo && (
                                <span className="flex items-center gap-0.5 text-gray-500">
                                  <User size={9} /> {task.assignedTo.split(' ')[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {colTasks.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-center text-gray-300 text-xs py-6">Drop here</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
