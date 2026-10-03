"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "@/components/icons";
import {
  Briefcase,
  ClipboardList,
  FileText,
  History,
  Paperclip,
  Search,
  Shield,
  User,
  UserCog,
  X,
} from "@/components/icons";
import Link from "next/link";
import { API_URL } from "../config/constants";
import { useAuth } from "../context/AuthContext";
import { getNavLinksForRole, type NavLink } from "../utils/navigation";

type StudentResult = {
  _id: string;
  studentId: string;
  fullName?: string;
  program?: string;
  year?: string;
  status?: string;
};

type StaffResult = {
  _id: string;
  staffId: string;
  fullName?: string;
  department?: string;
  position?: string;
};

type CaseResult = {
  _id: string;
  case_id?: string;
  offense_type?: string;
  description?: string;
  status?: string;
  severity?: string;
  student_id?: string;
  staff_id?: string;
};

type ReportResult = {
  _id: string;
  tracking_code?: string;
  title?: string;
  description?: string;
  category?: string;
  status?: string;
  location?: string;
  owner_name?: string;
};

type EvidenceResult = {
  _id: string;
  caseId?: string;
  filename?: string;
  uploadedBy?: string;
};

type AuditLogResult = {
  _id: string;
  action?: string;
  entity?: string;
  entityId?: string;
  user?: string;
};

type UserResult = {
  _id: string;
  username?: string;
  name?: string;
  role?: string;
};

type PageResult = NavLink & {
  _id: string;
};

type SearchResults = {
  students: StudentResult[];
  staff: StaffResult[];
  cases: CaseResult[];
  reports: ReportResult[];
  anonymousReports: ReportResult[];
  evidence: EvidenceResult[];
  auditLogs: AuditLogResult[];
  users: UserResult[];
};

type SearchResultItem =
  | StudentResult
  | StaffResult
  | CaseResult
  | ReportResult
  | EvidenceResult
  | AuditLogResult
  | UserResult
  | PageResult;

type ResultSection = {
  key: keyof SearchResults | "pages";
  title: string;
  icon: LucideIcon;
  iconClassName: string;
  items: SearchResultItem[];
  getHref: (item: SearchResultItem) => string;
  getTitle: (item: SearchResultItem) => string;
  getMeta: (item: SearchResultItem) => string;
};

const EMPTY_RESULTS: SearchResults = {
  students: [],
  staff: [],
  cases: [],
  reports: [],
  anonymousReports: [],
  evidence: [],
  auditLogs: [],
  users: [],
};

function roleLabel(role?: string) {
  return role ? role.replaceAll("_", " ") : "";
}

function compact(parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" • ");
}

