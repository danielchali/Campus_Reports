"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Search, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { API_URL } from "../config/constants";
import { useAuth } from "../context/AuthContext";

type SearchResult = {
  _id: string;
  [key: string]: string | undefined;
};

type SearchResults = {
  students: SearchResult[];
  cases: SearchResult[];
  reports: SearchResult[];
};

type SearchSection = {
  key: keyof SearchResults;
  title: string;
  icon: LucideIcon;
  iconClassName: string;
  href: (item: SearchResult) => string;
  primaryText: (item: SearchResult) => string;
  secondaryText: (item: SearchResult) => string;
};

const EMPTY_RESULTS: SearchResults = { students: [], cases: [], reports: [] };

export default function GlobalSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length >= 2) {
        try {
          const res = await fetch(
            `${API_URL}/search?q=${encodeURIComponent(query)}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          );
          if (res.ok) {
            const data = await res.json();
            setResults({
              students: data.students || [],
              cases: data.cases || [],
              reports: data.reports || [],
            });
            setIsOpen(true);
          }
        } catch (err) {
          console.error("Search failed", err);
        }
      } else {
        setResults(EMPTY_RESULTS);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const hasResults =
    results.students.length > 0 ||
    results.cases.length > 0 ||
    results.reports.length > 0;
  const canViewStudents = [
    "admin",
    "security_officer",
    "chief_security_officer",
    "dean_of_students",
    "assistant_dean",
    "secretary",
    "registrar",
  ].includes(user?.role || "");
  const canViewCases = [
    "admin",
    "security_officer",
    "chief_security_officer",
    "dean_of_students",
    "assistant_dean",
    "secretary",
    "registrar",
  ].includes(user?.role || "");
  const canViewReports = [
    "admin",
    "chief_security_officer",
    "dean_of_students",
    "assistant_dean",
    "secretary",
    "registrar",
    "maintenance",
  ].includes(user?.role || "");

  const visibleSections = useMemo<SearchSection[]>(() => {
    const sections: SearchSection[] = [];

    if (canViewStudents && results.students.length > 0) {
      sections.push({
        key: "students",
        title: "Students",
        icon: User,
        iconClassName: "text-blue-500",
        href: (student) => `/students/${student.studentId || student._id}`,
        primaryText: (student) => student.fullName || "Unnamed student",
        secondaryText: (student) =>
          [student.studentId, student.program].filter(Boolean).join(" • "),
      });
    }

    if (canViewCases && results.cases.length > 0) {
      sections.push({
        key: "cases",
        title: "Cases",
        icon: FileText,
        iconClassName: "text-kmuOrange",
        href: (caseItem) => `/cases/${caseItem._id}`,
        primaryText: (caseItem) => caseItem.offense_type || "Case report",
        secondaryText: (caseItem) => caseItem.description || "",
      });
    }

    if (canViewReports && results.reports.length > 0) {
      sections.push({
        key: "reports",
        title: "Anonymous Reports",
        icon: FileText,
        iconClassName: "text-purple-500",
        href: () => "/reports",
        primaryText: (report) => report.title || "Anonymous report",
        secondaryText: (report) => report.tracking_code || "",
      });
    }

    return sections;
  }, [
    canViewCases,
    canViewReports,
    canViewStudents,
    results.cases,
    results.reports,
    results.students,
  ]);

  return (
    <div ref={wrapperRef} className="relative hidden md:block min-w-[260px]">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900 focus-within:ring-2 focus-within:ring-kmuGreen transition-shadow">
        <Search size={16} className="text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
          placeholder="Search cases, students, reports..."
        />
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[400px] max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2">
          {!hasResults && query.length >= 2 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {visibleSections.map((section) => {
                const Icon = section.icon;

                return (
                  <div key={section.key}>
                    <h3 className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-500">
                      {section.title}
                    </h3>
                    {results[section.key].map((item) => (
                      <Link
                        key={item._id}
                        href={section.href(item)}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Icon size={16} className={section.iconClassName} />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {section.primaryText(item)}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {section.secondaryText(item)}
                          </p>
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
