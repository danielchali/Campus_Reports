"use client";

import { useState } from 'react';
import { Mail, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../context/ThemeContext';
import { API_URL } from '../../config/constants';

export default function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { theme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    
    setStatus('loading');
    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
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
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Reset Password</h1>
          <p className="text-slate-500 dark:text-slate-400">Enter your Student or Staff ID and we'll send a reset OTP to your email.</p>
        </div>

        {status === 'success' ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-sm font-medium">
              {message}
            </div>
            <Link
              href="/reset-password"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-kmuGreen hover:bg-kmuGreen-dark transition-all"
            >
              <KeyRound className="w-4 h-4" />
              I have my OTP
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Didn't receive it? Go back and request a new OTP.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`block w-full pl-11 pr-4 py-3 bg-transparent border rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-kmuGreen focus:border-transparent ${theme === 'dark' ? 'border-slate-700 text-white placeholder-slate-500 focus:bg-slate-800/50' : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'}`}
                  placeholder="Enter your ID (e.g., 1234567)"
                />
              </div>
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-sm font-medium">{message}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !username}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-kmuGreen hover:bg-kmuGreen-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kmuGreen transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset OTP'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
