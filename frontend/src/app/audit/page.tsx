"use client";

import { useAuth } from '../../context/AuthContext';
import { FileText } from '@/components/icons';
import { useState, useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';
import { useRouter } from "next/navigation";
import { canAccessPage } from '../../utils/access';
import { PageSkeleton, InlineSkeleton } from '../../components/PageSkeleton';
import { StatsStrip } from '../../components/StatsStrip';

interface AuditLog {
  _id?: string;
  action: string;
  entity?: string;
  entityId?: string;
  user?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  date?: string;
  createdAt?: string;
}

export default function AuditPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  
  // Handle authentication like profile page - only on client side
  if (typeof window !== 'undefined') {
    if (!authLoading && !token) {
      router.replace('/login');
    }
    if (!token) {
      return <PageSkeleton />;
    }
    
    if (!user || !canAccessPage(user.role, 'audit')) return <div className="text-red-600">Access denied.</div>;
  }

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{[key: string]: number}>({});
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const limit = 20;

  const actionOptions = useMemo(() => {
    const actionSet = new Set<string>([
      ...Object.keys(stats || {}),
      ...logs.map((log) => log.action).filter(Boolean),
    ]);

    return Array.from(actionSet).sort((a, b) => a.localeCompare(b));
  }, [logs, stats]);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      setError(null);
      try {
        if (!API_BASE_URL) {
          setError('API base URL is not defined.');
          setLoading(false);
          return;
        }
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (search) params.set('search', search);
        if (actionFilter) params.set('action', actionFilter);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);

        const res = await fetch(`${API_BASE_URL}/audit?${params.toString()}`, {
          headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setStats(data.stats || {});
      } catch (err) {
        setError('Failed to load audit logs');
        setLogs([]);
        setStats({});
      }
      setLoading(false);
    }
    if (user && canAccessPage(user.role, 'audit')) fetchLogs();
  }, [token, user, API_BASE_URL, page, search, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!user || !canAccessPage(user.role, 'audit')) return;
    if (!socketRef.current) {
      const socket = io(SOCKET_BASE_URL, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.on('connect', () => {
        socket.emit('joinAdmin');
      });
      socket.on('audit:new', (log: any) => {
        setLogs((prev) => [log, ...prev]);
      });
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  const safeLogs = Array.isArray(logs) ? logs : [];
  return (
      <section className="w-full space-y-6">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kmuGreen/10 text-kmuGreen">
                <FileText size={18} />
              </div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Audit Logs</h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 md:text-right">This page shows a comprehensive record of all actions taken in the system. Use search and filters to narrow audit results.</p>
          </div>
        </div>
        
        {/* Summary Stats */}
        <StatsStrip desktopColumnsClass="md:grid-cols-3 lg:grid-cols-6">
          <div className="min-w-[5.6rem] rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:min-w-0 md:rounded-xl md:p-4">
            <div className="text-base font-bold leading-none text-kmuGreen md:text-2xl">{total}</div>
            <div className="mt-0.5 truncate text-[9px] font-semibold uppercase leading-tight text-gray-600 dark:text-gray-400 md:text-sm md:font-normal md:normal-case">Total Logs</div>
          </div>
          <div className="min-w-[5.6rem] rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:min-w-0 md:rounded-xl md:p-4">
            <div className="text-base font-bold leading-none text-blue-600 md:text-2xl">
              {stats.case_created || 0}
            </div>
            <div className="mt-0.5 truncate text-[9px] font-semibold uppercase leading-tight text-gray-600 dark:text-gray-400 md:text-sm md:font-normal md:normal-case">Cases Created</div>
          </div>
          <div className="min-w-[5.6rem] rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:min-w-0 md:rounded-xl md:p-4">
            <div className="text-base font-bold leading-none text-orange-600 md:text-2xl">
              {stats.status_change || 0}
            </div>
            <div className="mt-0.5 truncate text-[9px] font-semibold uppercase leading-tight text-gray-600 dark:text-gray-400 md:text-sm md:font-normal md:normal-case">Status Changes</div>
          </div>
          <div className="min-w-[5.6rem] rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:min-w-0 md:rounded-xl md:p-4">
            <div className="text-base font-bold leading-none text-red-600 md:text-2xl">
              {stats.case_deleted || 0}
            </div>
            <div className="mt-0.5 truncate text-[9px] font-semibold uppercase leading-tight text-gray-600 dark:text-gray-400 md:text-sm md:font-normal md:normal-case">Cases Deleted</div>
          </div>
          <div className="min-w-[5.6rem] rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:min-w-0 md:rounded-xl md:p-4">
            <div className="text-base font-bold leading-none text-purple-600 md:text-2xl">
              {stats.user_login || 0}
            </div>
            <div className="mt-0.5 truncate text-[9px] font-semibold uppercase leading-tight text-gray-600 dark:text-gray-400 md:text-sm md:font-normal md:normal-case">User Logins</div>
          </div>
          <div className="min-w-[5.6rem] rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:min-w-0 md:rounded-xl md:p-4">
            <div className="text-base font-bold leading-none text-yellow-600 md:text-2xl">
              {stats.login_failed || 0}
            </div>
            <div className="mt-0.5 truncate text-[9px] font-semibold uppercase leading-tight text-gray-600 dark:text-gray-400 md:text-sm md:font-normal md:normal-case">Failed Logins</div>
          </div>
        </StatsStrip>

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.8fr)_minmax(220px,0.9fr)_repeat(2,minmax(0,0.8fr))]">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search actions, entities, IDs, or users"
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="mt-3">
            <button
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
              onClick={() => {
                setSearch('');
                setActionFilter('');
                setDateFrom('');
                setDateTo('');
                setPage(1);
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <InlineSkeleton rows={8} />
          ) : error ? (
            <div className="text-red-600 dark:text-red-400">{error}</div>
          ) : safeLogs.length === 0 ? (
            <div className="text-gray-400 dark:text-gray-500">No audit logs available.</div>
          ) : (
            <div className="space-y-4">
                {safeLogs.map((log, i) => (
                <div key={log._id || i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        log.action === 'case_created' ? 'bg-green-100 text-green-800' :
                        log.action === 'status_change' ? 'bg-blue-100 text-blue-800' :
                        log.action === 'case_updated' ? 'bg-yellow-100 text-yellow-800' :
                        log.action === 'case_deleted' ? 'bg-red-100 text-red-800' :
                        log.action === 'user_login' ? 'bg-purple-100 text-purple-800' :
                        log.action === 'login_failed' ? 'bg-yellow-100 text-yellow-800' :
                        log.action === 'user_registered' ? 'bg-indigo-100 text-indigo-800' :
                        log.action === 'evidence_uploaded' ? 'bg-teal-100 text-teal-800' :
                        log.action === 'evidence_deleted' ? 'bg-red-100 text-red-800' :
                        log.action === 'student_created' ? 'bg-green-100 text-green-800' :
                        log.action === 'student_updated' ? 'bg-yellow-100 text-yellow-800' :
                        log.action === 'student_deleted' ? 'bg-red-100 text-red-800' :
                        log.action === 'students_imported' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.action.replace('_', ' ').toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(log.date || log.createdAt || '').toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      by <span className="font-semibold">{log.user || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Action Details</h4>
                      <div className="space-y-2">
                        <div><span className="text-gray-600 dark:text-gray-400">Entity:</span> <span className="font-medium">{log.entity || 'N/A'}</span></div>
                        <div><span className="text-gray-600 dark:text-gray-400">Entity ID:</span> <span className="font-mono text-sm">{log.entityId || 'N/A'}</span></div>
                        {log.ipAddress && (
                          <div><span className="text-gray-600 dark:text-gray-400">IP Address:</span> <span className="font-mono text-sm">{log.ipAddress}</span></div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Change Details</h4>
                      <div className="space-y-2">
                      {log.details && typeof log.details === 'object' ? (
                        log.action === 'status_change' && log.details.oldStatus && log.details.newStatus ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">{log.details.oldStatus}</span>
                              <span className="text-gray-400">→</span>
                              <span className="px-2 py-1 bg-kmuGreen text-white rounded text-xs">{log.details.newStatus}</span>
                            </div>
                          ) : log.action === 'case_created' && log.details.caseData ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">Type:</span> {log.details.caseData.caseType}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Offense:</span> {log.details.caseData.offenseType}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Severity:</span> {log.details.caseData.severity}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Students:</span> {log.details.caseData.studentCount}</div>
                            </div>
                          ) : log.action === 'case_updated' && log.details.changes ? (
                            <div className="text-sm">
                              <div className="text-gray-600 dark:text-gray-400 mb-1">Updated fields:</div>
                              <div className="space-y-1">
                                {Object.keys(log.details.changes).map(key => (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className="text-gray-500">{key}:</span>
                                    <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">
                                      {String(log.details.changes[key]).substring(0, 50)}
                                      {String(log.details.changes[key]).length > 50 ? '...' : ''}
                          </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : log.action === 'case_deleted' ? (
                            <div className="text-sm text-red-600">
                              Case permanently deleted
                            </div>
                          ) : log.action === 'user_login' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">Role:</span> {log.details.role}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Status:</span> <span className="text-green-600">Successful</span></div>
                            </div>
                          ) : log.action === 'login_failed' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">Reason:</span> <span className="text-red-600">{log.details.reason}</span></div>
                              <div><span className="text-gray-600 dark:text-gray-400">Status:</span> <span className="text-red-600">Failed</span></div>
                            </div>
                          ) : log.action === 'user_registered' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">Name:</span> {log.details.name}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Role:</span> {log.details.role}</div>
                            </div>
                          ) : log.action === 'evidence_uploaded' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">File:</span> {log.details.originalName}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Size:</span> {(log.details.fileSize / 1024).toFixed(1)} KB</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Type:</span> {log.details.mimeType}</div>
                            </div>
                          ) : log.action === 'evidence_deleted' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">File:</span> {log.details.filename}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Uploaded by:</span> {log.details.uploadedBy}</div>
                            </div>
                          ) : log.action === 'student_created' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">Name:</span> {log.details.studentData?.fullName}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">ID:</span> {log.details.studentData?.studentId}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Program:</span> {log.details.studentData?.program}</div>
                            </div>
                          ) : log.action === 'students_imported' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">Imported:</span> {log.details.count} students</div>
                              {log.details.errors && log.details.errors.length > 0 && (
                                <div><span className="text-gray-600 dark:text-gray-400">Errors:</span> {log.details.errors.length}</div>
                              )}
                            </div>
                          ) : (
                            <pre className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded p-2 overflow-x-auto max-h-32">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400">{log.details || 'No additional details'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {log.userAgent && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">User Agent:</span> {log.userAgent.substring(0, 100)}
                        {log.userAgent.length > 100 ? '...' : ''}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-between items-center mt-6">
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-gray-600 dark:text-gray-300">
            Page {page} of {Math.ceil(total / limit) || 1}
          </span>
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
            onClick={() => setPage(p => (p * limit < total ? p + 1 : p))}
            disabled={page * limit >= total}
          >
            Next
          </button>
        </div>
      </section>
  );
}
