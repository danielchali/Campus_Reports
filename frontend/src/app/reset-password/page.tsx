"use client";

import { useState, useEffect, Suspense } from 'react';
import { Lock, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';
import { API_URL } from '../../config/constants';
import { InlineSkeleton } from '../../components/PageSkeleton';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters long');
      return;
    }
    
    setStatus('loading');
    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Failed to connect to server');
    }
  };

  return (
    <div className={`min-h-screen relative flex items-center justify-center p-4 ${theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-800'}`}>
      <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>
        <div className="mb-8">
          <Link href="/login" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-kmuGreen transition-colors mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to login
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Create New Password</h1>
          <p className="text-slate-500 dark:text-slate-400">Please enter your new password below.</p>
        </div>

        {status === 'success' ? (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-sm font-medium text-center">
            <p>{message}</p>
            <p className="mt-2 text-xs">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="new-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="new-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full pl-11 pr-4 py-3 bg-transparent border rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-kmuGreen focus:border-transparent ${theme === 'dark' ? 'border-slate-700 text-white placeholder-slate-500 focus:bg-slate-800/50' : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'}`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full pl-11 pr-4 py-3 bg-transparent border rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-kmuGreen focus:border-transparent ${theme === 'dark' ? 'border-slate-700 text-white placeholder-slate-500 focus:bg-slate-800/50' : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'}`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-sm font-medium">{message}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !token}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-kmuGreen hover:bg-kmuGreen-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kmuGreen transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><InlineSkeleton rows={5} /></div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
