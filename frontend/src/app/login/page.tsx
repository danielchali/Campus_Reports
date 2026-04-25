"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Users, 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  AlertCircle,
  HelpCircle,
  MessageCircle,
  Globe,
  ChevronDown,
  ArrowRight,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { performanceMonitor, addResourceHints } from '../../utils/performance';

// Typing Animation Component
const Typewriter = ({ texts, speed = 100, wait = 2000 }: { texts: string[], speed?: number, wait?: number }) => {
  const [displayText, setDisplayText] = useState('');
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (subIndex === texts[index].length + 1 && !isDeleting) {
      setTimeout(() => setIsDeleting(true), wait);
      return;
    }

    if (subIndex === 0 && isDeleting) {
      setIsDeleting(false);
      setIndex((prev) => (prev + 1) % texts.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (isDeleting ? -1 : 1));
    }, isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timeout);
  }, [subIndex, index, isDeleting, texts, speed, wait]);

  useEffect(() => {
    setDisplayText(texts[index].substring(0, subIndex));
  }, [subIndex, index, texts]);

  return (
    <span className="inline-block min-h-[1.2em]">
      {displayText}
      <span className="ml-1 inline-block w-0.5 h-[1em] bg-kmuGreen animate-pulse align-middle" />
    </span>
  );
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  
  const { user, login, loginOffline, isOnline: authIsOnline } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Performance monitoring
  useEffect(() => {
    performanceMonitor.startTimer('login-page-load');
    addResourceHints();
    return () => { performanceMonitor.endTimer('login-page-load'); };
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
      const currentPath = window.location.pathname;
      const validPaths = ['/admin', '/academic-dashboard', '/security-dashboard', '/student-dashboard', '/my-reports', '/make-report', '/dashboard', '/cases', '/students', '/reports', '/evidence', '/audit', '/profile', '/help'];
      if (validPaths.some(path => currentPath.startsWith(path))) return;

      const role = user.role;
      const routes: Record<string, string> = {
        admin: '/admin',
        chief_security_officer: '/chief-security-officer-dashboard',
        dean_of_students: '/dean-of-students-dashboard',
        assistant_dean: '/assistant-dean-dashboard',
        secretary: '/secretary-dashboard',
        security_officer: '/security-dashboard',
        student: '/student-dashboard'
      };
      router.push(routes[role] || '/dashboard');
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
      if (!success) setError('Invalid credentials. Please try again.');
    } catch (err) {
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
      performanceMonitor.endTimer('login-attempt');
    }
  };

  const typingTexts = [
    "Report issues.",
    "Request maintenance.",
    "Improve campus life.",
    "Stay safe."
  ];

  const features = [
    { icon: ShieldCheck, title: "Secure & Confidential", desc: "Your data is protected and kept confidential." },
    { icon: User, title: "For Students & Staff", desc: "A platform for everyone to make a difference." },
    { icon: Zap, title: "Quick Response", desc: "We ensure timely action on every report." },
    { icon: BarChart3, title: "Track Progress", desc: "Stay updated on the status of your reports." }
  ];

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-[#f8fafc] text-slate-900'} font-sans selection:bg-kmuGreen/30`}>
      {/* Header / Top Bar */}
      <header className="w-full px-6 py-4 flex justify-end items-center gap-6 z-10">
        <div className="flex items-center gap-2 cursor-pointer group">
          <span className="text-sm font-medium text-slate-500 group-hover:text-kmuGreen transition-colors">Dark Mode</span>
          <button 
            onClick={toggleTheme}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${theme === 'dark' ? 'bg-kmuGreen' : 'bg-slate-300'}`}
          >
            <motion.div 
              layout
              className="w-4 h-4 bg-white rounded-full shadow-sm"
              animate={{ x: theme === 'dark' ? 24 : 0 }}
            />
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-kmuGreen transition-colors">
          <Globe className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium">English</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center px-6 lg:px-20 gap-12 lg:gap-24 relative overflow-hidden pb-12">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 dark:opacity-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-kmuGreen/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-kmuOrange/20 blur-[100px] rounded-full" />
        </div>

        {/* Left Side: Branding & Info */}
        <div className="w-full lg:w-1/2 flex flex-col items-start z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <img src="/kmu_logo.svg" alt="KMU Logo" className="h-20 md:h-24 object-contain mb-4" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">Khyber Medical University</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold text-[#002d62] dark:text-white mb-6 tracking-tight">
              Campus Reports
            </h1>
            <div className="h-1.5 w-24 bg-kmuGreen rounded-full mb-8" />
            
            <div className="text-xl md:text-2xl font-medium text-slate-600 dark:text-slate-400 mb-12">
              <Typewriter texts={typingTexts} />
            </div>
          </motion.div>

          {/* Floating Action Circles */}
          <div className="hidden md:flex relative w-full h-48 items-center justify-center mb-12">
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-[10%] flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-lg border border-emerald-200 dark:border-emerald-800">
                <Users className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 text-center">Anonymous<br/>Reporting</span>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute left-[45%] top-0 flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shadow-lg border border-blue-200 dark:border-blue-800">
                <AlertCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 text-center">Report An<br/>Issue</span>
            </motion.div>

            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute left-[75%] bottom-4 flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shadow-lg border border-orange-200 dark:border-orange-800">
                <Zap className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 text-center">Maintenance<br/>Request</span>
            </motion.div>

            {/* Connecting Dashed Lines */}
            <svg className="absolute w-full h-full pointer-events-none opacity-30" viewBox="0 0 400 200">
              <path d="M100,100 Q200,20 250,60" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6,6" className="text-slate-400" />
              <path d="M250,60 Q300,100 350,140" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6,6" className="text-slate-400" />
            </svg>
          </div>

          {/* Feature Bar */}
          <div className="hidden lg:grid grid-cols-4 gap-4 w-full bg-white dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {features.map((f, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <f.icon className="w-5 h-5 text-kmuGreen" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{f.title}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Login Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-[480px] z-10"
        >
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl shadow-slate-200 dark:shadow-black/40 border border-slate-100 dark:border-slate-800 p-8 md:p-10">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Welcome Back!</h2>
              <p className="text-slate-500 dark:text-slate-400">Login to your Campus Reports account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {signupSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center gap-3"
                >
                  <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                  Account created successfully! Please log in.
                </motion.div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-xl text-sm flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-kmuGreen transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Email address or Student ID"
                  className="block w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-kmuGreen/20 focus:border-kmuGreen transition-all"
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-kmuGreen transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  className="block w-full pl-11 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-kmuGreen/20 focus:border-kmuGreen transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-700 rounded-md peer-checked:bg-kmuGreen peer-checked:border-kmuGreen transition-all" />
                    <svg className="absolute w-3.5 h-3.5 text-white scale-0 peer-checked:scale-100 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">Remember me</span>
                </label>
                <Link href="#" className="text-sm font-semibold text-kmuGreen hover:underline">Forgot Password?</Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Log In <ArrowRight className="w-5 h-5" /></>
                )}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-900 px-4 text-slate-400 font-medium">or report without login</span></div>
              </div>

              <Link href="/make-report" className="w-full flex items-center justify-center gap-3 py-4 border-2 border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400 rounded-2xl font-bold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group">
                <Fingerprint className="w-6 h-6 group-hover:scale-110 transition-transform" />
                Report Anonymously
              </Link>

              <div className="text-center pt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  New to Campus Reports? <Link href="/signup" className="text-kmuGreen font-bold hover:underline">Learn more</Link>
                </p>
              </div>
            </form>
          </div>
        </motion.div>
      </main>

      {/* Footer / Bottom Bar */}
      <footer className="w-full bg-[#002d62] text-white py-4 px-6 md:px-20 flex flex-wrap justify-center md:justify-between items-center gap-6 z-10">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Secure Platform</span>
        </div>
        <div className="hidden md:block w-px h-4 bg-white/20" />
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Your Voice Matters</span>
        </div>
        <div className="hidden md:block w-px h-4 bg-white/20" />
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Better Campus, Together</span>
        </div>
      </footer>

      {/* Help Bubble */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 text-sm font-medium flex flex-col"
          >
            <span className="text-slate-400 text-xs">Need help?</span>
            <span className="text-slate-800 dark:text-white">We're here!</span>
            <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-white dark:bg-slate-800 rotate-45 border-r border-b border-slate-100 dark:border-slate-700" />
          </motion.div>
        </AnimatePresence>
        <button className="w-14 h-14 rounded-full bg-[#2563eb] text-white flex items-center justify-center shadow-lg shadow-blue-300 dark:shadow-none hover:scale-110 transition-transform active:scale-95">
          <MessageCircle className="w-7 h-7" />
          <div className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
        </button>
      </div>
    </div>
  );
}


