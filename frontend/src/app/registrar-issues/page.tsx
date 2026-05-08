"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ClipboardList, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { InlineSkeleton, PageSkeleton } from "../../components/PageSkeleton";
import { canAccessPage } from "../../utils/access";
import {
  getAllStudentReports,
  type StudentReport,
} from "../../utils/studentReports";

const statusOptions = [
  "all",
  "Submitted",
  "Under Review",
  "In Progress",
  "Resolved",
];
const categoryLabels = {
  disciplinary_case: "Security / Conduct Incident",
  maintenance_issue: "Maintenance Request",
} as const;

function isRegistrarIssue(report: StudentReport) {
  return (
    report.ownerRole === "general_user" &&
    (report.category === "maintenance_issue" || !report.studentInvolved)
  );
}

export default function RegistrarIssuesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    if (!authLoading && !token) router.replace("/login");
  }, [authLoading, token, router]);

  useEffect(() => {
    if (!user || !canAccessPage(user.role, "registrarIssues")) return;
    let cancelled = false;

    async function loadReports() {
      setLoading(true);
      const data = await getAllStudentReports(search);
      if (!cancelled) {
        setReports(data.filter(isRegistrarIssue));
        setLoading(false);
      }
    }

    loadReports().catch(() => {
      if (!cancelled) {
        setReports([]);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, search]);

  if (!authLoading && !token) router.replace("/login");
  if (!token || !user) return <PageSkeleton />;
  if (!canAccessPage(user.role, "registrarIssues")) {
    return <div className="text-red-600">Access denied.</div>;
  }

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || report.category === categoryFilter;
      return matchesStatus && matchesCategory;
    });
  }, [categoryFilter, reports, statusFilter]);

  const summary = useMemo(() => {
    const maintenance = reports.filter(
      (report) => report.category === "maintenance_issue",
    ).length;
    const incidents = reports.filter(
      (report) => report.category === "disciplinary_case",
    ).length;
    const open = reports.filter(
      (report) => report.status !== "Resolved",
    ).length;
    return { total: reports.length, maintenance, incidents, open };
  }, [reports]);

  return (
    <section className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-3xl bg-white dark:bg-gray-800 p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 text-kmuGreen">
              <ClipboardList size={26} />
              <h1 className="text-3xl font-bold">Registrar Issues</h1>
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Review non-student general-user maintenance requests and security
              incidents. Reports that involve learners are routed to the Dean of
              Students.
            </p>
          </div>
          <Link
            href="/reports"
            className="rounded-xl bg-kmuGreen px-4 py-3 text-sm font-semibold text-white hover:bg-kmuOrange"
          >
            Open full report inbox
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="Open" value={summary.open} />
        <SummaryCard label="Maintenance" value={summary.maintenance} />
        <SummaryCard label="Security / Conduct" value={summary.incidents} />
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_240px]">
          <label className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search registrar issues by title, reporter, tracking code, location..."
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-3 pl-11 pr-4 text-gray-900 dark:text-white"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All statuses" : status}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white"
          >
            <option value="all">All registrar issue types</option>
            <option value="maintenance_issue">Maintenance requests</option>
            <option value="disciplinary_case">
              Security / conduct incidents
            </option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow">
          <InlineSkeleton rows={5} />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center text-gray-500 dark:text-gray-400">
          <AlertTriangle className="mx-auto mb-3 text-kmuOrange" />
          No registrar issues match the current filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Issue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Reporter / Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Routing
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {report.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {categoryLabels[report.category]} •{" "}
                        {report.trackingCode}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                        {report.description}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      <p>{report.ownerName || report.ownerUsername}</p>
                      <p className="mt-1 text-gray-500 dark:text-gray-400">
                        {report.location}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                        Registrar
                      </span>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        No learner/student marked as involved.
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {report.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
