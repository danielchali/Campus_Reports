"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Image from 'next/image';
import { login as apiLogin } from '../../utils/api';

export default function LoginPage() {
  const { login, loginOffline, user } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      // Check if we're already on a valid page for this user
      const currentPath = window.location.pathname;
      const validPaths = ['/admin', '/academic-dashboard', '/security-dashboard', '/dashboard', '/cases', '/students', '/reports', '/evidence', '/audit', '/profile', '/help'];
      
      // If we're on a valid page, don't redirect
      if (validPaths.some(path => currentPath.startsWith(path))) {
        return;
      }
      
      // Otherwise, redirect based on role
      const role = user.role;
      if (role === 'admin') {
          router.push('/admin');
      } else if (role === 'academic_office') {
          router.push('/academic-dashboard');
      } else if (role === 'security_officer') {
          router.push('/security-dashboard');
      } else {
          router.push('/dashboard');
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      let result;
      
      // Try online login first
      try {
        result = await apiLogin(username, password);
        await login(username, password);
      } catch (onlineError) {
        // If online login fails, try offline login
        const offlineSuccess = await loginOffline(username, password);
        if (offlineSuccess) {
          result = { user: { role: 'offline_user' } }; // Use stored user data
        } else {
          throw onlineError;
        }
      }
      
      // Use the result for redirection
      const role = result.user?.role;
      
      if (role === 'admin') {
          router.push('/admin');
      } else if (role === 'academic_office') {
          router.push('/academic-dashboard');
      } else if (role === 'security_officer') {
          router.push('/security-dashboard');
      } else {
          router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-3">
      <div className="w-full max-w-sm md:max-w-lg">
        <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 lg:p-12 flex flex-col items-center">
          <div className="mb-8 flex justify-center">
            <img 
              src="/kmu_logo.svg" 
              alt="KMU Logo" 
              width={96} 
              height={96} 
              className="max-w-[96px] h-auto"
              onError={(e) => {
                console.error('Logo failed to load:', e);
                // Fallback to text if logo fails
                e.currentTarget.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'text-4xl font-bold text-kmuGreen mb-8';
                fallback.textContent = 'KMU';
                e.currentTarget.parentNode?.appendChild(fallback);
              }}
              onLoad={() => console.log('Logo loaded successfully')}
            />
          </div>
          <h2 className="text-3xl font-extrabold text-kmuGreen text-center mb-8">Sign in to KMU DisciplineDesk</h2>
          
          <form className="space-y-6 w-full" onSubmit={handleSubmit} aria-label="Login form" autoComplete="off">
          {/* Hidden fields to prevent autofill */}
          <input type="text" style={{ display: 'none' }} autoComplete="username" />
          <input type="password" style={{ display: 'none' }} autoComplete="current-password" />
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2 text-lg" htmlFor="username">Username</label>
            <input 
              id="username" 
              name="username"
              type="text" 
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-kmuGreen bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" 
              required 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              aria-label="Username"
              autoComplete="new-username"
              data-form-type="other"
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2 text-lg" htmlFor="password">Password</label>
            <input 
              id="password" 
              name="password"
              type="password" 
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-kmuGreen bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              aria-label="Password"
              autoComplete="new-password"
              data-form-type="other"
            />
          </div>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-kmuGreen hover:bg-kmuOrange text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            aria-label="Sign in"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          </form>
        </div>
      </div>
    </div>
  );
}