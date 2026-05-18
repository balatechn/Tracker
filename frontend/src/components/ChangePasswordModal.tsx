'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { toast.error('New passwords do not match'); return; }
    if (next.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      await authApi.changePassword(current, next);
      toast.success('Password changed successfully');
      onClose();
    } catch {
      toast.error('Incorrect current password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-500 px-5 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-white font-semibold">Change Password</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {[
            { label: 'Current Password', value: current, set: setCurrent, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
            { label: 'New Password', value: next, set: setNext, show: showNew, toggle: () => setShowNew(v => !v) },
            { label: 'Confirm New Password', value: confirm, set: setConfirm, show: showNew, toggle: () => {} },
          ].map(({ label, value, set, show, toggle }) => (
            <div key={label}>
              <label className="label">{label}</label>
              <div className="relative">
                <input className="input pr-10" type={show ? 'text' : 'password'} value={value} onChange={(e) => set(e.target.value)} required />
                {label !== 'Confirm New Password' && (
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={toggle} tabIndex={-1}>
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? 'Saving…' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
