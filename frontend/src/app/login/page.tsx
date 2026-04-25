"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { performanceMonitor, addResourceHints } from '../../utils/performance';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [typedFeatureText, setTypedFeatureText] = useState('');
  const [isDeletingFeatureText, setIsDeletingFeatureText] = useState(false);
  const { user, login, loginOffline, isOnline: authIsOnline } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const featureTexts = [
    'Track student and staff discipline cases in one place.',
    'Create KMU four-step case records with draft support.',
    'Generate printable callouts and structured statements quickly.',
    'Keep evidence, reports, and audit logs organized and secure.',
  ];

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

  useEffect(() => {
    const currentFeature = featureTexts[featureIndex];

    if (!currentFeature) {
      return;
    }

    const typingDelay = isDeletingFeatureText ? 35 : 65;
    const pauseDelay = 900;

    const timer = setTimeout(() => {
      if (!isDeletingFeatureText) {
        const nextText = currentFeature.slice(0, typedFeatureText.length + 1);
        setTypedFeatureText(nextText);

        if (nextText === currentFeature) {
          setTimeout(() => {
            setIsDeletingFeatureText(true);
          }, pauseDelay);
        }
      } else {
        const nextText = currentFeature.slice(0, Math.max(typedFeatureText.length - 1, 0));
        setTypedFeatureText(nextText);

        if (nextText.length === 0) {
          setIsDeletingFeatureText(false);
          setFeatureIndex((prev) => (prev + 1) % featureTexts.length);
        }
      }
    }, typingDelay);

    return () => clearTimeout(timer);
  }, [featureIndex, featureTexts, isDeletingFeatureText, typedFeatureText]);

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

  const signupSuccess = searchParams.get('registered') === '1';

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
    <div className={`min-h-screen px-3 py-6 sm:px-4 md:px-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="mx-auto block min-h-[88vh] w-full max-w-6xl items-center gap-6 md:grid md:grid-cols-2">
        <div className="hidden rounded-2xl border border-kmuGreen/20 bg-kmuGreen/5 p-6 text-left dark:border-kmuGreen/30 dark:bg-kmuGreen/10 md:block">
          <img
            src="/kmu_logo.svg"
            alt="KMU Logo"
            width={130}
            height={130}
            className="mx-auto mb-4 h-20 w-20 object-contain md:mx-0 md:h-28 md:w-28"
            onError={(e) => {
              console.error('Logo failed to load');
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="text-3xl font-bold text-kmuGreen md:text-4xl">Campus Reports</h1>
          <p className={`mt-2 text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            KMU Discipline Management System
          </p>
          <div className="mt-4 h-8 overflow-hidden text-sm font-medium text-kmuOrange md:text-base">
            <span className="inline-block">
              {typedFeatureText}
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-current align-middle" />
            </span>
          </div>
        </div>

        <div className="w-full md:order-2">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl p-4 md:p-8 min-h-[500px] flex flex-col justify-center`}>
            <div className="text-center mb-6 md:mb-8">
              <img
                src="/kmu_logo.svg"
                alt="KMU Logo"
                width={80}
                height={80}
                className="mx-auto mb-3 h-16 w-16 object-contain md:hidden"
                onError={(e) => {
                  console.error('Logo failed to load');
                  e.currentTarget.style.display = 'none';
                }}
              />
              <h2 className="text-xl md:text-3xl font-bold text-kmuGreen mb-2">
                Log in to Campus Reports
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6" autoComplete="off">
            {signupSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-md text-xs md:text-sm">
                Student account created successfully. Sign in with your Student ID and password.
              </div>
            )}
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
            <div className="mt-5 text-center text-sm">
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>New student? </span>
              <Link href="/signup" className="font-semibold text-kmuGreen underline">
                Create your account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
