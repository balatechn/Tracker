'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      router.replace('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-brand-800 flex flex-col items-center justify-center p-4">
      {/* Header bar */}
      <div className="w-full max-w-md mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" fill="#0078d4" />
              <rect x="13" y="3" width="8" height="8" fill="#0078d4" opacity="0.7" />
              <rect x="3" y="13" width="8" height="8" fill="#0078d4" opacity="0.7" />
              <rect x="13" y="13" width="8" height="8" fill="#0078d4" opacity="0.4" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-white text-xs opacity-80 uppercase tracking-widest">Junobo Hotels</p>
            <h1 className="text-white text-xl font-semibold leading-none">IT Asset Tracker</h1>
          </div>
        </div>
      </div>

      <LoginForm />

      <p className="mt-6 text-brand-100 text-xs opacity-60">
        © 2026 Junobo Hotels · IT Department
      </p>
    </div>
  );
}
