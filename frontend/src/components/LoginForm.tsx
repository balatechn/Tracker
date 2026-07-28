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
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;
    const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID;
    setMsEnabled(!!(clientId && tenantId));
    if (!clientId || !tenantId) return;

    const msal = getMsalInstance();
    if (!msal) return;

    msal.initialize().then(() => {
      // Handle redirect response after Microsoft redirects back
      msal.handleRedirectPromise().then(async (result) => {
        if (!result) return;
        try {
          const { data } = await authApi.microsoftLogin(result.idToken);
          if ('status' in data && data.status === 'pending') {
            toast('Your account is pending admin approval.', { icon: '⏳', duration: 8000 });
            return;
          }
          const loginData = data as { token: string; username: string; role: string };
          localStorage.setItem('token', loginData.token);
          localStorage.setItem('username', loginData.username);
          localStorage.setItem('role', loginData.role);
          router.replace('/dashboard');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(`Sign-in failed: ${msg}`);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, [router]);

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
    if (!msal) {
      setError('Microsoft SSO is not configured. Use Admin login below.');
      return;
    }
    setMsLoading(true);
    setError('');
    try {
      await msal.initialize();
      await msal.loginRedirect(loginRequest);
      // Page will redirect — no code runs after this
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('user_cancelled')) {
        setError('Microsoft sign-in failed. Please try again.');
        toast.error('Microsoft sign-in failed');
      }
      setMsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm bg-white rounded-xl shadow-xl overflow-hidden">
      <div className="bg-brand-500 px-6 py-4">
        <h2 className="text-white font-semibold text-lg">Sign in</h2>
        <p className="text-brand-100 text-sm opacity-80">Access the IT Asset Tracker</p>
      </div>

      <div className="px-6 py-6 space-y-4">
        {/* Primary: Microsoft SSO */}
        <button
          type="button"
          onClick={handleMicrosoftLogin}
          disabled={msLoading}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
          style={{ borderColor: '#8c8c8c' }}
        >
          {msLoading ? (
            <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
          ) : (
            <MicrosoftIcon />
          )}
          <span style={{ color: MS_BLUE }}>
            {msLoading ? 'Signing in…' : 'Sign in with Microsoft'}
          </span>
        </button>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        {/* Manual login — hidden dropdown */}
        <div>
          <button
            type="button"
            onClick={() => setShowManual(v => !v)}
            className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            <span>{showManual ? '▲' : '▼'}</span>
            <span>Admin login</span>
          </button>

          {showManual && (
            <form onSubmit={handleSubmit} className="mt-3 space-y-3 border-t border-gray-100 pt-3">
              <div>
                <label className="label">Username</label>
                <input
                  className="input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
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
              <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
                {loading ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <LogIn size={16} />
                )}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
