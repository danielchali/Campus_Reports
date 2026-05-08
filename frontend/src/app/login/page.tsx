"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { performanceMonitor, addResourceHints } from '../../utils/performance';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Users,
  Zap,
  TrendingUp,
  Megaphone,
  Wrench,
  Ghost,
  Moon,
  Sun,
  Globe,
  Heart,
  ChevronDown
} from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [hasLoginHistory, setHasLoginHistory] = useState(false);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [typedFeatureText, setTypedFeatureText] = useState('');
  const [isDeletingFeatureText, setIsDeletingFeatureText] = useState(false);

  const { user, login, loginOffline, isOnline: authIsOnline } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  const featureTexts = [
    'Report issues. Request maintenance. Improve campus life.',
    'Track student and staff discipline cases in one place.',
    'Create KMU four-step case records with draft support.',
    'Keep evidence, reports, and audit logs organized and secure.',
  ];

  useEffect(() => {
    // Check if user has logged in before for conditional "Welcome Back"
    const history = localStorage.getItem('hasLoginHistory');
    if (history === 'true') {
      setHasLoginHistory(true);
    }
  }, []);

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

  // Typing animation
  useEffect(() => {
    const currentFeature = featureTexts[featureIndex];
    if (!currentFeature) return;

    const typingDelay = isDeletingFeatureText ? 35 : 65;
    const pauseDelay = 1500;

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
      const currentPath = window.location.pathname;
      const validPaths = [
        '/admin', '/academic-dashboard', '/security-dashboard', 
        '/student-dashboard', '/my-reports', '/make-report', 
        '/dashboard', '/cases', '/students', '/reports',
        '/general-dashboard',
        '/maintenance-dashboard',
        '/evidence', '/audit', '/profile', '/help'
      ];

      if (validPaths.some(path => currentPath.startsWith(path))) {
        return;
      }

      const role = user.role;
      if (role === 'admin') router.push('/admin');
      else if (role === 'chief_security_officer') router.push('/chief-security-officer-dashboard');
      else if (role === 'dean_of_students') router.push('/dean-of-students-dashboard');
      else if (role === 'assistant_dean') router.push('/assistant-dean-dashboard');
      else if (role === 'registrar' || role === 'secretary') router.push('/registrar-dashboard');
      else if (role === 'maintenance') router.push('/maintenance-dashboard');
      else if (role === 'security_officer') router.push('/security-dashboard');
      else if (role === 'student') router.push('/student-dashboard');
      else if (role === 'general_user') router.push('/general-dashboard');
      else router.push('/dashboard');
    }
  }, [user, router]);

  const signupSuccess = searchParams.get('registered') === '1';

  const isDevelopment = process.env.NODE_ENV === 'development';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    performanceMonitor.startTimer('login-attempt');

    try {
      let success = false;
      if (isDevelopment || (isOnline && authIsOnline)) {
        success = await login(username, password);
      } else {
        success = await loginOffline(username, password);
      }

      if (success) {
        localStorage.setItem('hasLoginHistory', 'true');
      } else {
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
    <div className={`h-screen relative overflow-hidden flex flex-col md:flex-row ${theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-800'}`}>

      {/* Left Column - Desktop & Tablet (hidden on small mobile) */}
      <div className="hidden sm:flex md:relative md:w-[55%] lg:w-[60%] flex-col justify-between p-8 lg:p-12 h-full overflow-hidden">
        {/* Content sits above the background */}
        <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <img
              src="/kmu_logo.svg"
              alt="KMU Logo"
              width={140}
              height={140}
              className="h-24 w-24 object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-2 text-slate-900 dark:text-white">
            Campus Reports
          </h1>
          
          <div className="h-12 md:h-16 mb-4 md:mb-8">
            <p className="text-lg md:text-xl font-medium text-slate-600 dark:text-slate-300">
              <span className="inline-block">
                {typedFeatureText}
                <span className="ml-0.5 inline-block h-5 w-[2px] animate-pulse bg-current align-middle" />
              </span>
            </p>
          </div>

          {/* Node Diagram representing system flow */}
          <div className="hidden md:flex flex-wrap items-center gap-4 md:gap-6 lg:gap-8 mt-6 mb-8 relative">
            <svg className="absolute inset-0 w-full h-full -z-10 text-slate-200 dark:text-slate-800 opacity-80" preserveAspectRatio="none">
              <path d="M 60,40 C 120,40 120,80 180,80" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6,6" />
              <path d="M 220,80 C 280,80 280,20 340,20" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6,6" />
            </svg>
            
            <div className="flex flex-col items-center z-10">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 shadow-sm border border-slate-200 dark:border-slate-700">
                <Ghost className="w-8 h-8" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center max-w-[80px]">Anonymous Reporting</span>
            </div>

            <div className="flex flex-col items-center mt-12 z-10">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 shadow-sm border border-slate-200 dark:border-slate-700">
                <Megaphone className="w-8 h-8" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center max-w-[80px]">Report an Issue</span>
            </div>

            <div className="flex flex-col items-center -mt-8 z-10">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-2 shadow-sm border border-slate-200 dark:border-slate-700">
                <Wrench className="w-8 h-8" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center max-w-[80px]">Maintenance Request</span>
            </div>
          </div>
        </div>

        {/* Bottom Feature Bar */}
        <div className="mt-4 relative z-10">
          <div className="hidden md:grid grid-cols-4 gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-kmuGreen flex-shrink-0" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Secure</h4>
                <p className="text-[8px] text-slate-500 dark:text-slate-400 leading-tight">Data is protected.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Inclusive</h4>
                <p className="text-[8px] text-slate-500 dark:text-slate-400 leading-tight">For all students.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Fast</h4>
                <p className="text-[8px] text-slate-500 dark:text-slate-400 leading-tight">Timely action.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-500 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Track Progress</h4>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Stay updated on the status of your reports.</p>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center justify-center gap-6 mt-4 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Secure Platform</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Your Voice Matters</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> Better Campus, Together</span>
          </div>
        </div>{/* end feature bar */}
        </div>{/* end z-10 content wrapper */}
      </div>{/* end left column */}

      {/* Right Column - Login Area */}
      <div className="relative z-20 w-full sm:w-[45%] md:w-[45%] lg:w-[40%] flex flex-col h-full">
        {/* Top Controls */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-3 z-30">
          {/* Dark Mode Slider Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700/50 text-slate-300' : 'bg-white/40 border-slate-200/50 text-slate-600'}`}
          >
            {/* Icon */}
            {theme === 'dark'
              ? <Moon className="w-3 h-3 text-indigo-400" />
              : <Sun className="w-3 h-3 text-amber-500" />
            }
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
            {/* Slider knob */}
            <div
              className={`relative inline-flex items-center w-7 h-4 rounded-full transition-colors duration-200 ${theme === 'dark' ? 'bg-indigo-500' : 'bg-slate-300'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${theme === 'dark' ? 'translate-x-3' : 'translate-x-0'}`}
              />
            </div>
          </button>
        </div>

        {/* Login Card Container */}
        <div className="flex-1 flex flex-col justify-center px-4 py-4 sm:py-8 md:px-12 relative h-full overflow-y-auto">
          <div className={`w-full max-w-md mx-auto rounded-3xl shadow-2xl p-6 sm:p-7 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-black/40' : 'bg-white border-white shadow-slate-200/60'}`}>
            
            <div className="text-center mb-4 sm:mb-6">
              {/* Mobile Logo */}
              <div className="flex justify-center mb-4 sm:hidden">
                <img
                  src="/kmu_logo.svg"
                  alt="KMU Logo"
                  width={60}
                  height={60}
                  className="h-16 w-16 object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">
                {hasLoginHistory ? 'Welcome Back!' : 'Welcome!'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Login to your Campus Reports account
              </p>
            </div>

            {signupSuccess && (
              <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                Student account created successfully. Sign in with your Student ID and password.
              </div>
            )}

            {error && (
              <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {/* Username Field */}
              <div>
                <div className={`relative flex items-center rounded-xl border transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 focus-within:border-kmuGreen' : 'bg-slate-50 border-slate-200 focus-within:border-kmuGreen focus-within:bg-white'}`}>
                  <div className="pl-4 pr-3 text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full py-3.5 pr-4 bg-transparent focus:outline-none text-sm placeholder:text-slate-400"
                    placeholder="Email address or Student ID"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className={`relative flex items-center rounded-xl border transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 focus-within:border-kmuGreen' : 'bg-slate-50 border-slate-200 focus-within:border-kmuGreen focus-within:bg-white'}`}>
                  <div className="pl-4 pr-3 text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full py-3.5 pr-12 bg-transparent focus:outline-none text-sm placeholder:text-slate-400"
                    placeholder="Password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Form Options */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 group-hover:border-kmuGreen transition-colors">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="hidden peer-checked:block w-2.5 h-2.5 bg-kmuGreen rounded-sm"></div>
                  </div>
                  <span className="text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-kmuGreen hover:underline font-medium">
                  Forgot Password?
                </Link>
              </div>

              {/* Connection Status Indicator */}
              <div className="flex items-center justify-end text-[10px] md:text-xs">
                <span className={`flex items-center ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                  {isOnline ? 'Online' : 'Offline Mode Available'}
                </span>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-kmuGreen hover:bg-kmuGreen-dark text-white py-3 sm:py-3.5 px-4 rounded-xl font-bold shadow-lg shadow-kmuGreen/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  'Log In'
                )}
              </button>
            </form>

            <div className="mt-6 relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink-0 mx-4 text-[10px] text-slate-400">or report without login</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            <div className="mt-4">
              <Link 
                href="/anonymous-report"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Ghost className="w-4 h-4 text-purple-500" />
                <span className="text-purple-600 dark:text-purple-400">Report Anonymously</span>
              </Link>
            </div>

            <div className="mt-6 text-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">New to the system? </span>
              <Link href="/signup" className="text-kmuGreen font-semibold hover:underline">
                Register
              </Link>
            </div>
          </div>
        </div>

        {/* Floating AI Chatbot */}
      </div>
    </div>
  );
}
