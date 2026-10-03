"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  Loader2,
  MapPin,
  ShieldCheck,
  Wrench,
} from "@/components/icons";
import { API_BASE_URL } from "../../config/constants";
import { authHeaders } from "../../utils/api";
import { canAccessPage } from "../../utils/access";
import { useAuth } from "../../context/AuthContext";
import { PageSkeleton } from "../../components/PageSkeleton";
import { StatCard, StatsStrip } from "../../components/StatsStrip";

type CountItem = { label: string; count: number };
type PerformanceMetric = { average: number | null; p75: number | null };
type PerformanceSummary = {
  windowMinutes: number;
  samples: number;
  latestAt: string | null;
  navigationDuration: PerformanceMetric;
  domContentLoaded: PerformanceMetric;
  firstContentfulPaint: PerformanceMetric;
  largestContentfulPaint: PerformanceMetric;
  cumulativeLayoutShift: PerformanceMetric;
  topRoutes: { path: string; count: number }[];
};
type WorkOrderSummary = {
  total: number;
  receivedLast30Days: number;
  active: number;
  open: number;
  inProgress: number;
  completed: number;
  urgent: number;
  statusCounts: CountItem[];
  priorityCounts: CountItem[];
  issueTypes: CountItem[];
  latestReceivedAt: string | null;
};
type AnalyticsScope = {
  kind: "campus" | "hostel" | "maintenance";
  label: string;
  description: string;
};
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
  scope?: AnalyticsScope;
  workOrders: WorkOrderSummary | null;
  system: {
    totalUsers: number;
    usersByRole: CountItem[];
    activeReportStatuses: CountItem[];
  } | null;
  performance: PerformanceSummary | null;
};

type Accent = "emerald" | "orange" | "blue" | "violet";

