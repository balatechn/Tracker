'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { authApi } from '@/lib/api';
import { getMsalInstance, loginRequest } from '@/lib/msalConfig';

const MS_BLUE = '#0078d4';

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
    </svg>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [error, setError] = useState('');
  const [msEnabled, setMsEnabled] = useState(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;
    const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID;
    setMsEnabled(!!(clientId && tenantId));
    if (clientId && tenantId) {
      getMsalInstance()?.initialize().catch(() => {});
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(username.trim(), password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);
      router.replace('/dashboard');
    } catch {
      setError('Invalid username or password');
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleMicrosoftLogin() {
    const msal = getMsalInstance();
    if (!msal) return;
    setMsLoading(true);
    setError('');
    try {
      await msal.initialize();
      const result = await msal.loginPopup(loginRequest);
      const idToken = result.idToken;
      const { data } = await authApi.microsoftLogin(idToken);

      if ('status' in data && data.status === 'pending') {
        toast('Your account is pending admin approval. You will be notified when access is granted.', { icon: '⏳', duration: 8000 });
        return;
      }

      const loginData = data as { token: string; username: string; role: string };
      localStorage.setItem('token', loginData.token);
      localStorage.setItem('username', loginData.username);
      localStorage.setItem('role', loginData.role);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('user_cancelled') && !msg.includes('popup_window_error')) {
        setError('Microsoft sign-in failed. Please try again.');
        toast.error('Microsoft sign-in failed');
      }
    } finally {
      setMsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm bg-white rounded-xl shadow-xl overflow-hidden">
      <div className="bg-brand-500 px-6 py-4">
        <h2 className="text-white font-semibold text-lg">Sign in</h2>
        <p className="text-brand-100 text-sm opacity-80">Access the IT Asset Tracker</p>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
        <div>
          <label className="label">Username</label>
          <input
            className="input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoFocus
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPw((v) => !v)}
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
          {loading ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <LogIn size={16} />
          )}
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        {msEnabled && (
          <>
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={msLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
              style={{ borderColor: msLoading ? undefined : '#8c8c8c' }}
            >
              {msLoading ? (
                <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
              ) : (
                <MicrosoftIcon />
              )}
              <span style={{ color: msLoading ? undefined : MS_BLUE }}>
                {msLoading ? 'Signing in…' : 'Sign in with Microsoft'}
              </span>
            </button>
          </>
        )}
      </form>
    </div>
  );
}
