"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { performanceMonitor, addResourceHints } from '../../utils/performance';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const { user, login, loginOffline, isOnline: authIsOnline } = useAuth();
  const { theme } = useTheme();
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
      const validPaths = ['/admin', '/academic-dashboard', '/security-dashboard', '/student-dashboard', '/my-reports', '/make-report', '/dashboard', '/cases', '/students', '/reports', '/evidence', '/audit', '/profile', '/help'];

      // If we're on a valid page, don't redirect
      if (validPaths.some(path => currentPath.startsWith(path))) {
        return;
      }

      // Otherwise, redirect based on role
      const role = user.role;
      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'chief_security_officer') {
        router.push('/chief-security-officer-dashboard');
      } else if (role === 'dean_of_students') {
        router.push('/dean-of-students-dashboard');
      } else if (role === 'assistant_dean') {
        router.push('/assistant-dean-dashboard');
      } else if (role === 'secretary') {
        router.push('/secretary-dashboard');
      } else if (role === 'security_officer') {
        router.push('/security-dashboard');
      } else if (role === 'student') {
        router.push('/student-dashboard');
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
    <div className={`min-h-screen flex items-center justify-center px-3 sm:px-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="max-w-md w-full">
        {/* Login Form Card */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl p-4 md:p-8 min-h-[500px] flex flex-col justify-center`}>
          {/* Logo and Title */}
          <div className="text-center mb-6 md:mb-8">
            <img
              src="/kmu_logo.svg"
              alt="KMU Logo"
              width={80}
              height={80}
              className="mx-auto mb-3 md:mb-4 h-16 md:h-20 w-16 md:w-20 object-contain"
              onError={(e) => {
                console.error('Logo failed to load');
                e.currentTarget.style.display = 'none';
                // Show fallback text
                const fallback = document.createElement('div');
                fallback.className = 'text-2xl md:text-4xl font-bold text-kmuGreen mb-3 md:mb-4';
                fallback.textContent = 'KMU';
                e.currentTarget.parentNode?.appendChild(fallback);
              }}
              onLoad={() => console.log('Logo loaded successfully')}
            />
            <h2 className="text-xl md:text-3xl font-bold text-kmuGreen mb-2">
              Log in to KMU DisciplineDesk
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6" autoComplete="off">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className={`block text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1.5 md:mb-2`}>
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={`w-full px-3 py-2 md:py-2.5 border rounded-lg md:rounded-md text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-kmuGreen focus:border-transparent ${
                  theme === 'dark' 
                    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter your username"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className={`block text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1.5 md:mb-2`}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full px-3 py-2 md:py-2.5 border rounded-lg md:rounded-md text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-kmuGreen focus:border-transparent ${
                  theme === 'dark' 
                    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter your password"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-md text-xs md:text-sm">
                {error}
              </div>
            )}

            {/* Connection Status */}
            <div className="flex items-center justify-between text-xs md:text-sm">
              <span className={`flex items-center ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {!isOnline && (
                <span className="text-orange-600 text-[10px] md:text-xs">
                  Offline mode available
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-kmuGreen text-white py-2 md:py-2.5 px-4 rounded-lg md:rounded-md text-sm md:text-base font-medium hover:bg-kmuGreen/90 focus:outline-none focus:ring-2 focus:ring-kmuGreen focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 md:h-5 w-4 md:w-5 border-b-2 border-white mr-2"></div>
                  <span className="text-sm md:text-base">Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
