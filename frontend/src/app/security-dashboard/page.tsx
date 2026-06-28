"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageSkeleton } from '../../components/PageSkeleton';
import { StatCard, StatsStrip } from '../../components/StatsStrip';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileStack,
  PlusCircle,
  Shield,
  UserRound,
  Users,
} from '@/components/icons';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, OFFENSE_TYPES, SEVERITY_LEVELS } from '../../config/constants';
import { authHeaders } from '../../utils/api';
import { useDashboardRealtime } from '../../hooks/useDashboardRealtime';
import DashboardAIInsights from '../../components/dashboard/DashboardAIInsights';
import { getTodayDateInputValue } from '../../utils/dateTimeDefaults';
import SmartStudentSearch from '../../components/SmartStudentSearch';
import SmartStaffSearch from '../../components/SmartStaffSearch';

interface Student {
  _id?: string;
  studentId: string;
  fullName: string;
  department?: string;
  program?: string;
  year?: string;
}

interface Staff {
  staffId: string;
  fullName: string;
  department: string;
  position?: string;
}

interface CaseRecord {
  _id?: string;
  student?: {
    fullName?: string;
    studentId?: string;
    program?: string;
    department?: string;
  } | null;
  staff?: {
    fullName?: string;
    staffId?: string;
    department?: string;
  } | null;
  offenseType?: string;
  severity?: string;
  status?: string;
  incidentDate?: string;
  createdAt?: string;
}

const toneClasses = {
  green: 'border-kmuGreen/20 bg-white dark:bg-slate-900',
  amber: 'border-amber-200 bg-white dark:border-amber-900/30 dark:bg-slate-900',
  orange: 'border-orange-200 bg-white dark:border-orange-900/30 dark:bg-slate-900',
  slate: 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
};