const accentClasses: Record<Accent, { bar: string; badge: string }> = {
  emerald: { bar: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  orange: { bar: "bg-orange-500", badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  blue: { bar: "bg-blue-500", badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  violet: { bar: "bg-violet-500", badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
};

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMilliseconds(value: number | null) {
  return value === null ? "—" : `${Math.round(value)} ms`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "No records yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No records yet" : date.toLocaleString();
}

function getCount(items: CountItem[], ...labels: string[]) {
  return items.filter((item) => labels.includes(item.label)).reduce((total, item) => total + item.count, 0);
}

function Breakdown({ eyebrow, title, description, items, accent = "emerald" }: {
  eyebrow: string;
  title: string;
  description: string;
  items: CountItem[];
  accent?: Accent;
}) {
  const visibleItems = items.filter((item) => item.count > 0);
  const max = Math.max(...visibleItems.map((item) => item.count), 1);
  const classes = accentClasses[accent];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${classes.badge}`}>
          {visibleItems.reduce((total, item) => total + item.count, 0)} items
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      {visibleItems.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-slate-50 px-3 py-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">No matching records yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {visibleItems.slice(0, 6).map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-700 dark:text-slate-300">{humanize(item.label)}</span>
                <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{item.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-full rounded-full ${classes.bar}`} style={{ width: `${Math.max((item.count / max) * 100, 6)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildOperationalSignals(summary: AnalyticsSummary, scope: AnalyticsScope) {
  const workOrders = summary.workOrders;
  const topMaintenanceIssue = summary.maintenanceIssues.find((item) => item.count > 0);
  const topWorkOrderIssue = workOrders?.issueTypes.find((item) => item.count > 0);
  const pending = getCount(summary.statusCounts, "Submitted", "Under Review");

  if (scope.kind === "maintenance" && workOrders) {
    return [
      { title: `${workOrders.active} work order${workOrders.active === 1 ? "" : "s"} need active handling`, detail: workOrders.active ? `${workOrders.open} remain unassigned and ${workOrders.inProgress} are already in progress.` : "The active work-order queue is clear." },
      { title: topWorkOrderIssue ? `${humanize(topWorkOrderIssue.label)} is the leading work type` : "No leading work type yet", detail: topWorkOrderIssue ? `AI-assisted issue classification grouped ${topWorkOrderIssue.count} received work order${topWorkOrderIssue.count === 1 ? "" : "s"} in this pattern.` : "New work orders will appear here as they are received." },
      { title: workOrders.urgent ? `${workOrders.urgent} urgent safety item${workOrders.urgent === 1 ? "" : "s"} need review` : "No urgent safety work orders are flagged", detail: "Use the work-order queue to update ownership and completion status as work progresses." },
    ];
  }

  if (scope.kind === "hostel") {
    return [
      { title: `${pending} report${pending === 1 ? "" : "s"} need review in ${scope.label}`, detail: "The dashboard only includes reports whose recorded location matches the assigned hostel." },
      { title: topMaintenanceIssue ? `${humanize(topMaintenanceIssue.label)} is the leading hostel issue` : "No repeated hostel issue is visible yet", detail: topMaintenanceIssue ? `AI-assisted classification grouped ${topMaintenanceIssue.count} maintenance report${topMaintenanceIssue.count === 1 ? "" : "s"} into this pattern.` : "Patterns will appear as reports are submitted for this hostel." },
      { title: workOrders?.active ? `${workOrders.active} hostel work order${workOrders.active === 1 ? "" : "s"} remain active` : "No active hostel work orders", detail: "Review the inbox for reports and the work-order queue for maintenance follow-through." },
    ];
  }

  const topReportType = summary.reportTypes.find((item) => item.count > 0);
  return [
    { title: topReportType ? `${humanize(topReportType.label)} is the highest-volume report area` : "No report trend is available yet", detail: "AI-assisted classification groups incoming reports into recurring operational patterns." },
    { title: `${pending} report${pending === 1 ? "" : "s"} are awaiting review`, detail: "Prioritise newly submitted reports before they become a larger backlog." },
    { title: `${summary.totals.reportsLast30Days} report${summary.totals.reportsLast30Days === 1 ? "" : "s"} arrived in the last 30 days`, detail: "Use the issue distributions to decide where operational follow-up is most needed." },
  ];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/summary`, { headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load analytics.");
      setSummary(payload as AnalyticsSummary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!user || !canAccessPage(user.role, "analytics")) return;
    void loadSummary(true);
    const interval = window.setInterval(() => void loadSummary(false), 30000);
    return () => window.clearInterval(interval);
  }, [authLoading, loadSummary, router, token, user]);

  const scope = useMemo<AnalyticsScope>(() => summary?.scope || ({ kind: "campus", label: "Campus operations", description: "Reports and cases available to your role." }), [summary]);
  const signals = useMemo(() => summary ? buildOperationalSignals(summary, scope) : [], [scope, summary]);
  const isMaintenanceView = scope.kind === "maintenance";
  const isHostelView = scope.kind === "hostel";
  const pendingReview = summary ? getCount(summary.statusCounts, "Submitted", "Under Review") : 0;
  const primaryAction = isMaintenanceView
    ? { href: "/work-orders", label: "Open work-order queue", description: "Assign ownership, update progress, and close completed work." }
    : { href: "/inbox", label: "Review incoming reports", description: "Open the inbox to triage the latest submitted items." };

  if (authLoading || (!summary && loading)) return <PageSkeleton />;
  if (!token) return <PageSkeleton />;
  if (!user || !canAccessPage(user.role, "analytics")) return <div className="p-6 text-red-600">Access denied.</div>;
  if (error && !summary) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>;
  if (!summary) return null;

  const workOrders = summary.workOrders;
  const title = isMaintenanceView ? "Maintenance analytics" : isHostelView ? "Hostel operations analytics" : "Operational analytics";
  const subtitle = isMaintenanceView
    ? "A work-order view of the maintenance workload, current queue, and recurring repair patterns."
    : isHostelView
      ? "A location-scoped view of reports and maintenance work for the assigned hostel."
      : "A role-aware view of report trends, operating backlog, and recurring patterns.";

  return (
    <main className="w-full space-y-5 xl:space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 px-5 py-6 text-white shadow-xl shadow-slate-950/15 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                {isHostelView ? <MapPin size={13} /> : isMaintenanceView ? <Wrench size={13} /> : <LayoutDashboard size={13} />}
                {scope.label}
              </span>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Live operations</span>
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">{subtitle}</p>
            <p className="mt-3 text-xs text-slate-400">{scope.description}</p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <p className="text-xs text-slate-400">Updated {formatDateTime(summary.generatedAt)}</p>
            <button type="button" onClick={() => void loadSummary(true)} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70">
              <Loader2 size={14} className={loading ? "animate-spin" : ""} /> Refresh data
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">Showing the latest available analytics. {error}</div>}

      <StatsStrip desktopColumnsClass="xl:grid-cols-4">
        {isMaintenanceView && workOrders ? <>
          <StatCard label="Work orders received" value={workOrders.total} icon={<Wrench size={16} />} iconClassName="bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-300" />
          <StatCard label="Active workload" value={workOrders.active} icon={<Clock3 size={16} />} iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300" />
          <StatCard label="Awaiting assignment" value={workOrders.open} icon={<FileText size={16} />} iconClassName="bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300" />
          <StatCard label="Urgent safety work" value={workOrders.urgent} icon={<ShieldCheck size={16} />} iconClassName="bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300" />
        </> : isHostelView ? <>
          <StatCard label="Hostel reports" value={summary.totals.reports} icon={<FileText size={16} />} iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300" />
          <StatCard label="Awaiting review" value={pendingReview} icon={<Clock3 size={16} />} iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300" />
          <StatCard label="Maintenance reports" value={summary.totals.maintenanceReports} icon={<Wrench size={16} />} iconClassName="bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-300" />
          <StatCard label="Active work orders" value={workOrders?.active || 0} icon={<CheckCircle2 size={16} />} iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300" />
        </> : <>
          <StatCard label="Visible reports" value={summary.totals.reports} icon={<FileText size={16} />} iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300" />
          <StatCard label="Maintenance reports" value={summary.totals.maintenanceReports} icon={<Wrench size={16} />} iconClassName="bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-300" />
          <StatCard label="Disciplinary reports" value={summary.totals.disciplinaryReports} icon={<ShieldCheck size={16} />} iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300" />
          <StatCard label="Last 30 days" value={summary.totals.reportsLast30Days} icon={<Clock3 size={16} />} iconClassName="bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300" />
        </>}
      </StatsStrip>

      {isMaintenanceView && workOrders ? (
        <section className="grid gap-4 xl:grid-cols-3">
          <Breakdown eyebrow="Queue health" title="Work-order status" description="Current workload from received work orders." items={workOrders.statusCounts} accent="blue" />
          <Breakdown eyebrow="Safety and planning" title="Priority mix" description="Urgency assigned when work orders are opened." items={workOrders.priorityCounts} accent="orange" />
          <Breakdown eyebrow="AI-assisted classification" title="Recurring work types" description="Issue categories inferred from the work-order details." items={workOrders.issueTypes} accent="emerald" />
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          <Breakdown eyebrow="Report mix" title="Most common report types" description="The balance of maintenance and disciplinary reports in this scope." items={summary.reportTypes} accent="blue" />
          <Breakdown eyebrow="AI-assisted classification" title="Maintenance issue patterns" description="Recurring maintenance needs grouped from report descriptions and analysis keywords." items={summary.maintenanceIssues} accent="orange" />
          <Breakdown eyebrow="Safety and conduct" title="Disciplinary patterns" description="Recurring disciplinary and security issue categories in this scope." items={summary.disciplinaryIssues} accent="emerald" />
          <Breakdown eyebrow="Workflow" title="Report status" description="Where reports currently sit in the review and resolution process." items={summary.statusCounts} accent="violet" />
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)]">
        <div className="rounded-3xl border border-indigo-200 bg-indigo-50/70 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/25">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><Bot size={18} /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI-assisted operational focus</h2><span className="rounded-full bg-indigo-600/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Scoped insight</span></div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Signals are grounded in the records visible to your role, with issue patterns grouped from report and work-order content.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {signals.map((signal) => <div key={signal.title} className="rounded-2xl border border-indigo-100 bg-white/80 p-3 dark:border-indigo-900/50 dark:bg-slate-950/50"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{signal.title}</h3><p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{signal.detail}</p></div>)}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Next action</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{primaryAction.label}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{primaryAction.description}</p>
          <Link href={primaryAction.href} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-kmuGreen px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600">Open workspace <ArrowRight size={14} /></Link>
          {workOrders && <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Latest work order received: {formatDateTime(workOrders.latestReceivedAt)}</p>}
        </div>
      </section>

      {!isMaintenanceView && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Operational snapshot</p><h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">What needs attention now</h2></div><span className="text-xs text-slate-500 dark:text-slate-400">{pendingReview} awaiting review</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[{ label: "Submitted", value: getCount(summary.statusCounts, "Submitted"), tone: "bg-amber-50 dark:bg-amber-950/25" }, { label: "Under review", value: getCount(summary.statusCounts, "Under Review"), tone: "bg-blue-50 dark:bg-blue-950/25" }, { label: "In progress", value: getCount(summary.statusCounts, "In Progress"), tone: "bg-violet-50 dark:bg-violet-950/25" }, { label: "Resolved", value: getCount(summary.statusCounts, "Resolved"), tone: "bg-emerald-50 dark:bg-emerald-950/25" }].map((item) => <div key={item.label} className={`rounded-2xl p-3 ${item.tone}`}><p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{item.value}</p></div>)}
        </div>
      </div>}

      {summary.system && <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/25"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-kmuGreen" /><h2 className="font-semibold text-slate-900 dark:text-white">System reach</h2></div><p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">{summary.system.totalUsers}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Registered users across the platform.</p></div>
        <Breakdown eyebrow="Administration" title="Users by role" description="Role distribution across active accounts." items={summary.system.usersByRole} accent="emerald" />
        <Breakdown eyebrow="Administration" title="Status distribution" description="Report states across the visible system-wide dataset." items={summary.system.activeReportStatuses} accent="blue" />
      </section>}

      {summary.performance && <div className="rounded-3xl border border-sky-200 bg-sky-50/60 p-5 dark:border-sky-900 dark:bg-sky-950/25">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Administrator telemetry</p><h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Browser performance</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Rolling {summary.performance.windowMinutes}-minute sample with {summary.performance.samples} measurements.</p></div><p className="text-xs text-slate-500 dark:text-slate-400">Latest sample: {formatDateTime(summary.performance.latestAt)}</p></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[{ label: "Navigation", metric: summary.performance.navigationDuration }, { label: "DOM ready", metric: summary.performance.domContentLoaded }, { label: "First paint", metric: summary.performance.firstContentfulPaint }, { label: "Largest paint", metric: summary.performance.largestContentfulPaint }, { label: "Layout shift", metric: summary.performance.cumulativeLayoutShift, shift: true }].map(({ label, metric, shift }) => <div key={label} className="rounded-2xl bg-white/80 p-3 dark:bg-slate-950/60"><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{shift ? (metric.average === null ? "—" : metric.average.toFixed(3)) : formatMilliseconds(metric.average)}</p><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">p75: {shift ? (metric.p75 === null ? "—" : metric.p75.toFixed(3)) : formatMilliseconds(metric.p75)}</p></div>)}
        </div>
      </div>}
    </main>
  );
}
