"use client";

import { useState, useEffect, useMemo } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Wrench, 
  ChevronRight, 
  PlusCircle, 
  Users, 
  BarChart3, 
  Settings, 
  Layers, 
  Activity,
  Search,
  Bell,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import Notification, { useNotification } from '../../components/Notification';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { notification, showNotification, hideNotification } = useNotification();

  const [cases, setCases] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  useEffect(() => {
    async function fetchData() {
      if (!token) return;
      setLoading(true);
      try {
        const [casesRes, reportsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/cases`, { headers: { ...authHeaders() } }),
          // Assuming there's a reports endpoint or we use the cases for metrics
          fetch(`${API_BASE_URL}/cases`, { headers: { ...authHeaders() } }) 
        ]);
        
        if (casesRes.ok) {
          const casesData = await casesRes.json();
          setCases(Array.isArray(casesData) ? casesData : casesData.cases || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  // Mock data for the line chart (Reports Overview)
  const lineChartData = {
    labels: ['May 19', 'May 20', 'May 21', 'May 22', 'May 23', 'May 24', 'May 25'],
    datasets: [
      {
        label: 'Total Reports',
        data: [32, 38, 36, 42, 40, 44, 48],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Resolved',
        data: [20, 24, 22, 28, 26, 30, 34],
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        tension: 0.4,
      },
      {
        label: 'In Progress',
        data: [8, 10, 9, 11, 10, 12, 11],
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        tension: 0.4,
      }
    ],
  };

  // Mock data for the doughnut chart (Reports by Category)
  const doughnutData = {
    labels: ['Infrastructure', 'Cleanliness', 'Maintenance', 'IT / Internet', 'Safety & Security', 'Other'],
    datasets: [
      {
        data: [45, 26, 23, 15, 10, 9],
        backgroundColor: [
          '#2563eb',
          '#10b981',
          '#f59e0b',
          '#8b5cf6',
          '#f43f5e',
          '#94a3b8'
        ],
        borderWidth: 0,
        cutout: '75%',
      },
    ],
  };

  if (authLoading || loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-4 md:p-8 bg-[#f8fafc] dark:bg-slate-950 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back, Admin! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Here's what's happening on campus today.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search reports, users, etc..." 
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-kmuGreen/20 w-64"
            />
          </div>
          <button className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-kmuGreen transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
          </button>
          <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-[#002d62] text-white flex items-center justify-center font-bold">
              A
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Admin</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Super Administrator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Reports', value: '128', trend: '+18%', up: true, icon: ClipboardList, color: 'blue' },
          { label: 'Resolved Reports', value: '82', trend: '+22%', up: true, icon: CheckCircle2, color: 'emerald' },
          { label: 'In Progress', value: '34', trend: '-5%', up: false, icon: Clock, color: 'amber' },
          { label: 'Open / Unassigned', value: '28', trend: '-12%', up: false, icon: AlertCircle, color: 'indigo' },
          { label: 'Maintenance Requests', value: '42', trend: '+15%', up: true, icon: Wrench, color: 'rose' },
        ].map((m, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-${m.color}-50 dark:bg-${m.color}-900/20 text-${m.color}-600 flex items-center justify-center`}>
                <m.icon size={20} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-bold ${m.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                {m.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {m.trend} from last week
              </div>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{m.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reports Overview</h2>
            <select className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-1.5 focus:ring-0">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px]">
            <Line 
              data={lineChartData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { display: false } },
                  x: { grid: { display: false } }
                }
              }} 
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reports by Category</h2>
            <button className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-kmuGreen transition-colors">View All</button>
          </div>
          <div className="relative h-[200px] flex items-center justify-center">
            <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">128</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {doughnutData.labels.slice(0, 4).map((label, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: doughnutData.datasets[0].backgroundColor[i] }} />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{doughnutData.datasets[0].data[i]}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Reports */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Reports</h2>
            <button className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-kmuGreen transition-colors">View All</button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              { title: 'Broken street light near Hostel Block A', category: 'Infrastructure', reporter: 'Student', status: 'In Progress', time: '2h ago', color: 'blue' },
              { title: 'Water leakage in Science Block washroom', category: 'Maintenance', reporter: 'Staff', status: 'Resolved', time: '5h ago', color: 'emerald' },
              { title: 'Wi-Fi not working in Library', category: 'IT / Internet', reporter: 'Student', status: 'In Progress', time: '1d ago', color: 'purple' },
            ].map((r, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-lg bg-${r.color}-50 dark:bg-${r.color}-900/20 text-${r.color}-600 flex items-center justify-center flex-shrink-0`}>
                    <ClipboardList size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.title}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
                      {r.category} • Reported by {r.reporter}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                      r.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {r.status}
                    </span>
                    <span className="text-[10px] text-slate-400">{r.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full py-3 text-xs font-bold text-kmuGreen hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-t border-slate-100 dark:border-slate-800">
            View all reports →
          </button>
        </div>

        {/* Maintenance Requests */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Maintenance Requests</h2>
            <button className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-kmuGreen transition-colors">View All</button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              { title: 'Fan not working in Room 204', category: 'Electrical', location: 'Admin Block', status: 'New', time: '1h ago', color: 'indigo' },
              { title: 'Tap leakage in Hostel Block B', category: 'Plumbing', location: 'Hostel Block B', status: 'Assigned', time: '3h ago', color: 'amber' },
              { title: 'Door lock broken - Main Gate', category: 'Carpentry', location: 'Main Gate', status: 'In Progress', time: '6h ago', color: 'emerald' },
            ].map((r, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-lg bg-${r.color}-50 dark:bg-${r.color}-900/20 text-${r.color}-600 flex items-center justify-center flex-shrink-0`}>
                    <Wrench size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.title}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
                      {r.category} • {r.location}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                      r.status === 'New' ? 'bg-indigo-100 text-indigo-700' : 
                      r.status === 'Assigned' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {r.status}
                    </span>
                    <span className="text-[10px] text-slate-400">{r.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full py-3 text-xs font-bold text-kmuGreen hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-t border-slate-100 dark:border-slate-800">
            View all maintenance requests →
          </button>
        </div>

        {/* Sidebar Panel */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Add New Report', icon: PlusCircle, color: 'blue' },
                { label: 'Add Maintenance', icon: Wrench, color: 'emerald' },
                { label: 'Manage Users', icon: Users, color: 'indigo' },
                { label: 'Manage Categories', icon: Layers, color: 'amber' },
                { label: 'View Analytics', icon: BarChart3, color: 'indigo' },
                { label: 'System Settings', icon: Settings, color: 'slate' },
              ].map((a, i) => (
                <button key={i} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-${a.color}-50/50 dark:bg-${a.color}-900/10 border border-${a.color}-100 dark:border-${a.color}-900/20 text-${a.color}-700 dark:text-${a.color}-400 hover:bg-${a.color}-100 transition-all text-center`}>
                  <a.icon size={20} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* System Overview */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">System Overview</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">386</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Users</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">142</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                  <Layers size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departments</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">24</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Status</p>
                  <p className="text-sm font-bold text-emerald-600">Operational</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <p>© 2025 KMU Campus Reports. All rights reserved.</p>
        <p>Version 1.0.0</p>
      </div>

      {/* Notification */}
      {notification?.isVisible && (
        <Notification
          type={notification.type}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
      )}
    </div>
  );
}