function formatDate(value?: string) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SecurityDashboard() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [displayedCases, setDisplayedCases] = useState<CaseRecord[]>([]);
  const [caseType, setCaseType] = useState<'student' | 'staff'>('student');
  const [studentId, setStudentId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [incidentDate, setIncidentDate] = useState(getTodayDateInputValue);
  const [offenseType, setOffenseType] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [sanctions, setSanctions] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string | null>(null);

  const handleRealtimeRefresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
    setLiveUpdatedAt(new Date().toLocaleTimeString());
  }, []);

  useDashboardRealtime(handleRealtimeRefresh, Boolean(token), ['all', 'cases', 'student-reports', 'anonymous-reports']);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  useEffect(() => {
    if (!token) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const [studentsRes, staffRes, casesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/students`, { headers: { ...authHeaders() } }),
          fetch(`${API_BASE_URL}/staff`, { headers: { ...authHeaders() } }),
          fetch(`${API_BASE_URL}/cases`, { headers: { ...authHeaders() } }),
        ]);

        if (!active) return;

        const studentsData = studentsRes.ok ? await studentsRes.json() : { students: [] };
        const staffData = staffRes.ok ? await staffRes.json() : { staff: [] };
        const casesData = casesRes.ok ? await casesRes.json() : { cases: [] };

        const loadedCases = Array.isArray(casesData) ? casesData : casesData.cases || [];
        setStudents(Array.isArray(studentsData) ? studentsData : studentsData.students || []);
        setStaff(Array.isArray(staffData) ? staffData : staffData.staff || []);
        setCases(loadedCases);
        setDisplayedCases(loadedCases);
      } catch (loadError: any) {
        if (!active) return;
        setError(loadError?.message || 'Failed to load dashboard data.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [token, refreshToken]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  if (!authLoading && !token) {
    router.replace('/login');
  }
  if (!token) {
    return <PageSkeleton />;
  }

  if (!authLoading && user && user.role !== 'security_officer') {
    return <div className="text-red-600">Access denied.</div>;
  }

  const offenseTypeDescription = OFFENSE_TYPES.find((item) => item.value === offenseType)?.description || '';

  // Fetch filtered cases from API when search changes
  useEffect(() => {
    if (!token) return;
    let active = true;

    async function fetchFiltered() {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const endpoint = `/cases${params.toString() ? `?${params.toString()}` : ''}`;
      try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers: { ...authHeaders() } });
        if (!active) return;
        const data = await res.json();
        const caseList = Array.isArray(data) ? data : data.cases || [];
        setDisplayedCases(caseList);
      } catch {
        // ignore
      }
    }

    fetchFiltered();
    return () => { active = false; };
  }, [token, search]);

  const metrics = useMemo(() => {
    const openCases = cases.filter((item) => item.status === 'Open').length;
    const highPriorityCases = cases.filter((item) => item.severity === 'High' || item.severity === 'Critical').length;
    const resolvedCases = cases.filter((item) => item.status === 'Closed').length;

    return {
      totalCases: cases.length,
      openCases,
      highPriorityCases,
      resolvedCases,
      totalStudents: students.length,
      totalStaff: staff.length,
    };
  }, [cases, staff.length, students.length]);

  async function refreshCases() {
    const res = await fetch(`${API_BASE_URL}/cases`, { headers: { ...authHeaders() } });
    if (!res.ok) return;
    const data = await res.json();
    setCases(Array.isArray(data) ? data : data.cases || []);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const requestBody: Record<string, string> = {
        incident_date: incidentDate,
        offense_type: offenseType,
        severity,
        description,
        sanctions,
      };

      if (caseType === 'student') {
        requestBody.student_id = studentId;
      } else {
        requestBody.staff_id = staffId;
      }

      const res = await fetch(`${API_BASE_URL}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setIncidentDate(getTodayDateInputValue());
      setOffenseType('');
      setSeverity('');
      setDescription('');
      setSanctions('');
      setStudentId('');
      setStaffId('');
      setSelectedStudent(null);
      setSelectedStaff(null);
      setSuccess('Case submitted successfully.');
      await refreshCases();
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to submit case.');
    } finally {
      setSubmitting(false);
    }
  }

  const summaryCards = [
    { label: 'Total Cases', value: metrics.totalCases, helper: 'Fetched from case records', icon: FileStack, tone: 'green' },
    { label: 'Open Cases', value: metrics.openCases, helper: 'Awaiting action', icon: Clock3, tone: 'amber' },
    { label: 'High Priority', value: metrics.highPriorityCases, helper: 'High or critical severity', icon: AlertTriangle, tone: 'orange' },
    { label: 'Resolved', value: metrics.resolvedCases, helper: 'Closed cases', icon: CheckCircle2, tone: 'slate' },
    { label: 'Students Loaded', value: metrics.totalStudents, helper: 'Available for case entry', icon: Users, tone: 'green' },
    { label: 'Staff Loaded', value: metrics.totalStaff, helper: 'Available for case entry', icon: Shield, tone: 'slate' },
  ];

  if (authLoading || loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="w-full space-y-4 xl:space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kmuGreen/10 text-kmuGreen">
              <Shield size={18} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Security Dashboard</h1>
              {liveUpdatedAt && (
                <p className="text-[11px] font-medium text-kmuGreen">Live update at {liveUpdatedAt}</p>
              )}
            </div>
          </div>
          <div className="flex min-w-[240px] items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950 md:max-w-xs">
            <UserRound size={16} className="text-kmuGreen" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search cases, students, staff..."
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
            />
          </div>
        </div>
      </section>

      {(error || success) && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${error ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200' : 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200'}`}>
          {error || success}
        </div>
      )}

      <DashboardAIInsights refreshToken={refreshToken} />

      <StatsStrip desktopColumnsClass="xl:grid-cols-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={<Icon size={16} />}
              iconClassName={card.tone === 'green' ? 'bg-kmuGreen/10 text-kmuGreen' : card.tone === 'amber' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' : card.tone === 'orange' ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}
              className={toneClasses[card.tone as keyof typeof toneClasses]}
            />
          );
        })}
      </StatsStrip>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.82fr)]">
        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Create Case</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Submit a student or staff case directly to the backend.</p>
            </div>
            <PlusCircle size={18} className="text-kmuGreen" />
          </div>

          <div className="mb-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => {
                setCaseType('student');
                setStaffId('');
                setSelectedStaff(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${caseType === 'student' ? 'bg-kmuGreen text-white' : 'text-slate-600 dark:text-slate-300'}`}
            >
              Student Case
            </button>
            <button
              type="button"
              onClick={() => {
                setCaseType('staff');
                setStudentId('');
                setSelectedStudent(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${caseType === 'staff' ? 'bg-kmuGreen text-white' : 'text-slate-600 dark:text-slate-300'}`}
            >
              Staff Case
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              {caseType === 'student' ? (
                <SmartStudentSearch
                  onStudentSelect={(student) => {
                    setSelectedStudent(student);
                    setStudentId(student.studentId);
                  }}
                  placeholder="Search for student by name or ID..."
                  className="w-full"
                />
              ) : (
                <SmartStaffSearch
                  onStaffSelect={(member) => {
                    setSelectedStaff(member);
                    setStaffId(member.staffId);
                  }}
                  placeholder="Search for staff by name or ID..."
                  className="w-full"
                />
              )}

              {selectedStudent && (
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  {selectedStudent.fullName} ({selectedStudent.studentId}) • {selectedStudent.program || selectedStudent.department || 'N/A'}
                </div>
              )}

              {selectedStaff && (
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  {selectedStaff.fullName} ({selectedStaff.staffId}) • {selectedStaff.department}
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="date"
                value={incidentDate}
                onChange={(event) => setIncidentDate(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                required
              />
              <select
                value={offenseType}
                onChange={(event) => setOffenseType(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                required
              >
                <option value="">Select offense type</option>
                {OFFENSE_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                required
              >
                <option value="">Select severity</option>
                {SEVERITY_LEVELS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={offenseTypeDescription || 'Case description'}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              required
            />

            <input
              type="text"
              value={sanctions}
              onChange={(event) => setSanctions(event.target.value)}
              placeholder="Sanctions (optional)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Cases are submitted directly to the existing `/cases` backend endpoint.
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-kmuGreen px-4 py-2.5 text-sm font-medium text-white transition hover:bg-kmuGreen-dark disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit Case'}
              </button>
            </div>
          </form>
        </article>

        <div className="space-y-4">
          <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
            <div className="mt-3 grid gap-2">
              <Link href="/cases" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                Open full case list
              </Link>
              <Link href="/students" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                Browse students
              </Link>
              <Link href="/evidence" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                Review evidence
              </Link>
            </div>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Current Load</h2>
            <div className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                <span className="text-slate-500 dark:text-slate-400">Filtered cases</span>
                <span className="font-semibold text-slate-900 dark:text-white">{displayedCases.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                <span className="text-slate-500 dark:text-slate-400">Students ready</span>
                <span className="font-semibold text-slate-900 dark:text-white">{students.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                <span className="text-slate-500 dark:text-slate-400">Staff ready</span>
                <span className="font-semibold text-slate-900 dark:text-white">{staff.length}</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Cases</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Live results from the existing backend case feed.</p>
          </div>
          <Link href="/cases" className="text-xs font-medium text-kmuGreen hover:underline">
            View all
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {displayedCases.slice(0, 10).map((item) => {
            const name = item.student?.fullName || item.staff?.fullName || 'Unknown';
            const meta = item.student?.studentId || item.staff?.staffId || 'No ID';
            const unit = item.student?.program || item.student?.department || item.staff?.department || 'N/A';

            return (
              <button
                key={item._id}
                type="button"
                onClick={() => item._id && router.push(`/cases/${item._id}`)}
                className="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{name}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {meta} • {unit}
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.offenseType || 'No offense type'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {item.severity || 'No severity'}
                  </span>
                  <span className="rounded-full bg-kmuGreen/10 px-2.5 py-1 text-[11px] font-semibold text-kmuGreen dark:bg-kmuGreen/20 dark:text-emerald-300">
                    {item.status || 'No status'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(item.incidentDate || item.createdAt)}</span>
                </div>
              </button>
            );
          })}

          {displayedCases.length === 0 && (
            <div className="px-4 py-8 text-sm text-slate-500 dark:text-slate-400">No cases match the current search.</div>
          )}
        </div>
      </section>
    </div>
  );
}
