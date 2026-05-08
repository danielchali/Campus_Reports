"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, FileText, User } from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '../config/constants';
import { useAuth } from '../context/AuthContext';

export default function GlobalSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ students: any[], cases: any[], reports: any[] }>({ students: [], cases: [], reports: [] });
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
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
          const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const data = await res.json();
            setResults(data);
            setIsOpen(true);
          }
        } catch (err) {
          console.error("Search failed", err);
        }
      } else {
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const hasResults = results.students.length > 0 || results.cases.length > 0 || results.reports.length > 0;
  const canViewStudents = ['admin', 'security_officer', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary'].includes(user?.role || '');
  const canViewCases = ['admin', 'security_officer', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary'].includes(user?.role || '');
  const canViewReports = ['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'maintenance'].includes(user?.role || '');

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
            <div className="p-4 text-center text-sm text-slate-500">No results found for "{query}"</div>
          ) : (
            <div className="flex flex-col gap-4">
              {canViewStudents && results.students.length > 0 && (
                <div>
                  <h3 className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-500">Students</h3>
                  {results.students.map((s) => (
                    <Link key={s._id} href={`/students/${s.studentId}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <User size={16} className="text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.fullName}</p>
                        <p className="text-xs text-slate-500">{s.studentId} • {s.program}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {canViewCases && results.cases.length > 0 && (
                <div>
                  <h3 className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-500">Cases</h3>
                  {results.cases.map((c) => (
                    <Link key={c._id} href={`/cases/${c._id}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <FileText size={16} className="text-kmuOrange" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{c.offense_type}</p>
                        <p className="text-xs text-slate-500 truncate">{c.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {canViewReports && results.reports.length > 0 && (
                <div>
                  <h3 className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-500">Anonymous Reports</h3>
                  {results.reports.map((r) => (
                    <Link key={r._id} href={`/reports`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <FileText size={16} className="text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{r.title}</p>
                        <p className="text-xs text-slate-500">{r.tracking_code}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