export default function GlobalSearch() {
  const { user, token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    const delayDebounceFn = setTimeout(async () => {
      if (!user || !token || trimmedQuery.length < 2) {
        setResults(EMPTY_RESULTS);
        setIsOpen(false);
        setIsSearching(false);
        setError("");
        return;
      }

      setIsOpen(true);
      setIsSearching(true);
      setError("");

      try {
        const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(trimmedQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Search request failed");
        }

        const data = (await res.json()) as Partial<SearchResults>;
        setResults({ ...EMPTY_RESULTS, ...data });
        setIsOpen(true);
      } catch (err) {
        console.error("Search failed", err);
        setResults(EMPTY_RESULTS);
        setError("Search is unavailable right now.");
        setIsOpen(true);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, token, user]);

  if (!user) {
    return null;
  }

  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const pageResults: PageResult[] =
    trimmedQuery.length >= 2
      ? getNavLinksForRole(user.role)
          .filter((link) => link.label !== "Logout")
          .filter((link, index, links) => links.findIndex((item) => item.path === link.path) === index)
          .filter((link) => `${link.label} ${link.path}`.toLowerCase().includes(normalizedQuery))
          .map((link) => ({ ...link, _id: `page-${link.path}` }))
      : [];

  const sections: ResultSection[] = [
    {
      key: "pages",
      title: "Pages",
      icon: Search,
      iconClassName: "text-kmuGreen",
      items: pageResults,
      getHref: (item) => (item as PageResult).path,
      getTitle: (item) => (item as PageResult).label,
      getMeta: (item) => `Open ${(item as PageResult).path}`,
    },
    {
      key: "students",
      title: "Students",
      icon: User,
      iconClassName: "text-blue-500",
      items: results.students,
      getHref: (item) => `/students/${encodeURIComponent((item as StudentResult).studentId)}`,
      getTitle: (item) => (item as StudentResult).fullName || (item as StudentResult).studentId,
      getMeta: (item) => {
        const student = item as StudentResult;
        return compact([student.studentId, student.program, student.year && `Year ${student.year}`, student.status]);
      },
    },
    {
      key: "staff",
      title: "Staff",
      icon: Briefcase,
      iconClassName: "text-cyan-500",
      items: results.staff,
      getHref: (item) => `/staff/${encodeURIComponent((item as StaffResult).staffId)}`,
      getTitle: (item) => (item as StaffResult).fullName || (item as StaffResult).staffId,
      getMeta: (item) => {
        const staff = item as StaffResult;
        return compact([staff.staffId, staff.department, staff.position]);
      },
    },
    {
      key: "cases",
      title: "Cases",
      icon: FileText,
      iconClassName: "text-kmuOrange",
      items: results.cases,
      getHref: (item) => `/cases/${item._id}`,
      getTitle: (item) => {
        const caseItem = item as CaseResult;
        return caseItem.offense_type || caseItem.case_id || "Case record";
      },
      getMeta: (item) => {
        const caseItem = item as CaseResult;
        return compact([caseItem.case_id, caseItem.status, caseItem.severity, caseItem.student_id || caseItem.staff_id]);
      },
    },
    {
      key: "reports",
      title: user.role === "student" || user.role === "general_user" ? "My Reports" : "Inbox",
      icon: ClipboardList,
      iconClassName: "text-emerald-500",
      items: results.reports,
      getHref: () => (user.role === "student" || user.role === "general_user" ? "/my-reports" : "/inbox"),
      getTitle: (item) => {
        const report = item as ReportResult;
        return report.title || report.tracking_code || "Report";
      },
      getMeta: (item) => {
        const report = item as ReportResult;
        return compact([report.tracking_code, report.category, report.status, report.location, report.owner_name]);
      },
    },
    {
      key: "anonymousReports",
      title: "Anonymous Reports",
      icon: Shield,
      iconClassName: "text-purple-500",
      items: results.anonymousReports,
      getHref: (item) => {
        const report = item as ReportResult;
        return report.tracking_code
          ? `/anonymous-report?track=${encodeURIComponent(report.tracking_code)}`
          : "/anonymous-report";
      },
      getTitle: (item) => {
        const report = item as ReportResult;
        return report.title || report.tracking_code || "Anonymous report";
      },
      getMeta: (item) => {
        const report = item as ReportResult;
        return compact([report.tracking_code, report.category, report.status, report.location]);
      },
    },
    {
      key: "evidence",
      title: "Evidence",
      icon: Paperclip,
      iconClassName: "text-amber-500",
      items: results.evidence,
      getHref: () => "/evidence",
      getTitle: (item) => (item as EvidenceResult).filename || "Evidence file",
      getMeta: (item) => {
        const evidence = item as EvidenceResult;
        return compact([evidence.caseId && `Case ${evidence.caseId}`, evidence.uploadedBy && `Uploaded by ${evidence.uploadedBy}`]);
      },
    },
    {
      key: "auditLogs",
      title: "Audit Logs",
      icon: History,
      iconClassName: "text-slate-500",
      items: results.auditLogs,
      getHref: () => "/audit",
      getTitle: (item) => (item as AuditLogResult).action || "Audit event",
      getMeta: (item) => {
        const log = item as AuditLogResult;
        return compact([log.entity, log.entityId, log.user]);
      },
    },
    {
      key: "users",
      title: "Users",
      icon: UserCog,
      iconClassName: "text-indigo-500",
      items: results.users,
      getHref: () => "/admin/users",
      getTitle: (item) => {
        const account = item as UserResult;
        return account.name || account.username || "User account";
      },
      getMeta: (item) => {
        const account = item as UserResult;
        return compact([account.username, roleLabel(account.role)]);
      },
    },
  ];

  const hasResults = sections.some((section) => section.items.length > 0);

  function closeSearch() {
    setIsOpen(false);
    setIsExpanded(false);
    setQuery("");
  }

  return (
    <div ref={wrapperRef} className="relative hidden shrink-0 md:block">
      {isExpanded ? (
        <div className="flex h-8 w-52 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 dark:border-slate-800 dark:bg-slate-900 focus-within:ring-2 focus-within:ring-kmuGreen lg:w-72">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => trimmedQuery.length >= 2 && setIsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closeSearch();
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
            placeholder="Search records..."
            aria-label="Search accessible campus records"
          />
          <button
            type="button"
            onClick={closeSearch}
            className="rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close search"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-kmuGreen hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
          aria-label="Open search"
          aria-expanded={false}
        >
          <Search size={16} />
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-[80vh] w-[min(440px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {isSearching && !hasResults ? (
            <div className="p-4 text-center text-sm text-slate-500">Searching...</div>
          ) : error && !hasResults ? (
            <div className="p-4 text-center text-sm text-red-500">{error}</div>
          ) : !hasResults && trimmedQuery.length >= 2 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              No accessible results found for &quot;{trimmedQuery}&quot;
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {error && <div className="px-3 py-2 text-xs text-red-500">{error}</div>}
              {sections
                .filter((section) => section.items.length > 0)
                .map((section) => {
                  const Icon = section.icon;

                  return (
                    <div key={section.key}>
                      <h3 className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-500">{section.title}</h3>
                      {section.items.map((item) => (
                        <Link
                          key={`${section.key}-${item._id}`}
                          href={section.getHref(item)}
                          onClick={() => {
                            closeSearch();
                          }}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Icon size={16} className={section.iconClassName} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{section.getTitle(item)}</p>
                            <p className="truncate text-xs text-slate-500">{section.getMeta(item)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
