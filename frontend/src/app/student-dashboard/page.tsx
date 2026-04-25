"use client";

import Link from 'next/link';
import { 
  AlertCircle, 
  ArrowRight, 
  ClipboardList, 
  FilePenLine, 
  ShieldCheck, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  FileText, 
  PlusCircle, 
  BookOpen, 
  Bell, 
  Search, 
  ChevronRight,
  User,
  MoreVertical,
  Fingerprint,
  Info
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { getStudentReportMetrics, type StudentReport } from '../../utils/studentReports';
import { API_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';

const categoryLabels = {
  disciplinary_case: 'Disciplinary Case',
  maintenance_issue: 'Maintenance Issue',
} as const;

const statusColors = {
  'Submitted': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Under Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'In Progress': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Resolved': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export default function StudentDashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [statementRequests, setStatementRequests] = useState<any[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);

  // Auth guard and redirects
  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  const metrics = useMemo(() => {
    if (!user) {
      return { total: 0, anonymous: 0, open: 0, resolved: 0, recent: [] as StudentReport[] };
    }
    return getStudentReportMetrics({
      id: user.id,
      username: user.username,
      name: user.name,
    });
  }, [user]);

  useEffect(() => {
    const fetchStatementRequests = async () => {
      setStatementLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/statement-requests/student`, {
          headers: { ...authHeaders() }
        });
        if (res.ok) {
          const data = await res.json();
          setStatementRequests(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to load statement requests', error);
      } finally {
        setStatementLoading(false);
      }
    };

    if (token && user?.role === 'student') {
      fetchStatementRequests();
    }
  }, [token, user?.role]);

  if (authLoading || !user) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
        </div>
        <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-4 md:p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Welcome back, {user.name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Thank you for helping make our campus better.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-kmuGreen transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
          </button>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name || user.username}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user.role.replace('_', ' ')}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-kmuGreen/10 text-kmuGreen flex items-center justify-center font-bold">
              {user.name?.charAt(0) || user.username.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Reports</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.total}</span>
              <span className="text-[10px] text-slate-400 font-medium">Total submitted</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resolved</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.resolved}</span>
              <span className="text-[10px] text-slate-400 font-medium">Resolved</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Progress</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.open - metrics.resolved}</span>
              <span className="text-[10px] text-slate-400 font-medium">Being reviewed</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Open</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.open}</span>
              <span className="text-[10px] text-slate-400 font-medium">Awaiting action</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
            <Wrench size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Maintenance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.recent.filter(r => r.category === 'maintenance_issue').length}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Total requests</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Reports Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Recent Reports</h2>
              <Link href="/my-reports" className="text-sm font-bold text-kmuGreen hover:underline flex items-center gap-1">
                View All <ChevronRight size={16} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Submitted On</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {metrics.recent.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-3">
                          <AlertCircle size={40} className="text-slate-200" />
                          <p>No reports found. Start by making a new report.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    metrics.recent.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-6 py-4 text-xs font-medium text-slate-400">
                          #{report.trackingCode.split('-').pop()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{report.title}</span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Info size={12} /> {report.location}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${report.category === 'disciplinary_case' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                              {report.category === 'disciplinary_case' ? <ShieldCheck size={14} /> : <Wrench size={14} />}
                            </div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                              {categoryLabels[report.category]}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[report.status] || 'bg-slate-100 text-slate-600'}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(report.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-1 text-slate-400 hover:text-kmuGreen transition-colors">
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500">
                Can't find your report? <Link href="/help" className="text-kmuGreen font-bold hover:underline">Contact Support →</Link>
              </p>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-8">How It Works</h2>
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative">
              <div className="flex flex-col items-center text-center gap-4 flex-1 z-10">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center shadow-sm">
                  <FilePenLine size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Submit</h3>
                  <p className="text-xs text-slate-500 mt-1">Report an issue or request maintenance.</p>
                </div>
              </div>

              <div className="hidden md:block absolute top-8 left-[25%] right-[25%] h-px bg-dashed border-t-2 border-dashed border-slate-200 dark:border-slate-800" />

              <div className="flex flex-col items-center text-center gap-4 flex-1 z-10">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shadow-sm">
                  <Clock size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Review</h3>
                  <p className="text-xs text-slate-500 mt-1">Our team reviews and processes it.</p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center gap-4 flex-1 z-10">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Resolve</h3>
                  <p className="text-xs text-slate-500 mt-1">We take action and keep you updated.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Area */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/make-report" className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100 transition-all text-center">
                <PlusCircle size={24} />
                <span className="text-[10px] font-bold uppercase tracking-wider">New Report</span>
              </Link>
              <Link href="/make-report?anonymous=true" className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 transition-all text-center">
                <Fingerprint size={24} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Anonymous</span>
              </Link>
              <Link href="/make-report?category=maintenance_issue" className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 transition-all text-center">
                <Wrench size={24} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Maintenance</span>
              </Link>
              <Link href="/help" className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-all text-center">
                <BookOpen size={24} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Knowledge</span>
              </Link>
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Announcements</h2>
              <Link href="/help" className="text-xs font-bold text-slate-400 hover:text-kmuGreen transition-colors uppercase tracking-wider">View All</Link>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cafeteria Renovation Notice</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Cafeteria will remain closed from May 26 to May 30 for renovation.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase">May 23, 2025</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Info size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Library Timings Update</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Central Library will be open 24/7 during final exams.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase">May 21, 2025</p>
                </div>
              </div>
            </div>
          </div>

          {/* Help Card */}
          <div className="bg-gradient-to-br from-kmuGreen to-emerald-700 rounded-2xl p-6 text-white shadow-lg shadow-kmuGreen/20">
            <h2 className="text-lg font-bold mb-2">Need Help?</h2>
            <p className="text-sm text-emerald-50 mb-6 leading-relaxed">
              Check our knowledge base or contact support if your issue isn't resolved.
            </p>
            <button className="w-full py-3 bg-white text-kmuGreen font-bold rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
              <MessageCircle size={18} />
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper for the button in Help Card
function MessageCircle({ size }: { size: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}
