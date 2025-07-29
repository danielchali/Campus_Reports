"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { performanceMonitor, addResourceHints } from '../../utils/performance';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const { user, login, loginOffline, isOnline: authIsOnline } = useAuth();
  const router = useRouter();

  // Performance monitoring
  useEffect(() => {
    performanceMonitor.startTimer('login-page-load');
    addResourceHints();
    
    return () => {
      performanceMonitor.endTimer('login-page-load');
    };
  }, []);

  // Check online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    setError('');

    performanceMonitor.startTimer('login-attempt');

    try {
      let success = false;
      
      if (isOnline && authIsOnline) {
        success = await login(username, password);
      } else {
        success = await loginOffline(username, password);
      }

      if (!success) {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
      performanceMonitor.endTimer('login-attempt');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-kmuGreen to-kmuOrange p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <img
            src="/kmu_logo.svg"
            alt="KMU Logo"
            width={80}
            height={80}
            className="mx-auto mb-4"
            onError={(e) => {
              console.error('Logo failed to load');
              e.currentTarget.style.display = 'none';
            }}
          />
          <h2 className="text-3xl font-bold text-white mb-2">
            KMU Discipline Desk
          </h2>
          <p className="text-white/80 text-sm">
            Student Discipline Management System
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-kmuGreen focus:border-transparent"
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-kmuGreen focus:border-transparent"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Connection Status */}
            <div className="flex items-center justify-between text-sm">
              <span className={`flex items-center ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {!isOnline && (
                <span className="text-orange-600 text-xs">
                  Offline mode available
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-kmuGreen text-white py-2 px-4 rounded-md hover:bg-kmuGreen/90 focus:outline-none focus:ring-2 focus:ring-kmuGreen focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Demo Credentials:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Admin:</strong> admin / admin123</div>
              <div><strong>Security:</strong> security / admin123</div>
              <div><strong>Academic:</strong> academic / admin123</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-white/60 text-xs">
          <p>© 2024 KMU Discipline Desk. All rights reserved.</p>
          <p className="mt-1">Optimized for performance and offline use</p>
        </div>
      </div>
    </div>
  );
}