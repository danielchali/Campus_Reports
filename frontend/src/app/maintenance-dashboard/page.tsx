"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileStack,
  Shield,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../../components/PageSkeleton';
import { API_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';

ChartJS.register(ArcElement, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip);

type StudentReport = {
  id?: string;
  trackingCode?: string;
  title?: string;
  category?: 'disciplinary_case' | 'maintenance_issue';
  anonymous?: boolean;
  status?: 'Submitted' | 'Under Review' | 'In Progress' | 'Resolved';
  location?: string;
  submittedAt?: string;
  incidentDate?: string;
};

type AnonymousReport = {
  _id?: string;
  tracking_code?: string;
  title?: string;
  category?: string;
  status?: string;
  location?: string;
  createdAt?: string;
  incident_date?: string;
};

type MaintenanceRequestItem = {
  key: string;
  title: string;
  source: 'Student Named' | 'Student Anonymous' | 'Anonymous Portal';
  status: 'Pending' | 'In Progress' | 'Completed';
  location: string;
  date: string;
};

const statusToneClasses: Record<MaintenanceRequestItem['status'], string> = {
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

function normalizeStatus(status?: string): MaintenanceRequestItem['status'] {
  if (status === 'Resolved') return 'Completed';
  if (status === 'In Progress' || status === 'Under Review') return 'In Progress';
  return 'Pending';
}

function formatDateLabel(value?: string) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MaintenanceDashboard() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [anonymousReports, setAnonymousReports] = useState<AnonymousReport[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  useEffect(() => {
    if (!token) return;

    let active = true;

    async function fetchCollection(path: string) {
      const res = await fetch(`${API_BASE_URL}${path}`, { headers: { ...authHeaders() } });
      if (!res.ok) throw new Error(`${path} failed with ${res.status}`);
      return res.json();
    }

    async function load() {
      setLoading(true);
      setError(null);

      const [studentResult, anonymousResult, staffResult] = await Promise.allSettled([
        fetchCollection('/student-reports'),
        fetchCollection('/anonymous-reports'),
        fetchCollection('/staff'),
      ]);

      if (!active) return;

      setStudentReports(studentResult.status === 'fulfilled' && Array.isArray(studentResult.value) ? studentResult.value : []);
      setAnonymousReports(anonymousResult.status === 'fulfilled' && Array.isArray(anonymousResult.value) ? anonymousResult.value : []);
      setStaff(staffResult.status === 'fulfilled' ? (Array.isArray(staffResult.value) ? staffResult.value : staffResult.value?.staff || []) : []);

      setLoading(false);
    }

    load().catch((loadError) => {
      if (!active) return;
      console.error('Failed to load maintenance dashboard data', loadError);
      setError('Maintenance dashboard data could not be loaded from the backend.');
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [token]);

  const maintenanceRequests = useMemo<MaintenanceRequestItem[]>(() => {
    const studentItems = studentReports
      .filter((item) => item.category === 'maintenance_issue')
      .map((item): MaintenanceRequestItem => {
        const source: MaintenanceRequestItem['source'] = item.anonymous ? 'Student Anonymous' : 'Student Named';
        return {
          key: item.id || item.trackingCode || `${item.title || 'student-maintenance'}-${item.submittedAt || item.incidentDate || ''}`,
          title: item.title || 'Untitled maintenance request',
          source,
          status: normalizeStatus(item.status),
          location: item.location || 'No location',
          date: item.submittedAt || item.incidentDate || '',
        };
      });

    const anonymousItems = anonymousReports
      .filter((item) => item.category === 'maintenance_issue')
      .map((item) => ({
        key: item._id || item.tracking_code || `${item.title || 'anonymous-maintenance'}-${item.createdAt || item.incident_date || ''}`,
        title: item.title || 'Untitled maintenance request',
        source: 'Anonymous Portal' as const,
        status: normalizeStatus(item.status),
        location: item.location || 'No location',
        date: item.createdAt || item.incident_date || '',
      }));

    return [...studentItems, ...anonymousItems]
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [anonymousReports, studentReports]);

  const summary = useMemo(() => {
    const total = maintenanceRequests.length;
    const completed = maintenanceRequests.filter((item) => item.status === 'Completed').length;
    const inProgress = maintenanceRequests.filter((item) => item.status === 'In Progress').length;
    const pending = maintenanceRequests.filter((item) => item.status === 'Pending').length;
    const anonymous = maintenanceRequests.filter((item) => item.source === 'Anonymous Portal' || item.source === 'Student Anonymous').length;

    return { total, completed, inProgress, pending, anonymous, staffLoaded: staff.length };
  }, [maintenanceRequests, staff.length]);

  const trendData = useMemo(() => {
    const labels: string[] = [];
    const totalCounts: number[] = [];
    const completedCounts: number[] = [];
    const inProgressCounts: number[] = [];
    const pendingCounts: number[] = [];
    const today = new Date();

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      const dayItems = maintenanceRequests.filter((item) => new Date(item.date).toDateString() === date.toDateString());
      totalCounts.push(dayItems.length);
      completedCounts.push(dayItems.filter((item) => item.status === 'Completed').length);
      inProgressCounts.push(dayItems.filter((item) => item.status === 'In Progress').length);
      pendingCounts.push(dayItems.filter((item) => item.status === 'Pending').length);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Total',
          data: totalCounts,
          borderColor: '#7f1d1d',
          backgroundColor: 'rgba(127, 29, 29, 0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#7f1d1d',
          pointBorderWidth: 0,
        },
        {
          label: 'Completed',
          data: completedCounts,
          borderColor: '#15803d',
          backgroundColor: 'rgba(21, 128, 61, 0.08)',
          fill: false,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#15803d',
          pointBorderWidth: 0,
        },
        {
          label: 'In Progress',
          data: inProgressCounts,
          borderColor: '#ea580c',
          backgroundColor: 'rgba(234, 88, 12, 0.08)',
          fill: false,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#ea580c',
          pointBorderWidth: 0,
        },
        {
          label: 'Pending',
          data: pendingCounts,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124, 58, 237, 0.08)',
          fill: false,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#7c3aed',
          pointBorderWidth: 0,
        },
      ],
    };
  }, [maintenanceRequests]);

  const breakdown = useMemo(() => {
    const sourceCounts = [
      { label: 'Student Named', value: maintenanceRequests.filter((item) => item.source === 'Student Named').length, color: '#7f1d1d' },
      { label: 'Student Anonymous', value: maintenanceRequests.filter((item) => item.source === 'Student Anonymous').length, color: '#15803d' },
      { label: 'Anonymous Portal', value: maintenanceRequests.filter((item) => item.source === 'Anonymous Portal').length, color: '#ea580c' },
      { label: 'Completed', value: maintenanceRequests.filter((item) => item.status === 'Completed').length, color: '#7c3aed' },
    ].filter((item) => item.value > 0);

    return {
      labels: sourceCounts.map((item) => item.label),
      datasets: [{ data: sourceCounts.map((item) => item.value), backgroundColor: sourceCounts.map((item) => item.color), borderWidth: 0, cutout: '68%' }],
    };
  }, [maintenanceRequests]);

  if (!authLoading && !token) {
    router.replace('/login');
  }
  if (!token) {
    return <PageSkeleton />;
  }
  if (!authLoading && user && user.role !== 'maintenance') {
    return <div className="text-red-600">Access denied.</div>;
  }
  if (authLoading || loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 xl:space-y-5">
      <section className="max-w-4xl rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-kmuGreen">Dashboard</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white md:text-[1.75rem]">Maintenance Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Track only maintenance requests, follow work progress, and keep the operations team focused on campus facility issues.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Total Requests', value: summary.total, helper: 'All maintenance items', icon: FileStack, tone: 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300' },
          { label: 'Completed', value: summary.completed, helper: 'Resolved maintenance work', icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300' },
          { label: 'In Progress', value: summary.inProgress, helper: 'Active maintenance work', icon: Clock3, tone: 'text-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-300' },
          { label: 'Pending', value: summary.pending, helper: 'Awaiting assignment or work', icon: Shield, tone: 'text-violet-700 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-300' },
          { label: 'Anonymous', value: summary.anonymous, helper: 'Hidden-source maintenance requests', icon: Users, tone: 'text-sky-700 bg-sky-50 dark:bg-sky-900/20 dark:text-sky-300' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
                <Icon size={18} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className="mt-1.5 text-2xl font-semibold text-slate-900 dark:text-white">{card.value}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.helper}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Requests Overview</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Last seven days of maintenance request activity.</p>
          </div>
          <div className="h-[250px] xl:h-[230px]">
            <Line
              data={trendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top',
                    labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 } },
                  },
                },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.15)' } },
                },
              }}
            />
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Requests Breakdown</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Named, anonymous, and completed maintenance flow.</p>
          </div>
          <div className="relative mx-auto h-[190px] max-w-[210px]">
            <Doughnut data={breakdown} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-slate-900 dark:text-white">{summary.total}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Requests</span>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {breakdown.labels.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No maintenance request data available.</p>
            ) : (
              breakdown.labels.map((label, index) => (
                <div key={label} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: breakdown.datasets[0].backgroundColor[index] as string }} />
                    <span className="truncate text-slate-600 dark:text-slate-300">{label}</span>
                  </div>
                  <span className="font-medium text-slate-900 dark:text-white">{breakdown.datasets[0].data[index]}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(280px,0.95fr)]">
        <article className="rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Maintenance Requests</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Latest maintenance-only requests from the reporting system.</p>
            </div>
            <Link href="/reports" className="text-xs font-medium text-kmuGreen hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {maintenanceRequests.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-500 dark:text-slate-400">No maintenance requests are available.</div>
            ) : (
              maintenanceRequests.slice(0, 8).map((item) => (
                <Link
                  key={item.key}
                  href="/reports"
                  className="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.source} • {item.location}</p>
                    <p className="mt-2 truncate text-sm text-slate-600 dark:text-slate-300">Maintenance Request</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span className="rounded-full bg-kmuGreen/10 px-2.5 py-1 text-[11px] font-semibold text-kmuGreen dark:bg-kmuGreen/20 dark:text-emerald-300">Maintenance</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusToneClasses[item.status]}`}>{item.status}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateLabel(item.date)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
            <div className="mt-3 grid gap-2">
              {[
                { href: '/reports', label: 'Open Maintenance Reports' },
                { href: '/anonymous-report', label: 'Review Anonymous Requests' },
                { href: '/staff', label: 'Open Staff Directory' },
                { href: '/help', label: 'Help & Guidance' },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:border-kmuGreen/30 hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <span>{action.label}</span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Maintenance Snapshot</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Completed</p>
                <p className="mt-1.5 text-xl font-semibold text-slate-900 dark:text-white">{summary.completed}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Pending</p>
                <p className="mt-1.5 text-xl font-semibold text-slate-900 dark:text-white">{summary.pending}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Anonymous Requests</p>
                <p className="mt-1.5 text-xl font-semibold text-slate-900 dark:text-white">{summary.anonymous}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Staff Loaded</p>
                <p className="mt-1.5 text-xl font-semibold text-slate-900 dark:text-white">{summary.staffLoaded}</p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
