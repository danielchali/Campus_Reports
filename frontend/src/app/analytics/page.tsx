"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, LayoutDashboard, ShieldCheck, Wrench } from "@/components/icons";
import { API_BASE_URL } from "../../config/constants";
import { authHeaders } from "../../utils/api";
import { canAccessPage } from "../../utils/access";
import { useAuth } from "../../context/AuthContext";
import { PageSkeleton } from "../../components/PageSkeleton";
import { StatsStrip } from "../../components/StatsStrip";

type CountItem = { label: string; count: number };
type AnalyticsSummary = {
  generatedAt: string;
  reportTypes: CountItem[];
  maintenanceIssues: CountItem[];
  disciplinaryIssues: CountItem[];
  caseOffenses: CountItem[];
  statusCounts: CountItem[];
  totals: {
    reports: number;
    studentReports: number;
    anonymousReports: number;
    maintenanceReports: number;
    disciplinaryReports: number;
    cases: number;
    reportsLast30Days: number;
  };
  system: {
    totalUsers: number;
    usersByRole: CountItem[];
    activeReportStatuses: CountItem[];
  } | null;
};

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Breakdown({ title, items, accent = "emerald" }: { title: string; items: CountItem[]; accent?: "emerald" | "orange" | "blue" }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  const color = accent === "orange" ? "bg-orange-500" : accent === "blue" ? "bg-blue-500" : "bg-emerald-500";
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No data available yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="capitalize text-slate-700 dark:text-slate-300">{humanize(item.label)}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{item.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max((item.count / max) * 100, item.count ? 4 : 0)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ComponentType<{ size?: number; className?: string }>; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!user || !canAccessPage(user.role, "analytics")) return;
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/analytics/summary`, { headers: authHeaders() });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Failed to load analytics.");
        setSummary(payload);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading, router, token, user]);

  const topReportType = useMemo(() => summary?.reportTypes?.reduce((top, item) => item.count > top.count ? item : top, { label: "None", count: 0 }), [summary]);

  if (authLoading || !token) return <PageSkeleton />;
  if (!user || !canAccessPage(user.role, "analytics")) return <div className="p-6 text-red-600">Access denied.</div>;
  if (loading) return <PageSkeleton />;
  if (error) return <div className="rounded-xl bg-red-50 p-6 text-red-700">{error}</div>;
  if (!summary) return null;

  return (
    <main className="w-full space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3"><LayoutDashboard className="text-kmuGreen" size={22} /><h1 className="text-xl font-semibold text-slate-900 dark:text-white">Analytics</h1></div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Report patterns, issue classifications, and operational trends.</p>
          </div>
          <p className="text-xs text-slate-500">Updated {new Date(summary.generatedAt).toLocaleString()}</p>
        </div>
      </div>

      <StatsStrip desktopColumnsClass="lg:grid-cols-4">
        <MetricCard label="Total reports" value={summary.totals.reports} icon={FileText} tone="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Maintenance reports" value={summary.totals.maintenanceReports} icon={Wrench} tone="bg-orange-50 text-orange-600" />
        <MetricCard label="Disciplinary/security" value={summary.totals.disciplinaryReports} icon={ShieldCheck} tone="bg-blue-50 text-blue-600" />
        <MetricCard label="Reports in last 30 days" value={summary.totals.reportsLast30Days} icon={CheckCircle2} tone="bg-violet-50 text-violet-600" />
      </StatsStrip>

      <section className="grid gap-5 lg:grid-cols-2">
        <Breakdown title="Most common report types" items={summary.reportTypes} accent="blue" />
        <Breakdown title="Most common maintenance issues — AI-assisted classification" items={summary.maintenanceIssues} accent="orange" />
        <Breakdown title="Most common disciplinary/security issues" items={summary.disciplinaryIssues} accent="emerald" />
        <Breakdown title="Case offense types" items={summary.caseOffenses} accent="blue" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Operational snapshot</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-2xl font-bold text-slate-900 dark:text-white">{topReportType?.count || 0}</div><div className="text-sm text-slate-500">Top report category volume</div></div>
          <div><div className="text-2xl font-bold text-slate-900 dark:text-white">{summary.totals.cases}</div><div className="text-sm text-slate-500">Disciplinary cases</div></div>
          {summary.statusCounts.map((item) => <div key={item.label}><div className="text-2xl font-bold text-slate-900 dark:text-white">{item.count}</div><div className="text-sm text-slate-500">{item.label}</div></div>)}
        </div>
      </section>

      {summary.system && (
        <section className="rounded-2xl border border-kmuGreen/30 bg-kmuGreen/5 p-5 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3"><ShieldCheck className="text-kmuGreen" size={22} /><h2 className="text-lg font-semibold text-slate-900 dark:text-white">System analytics</h2></div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Administrator-only platform metrics.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <MetricCard label="Total users" value={summary.system.totalUsers} icon={CheckCircle2} tone="bg-white text-kmuGreen dark:bg-slate-900" />
            <Breakdown title="Users by role" items={summary.system.usersByRole} />
            <Breakdown title="Report status distribution" items={summary.system.activeReportStatuses} accent="blue" />
          </div>
        </section>
      )}
    </main>
  );
}
