'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Shield, UserCheck, UserX, Trash2, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { authApi, AppUser } from '@/lib/api';

const ROLES = ['admin', 'editor', 'viewer'] as const;
const STATUSES = ['active', 'pending', 'disabled'] as const;

function RoleBadge({ role }: { role: string }) {
  const cls = role === 'admin' ? 'bg-red-100 text-red-700' : role === 'editor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600';
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{role}</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return <span className="inline-flex items-center gap-1 text-xs text-green-700"><CheckCircle size={12} /> Active</span>;
  if (status === 'pending') return <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Clock size={12} /> Pending</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-red-600"><XCircle size={12} /> Disabled</span>;
}

export default function UsersTab() {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['auth-users'],
    queryFn: () => authApi.listUsers().then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { role?: string; status?: string } }) =>
      authApi.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth-users'] });
      toast.success('User updated');
    },
    onError: () => toast.error('Failed to update user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => authApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth-users'] });
      setConfirmDelete(null);
      toast.success('User deleted');
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const pending = users.filter(u => u.status === 'pending');
  const currentUser = typeof window !== 'undefined' ? localStorage.getItem('username') : null;

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-brand-500" />
          <h2 className="text-lg font-semibold text-gray-800">User Management</h2>
          {pending.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
              {pending.length} pending approval
            </span>
          )}
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-xs gap-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Pending approvals banner */}
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-sm text-amber-800 font-medium mb-2">
            {pending.length} user{pending.length > 1 ? 's' : ''} waiting for approval
          </p>
          <div className="flex flex-wrap gap-2">
            {pending.map(u => (
              <div key={u.id} className="flex items-center gap-2 bg-white border border-amber-200 rounded-md px-3 py-1.5">
                <span className="text-sm font-medium text-gray-700">{u.displayName ?? u.username}</span>
                {u.email && <span className="text-xs text-gray-400">{u.email}</span>}
                <button
                  className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium ml-1"
                  onClick={() => updateMutation.mutate({ id: u.id, data: { status: 'active' } })}
                >
                  <UserCheck size={13} /> Approve
                </button>
                <button
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium"
                  onClick={() => updateMutation.mutate({ id: u.id, data: { status: 'disabled' } })}
                >
                  <UserX size={13} /> Reject
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Policy info */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Role Policy:</strong>&nbsp;
        <span className="font-medium text-red-700">Admin</span> — full access · &nbsp;
        <span className="font-medium text-blue-700">Editor</span> — create & update (no delete) · &nbsp;
        <span className="font-medium text-gray-600">Viewer</span> — read-only
      </div>

      {/* Users table */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading users…</div>
      ) : (
        <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Auth</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => {
                const isSelf = user.username === currentUser || user.displayName === currentUser;
                return (
                  <tr key={user.id} className={`hover:bg-gray-50 ${user.status === 'pending' ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{user.displayName ?? user.username}</div>
                      {user.email && <div className="text-xs text-gray-400">{user.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${user.authProvider === 'microsoft' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {user.authProvider === 'microsoft' ? '🔷 Microsoft' : '🔑 Local'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        disabled={isSelf}
                        onChange={e => updateMutation.mutate({ id: user.id, data: { role: e.target.value } })}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {user.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateMutation.mutate({ id: user.id, data: { status: 'active' } })}
                              className="p-1 rounded text-green-600 hover:bg-green-50" title="Approve"
                            >
                              <UserCheck size={15} />
                            </button>
                            <button
                              onClick={() => updateMutation.mutate({ id: user.id, data: { status: 'disabled' } })}
                              className="p-1 rounded text-red-500 hover:bg-red-50" title="Reject"
                            >
                              <UserX size={15} />
                            </button>
                          </>
                        )}
                        {user.status === 'active' && !isSelf && (
                          <button
                            onClick={() => updateMutation.mutate({ id: user.id, data: { status: 'disabled' } })}
                            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50" title="Disable"
                          >
                            <UserX size={15} />
                          </button>
                        )}
                        {user.status === 'disabled' && (
                          <button
                            onClick={() => updateMutation.mutate({ id: user.id, data: { status: 'active' } })}
                            className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50" title="Enable"
                          >
                            <UserCheck size={15} />
                          </button>
                        )}
                        {!isSelf && (
                          <button
                            onClick={() => setConfirmDelete(user)}
                            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50" title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-gray-800 mb-2">Delete User</h3>
            <p className="text-sm text-gray-600 mb-4">
              Delete <strong>{confirmDelete.displayName ?? confirmDelete.username}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary text-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn-danger text-sm"
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
